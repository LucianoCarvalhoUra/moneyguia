import { useState, useEffect } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CategoryIcon } from '@/components/CategoryIcon';
import { cn } from '@/lib/utils';
import { Expense, PaymentMethod } from '@/types/finance';
import { Loader2, Trash2, Calendar, CalendarClock, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { addMonths, format } from 'date-fns';

// ExpenseForm component

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense | null;
  initialData?: Partial<Expense> | null;
}

export default function ExpenseForm({ open, onOpenChange, expense, initialData }: ExpenseFormProps) {
  const { refreshData, categories, subcategories, accounts, cards, removeExpense } = useFinance();
  // --- State ---
  
  // --- State ---
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [cardId, setCardId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [paymentDate, setPaymentDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [installments, setInstallments] = useState('1');
  const [launchDate, setLaunchDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scopeDialogOpen, setScopeDialogOpen] = useState(false);
  const [pendingData, setPendingData] = useState<any>(null);

  // --- Helpers ---
  const formatToInput = (dateVal: any) => {
    if (!dateVal) return "";
    if (dateVal instanceof Date) return format(dateVal, 'yyyy-MM-dd');
    // Garante YYYY-MM-DD ignorando timezones
    const str = String(dateVal);
    return str.includes('T') ? str.split('T')[0] : str;
  };

  const safeSubcategories = subcategories || [];

  const getTodayString = () => {
    const now = new Date();
    return format(now, 'yyyy-MM-dd');
  };

  const formatCurrencyInput = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    if (!numericValue) return '';
    const floatValue = Number(numericValue) / 100;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(floatValue);
  };

  // --- Initialization ---
  useEffect(() => {
    if (open) {
      const today = getTodayString();
      const dataToLoad = expense || initialData;
      console.log('INITIAL_DATA_RECONHECIDO:', dataToLoad);
      
      if (dataToLoad) {
        setDescription(dataToLoad.description || '');
        
        // Mapeamento robusto para IDs (camelCase ou snake_case)
        const catId = dataToLoad.categoryId || (dataToLoad as any).category_id || '';
        setCategoryId(catId);
        setSubcategoryId(dataToLoad.subcategoryId || (dataToLoad as any).subcategory_id || '');
        
        setDueDate(dataToLoad.dueDate ? formatToInput(dataToLoad.dueDate) : today);
        setAmount(dataToLoad.amount ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dataToLoad.amount) : '');
        setPaymentMethod(dataToLoad.paymentMethod || 'pix');
        setCardId(dataToLoad.cardId || '');
        setAccountId(dataToLoad.accountId || '');
        setIsPaid(dataToLoad.isPaid || false);
        setPaymentDate((dataToLoad.isPaid && dataToLoad.expenseDate) ? formatToInput(dataToLoad.expenseDate) : today);
        setIsRecurring(dataToLoad.isRecurring || false);
        setInstallments(dataToLoad.installments?.toString() || '1');
        setLaunchDate(dataToLoad.expenseDate ? formatToInput(dataToLoad.expenseDate) : today);
      } else {
        // Reset
        setDescription('');
        setCategoryId('');
        setSubcategoryId('');
        setDueDate(today);
        setAmount('');
        setPaymentMethod('pix');
        setCardId('');
        setAccountId('');
        setIsPaid(false);
        setPaymentDate(today);
        setIsRecurring(false);
        setInstallments('1');
        setLaunchDate(today);
      }
    }
  }, [open, expense, initialData]);

  // --- Handlers ---
  const handlePaidChange = (checked: boolean) => {
    setIsPaid(checked);
    if (checked) {
      setPaymentDate(getTodayString());
    }
  };

  const handleDelete = async () => {
    if (!expense) return;
    if (!confirm('Tem certeza que deseja excluir esta despesa?')) return;
    
    setIsSubmitting(true);
    try {
      await removeExpense(expense.id);
      toast.success('Despesa excluída!');
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Erro ao excluir: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBaseDescription = (desc: string): string => {
    // Remove " (X/Y)" suffix to get the base description for grouping
    return desc.replace(/\s*\(\d+\/\d+\)\s*$/, '').trim();
  };

  const ensureRecurrenceId = async (): Promise<string | null> => {
    let recurrenceId = expense?.recurrenceId || (expense as any)?.recurrence_id;
    
    if (recurrenceId) return recurrenceId;
    
    // No recurrence_id exists - generate one and assign to all related expenses
    if (!expense) return null;
    
    const baseDesc = getBaseDescription(expense.description);
    const newRecurrenceId = crypto.randomUUID();
    
    console.log('[RecurrenceId Fix] Base description:', baseDesc, '| New ID:', newRecurrenceId);
    
    // Find all expenses with matching base description pattern, same user, and is_recurring
    const { data: relatedExpenses, error: fetchError } = await supabase
      .from('expenses')
      .select('id, description')
      .eq('user_id', expense.userId)
      .eq('is_recurring', true)
      .is('recurrence_id', null);
    
    if (fetchError) {
      console.error('[RecurrenceId Fix] Error fetching related:', fetchError);
      return null;
    }
    
    // Filter by matching base description
    const matchingIds = (relatedExpenses || [])
      .filter(e => getBaseDescription(e.description) === baseDesc)
      .map(e => e.id);
    
    console.log('[RecurrenceId Fix] Found', matchingIds.length, 'matching expenses');
    
    if (matchingIds.length > 0) {
      const { error: updateError } = await supabase
        .from('expenses')
        .update({ recurrence_id: newRecurrenceId })
        .in('id', matchingIds);
      
      if (updateError) {
        console.error('[RecurrenceId Fix] Error assigning recurrence_id:', updateError);
        return null;
      }
    }
    
    return newRecurrenceId;
  };

  const handleRecurrenceUpdate = async (scope: 'single' | 'future' | 'all') => {
    if (!expense || !pendingData) return;
    
    setIsSubmitting(true);
    try {
      // 1. Atualiza a despesa atual (sempre) para garantir que datas e dados estejam corretos
      const { error: singleError } = await supabase.from('expenses').update(pendingData).eq('id', expense.id);
      if (singleError) throw singleError;

      if (scope !== 'single') {
        // Ensure we have a recurrence_id (fix legacy data if needed)
        const recurrenceId = await ensureRecurrenceId();
        
        if (!recurrenceId) {
          toast.error("Não foi possível identificar a série de recorrência.");
          setIsSubmitting(false);
          return;
        }
        
        console.log('[BatchUpdate] Scope:', scope, '| recurrence_id:', recurrenceId);
        
        // Remove date fields from batch to preserve individual dates
        const { due_date, expense_date, ...batchData } = pendingData;
        let query = supabase.from('expenses').update(batchData).eq('recurrence_id', recurrenceId).neq('id', expense.id);

        if (scope === 'future') {
          // Data de Âncora Correta: Usa a nova data selecionada no formulário
          const dueDate = pendingData.due_date;
          console.log('[BatchUpdate] Anchor date for future:', dueDate);
          query = query.gte('due_date', dueDate);
        }

        const { error } = await query;
        if (error) throw error;
      }

      toast.success('Despesas atualizadas com sucesso!');
      
      // Pequeno delay para evitar erro de conexão interrompida
      await new Promise(resolve => setTimeout(resolve, 300));
      await refreshData();
      onOpenChange(false);
    } catch (error: any) {
      console.error('[BatchUpdate] Error:', error);
      toast.error('Erro ao atualizar: ' + error.message);
    } finally {
      setIsSubmitting(false);
      setScopeDialogOpen(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const numericAmount = parseFloat(amount.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
    if (!description || !categoryId || !dueDate || numericAmount <= 0) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      
      // Regra de Ouro: Datas como strings puras
      const finalExpenseDate = isPaid ? paymentDate : launchDate;

      const payload = {
        description,
        amount: numericAmount,
        due_date: dueDate,
        expense_date: finalExpenseDate,
        category_id: categoryId,
        subcategory_id: subcategoryId || null,
        payment_method: paymentMethod,
        card_id: paymentMethod === 'credit_card' && cardId ? cardId : null,
        account_id: paymentMethod === 'account' && accountId ? accountId : null,
        is_paid: isPaid,
        is_recurring: isRecurring,
        installments: isRecurring ? parseInt(installments) : null,
        user_id: user?.id
      };

      if (expense) {
        // If recurring, always show scope dialog (ensureRecurrenceId handles legacy data)
        if (expense.isRecurring) {
          setPendingData(payload);
          setScopeDialogOpen(true);
          setIsSubmitting(false);
          return;
        }

        const { error } = await supabase.from('expenses').update(payload).eq('id', expense.id);
        if (error) throw error;
        toast.success('Despesa atualizada!');
      } else {
        // Criação
        if (isRecurring && parseInt(installments) > 1) {
           const newRecurrenceId = crypto.randomUUID();
           const newExpenses = [];
           const limit = parseInt(installments);
           const [y, m, d] = dueDate.split('-').map(Number);
           // Cria data base para cálculo seguro de meses
           const startDate = new Date(y, m - 1, d, 12);

           for (let i = 0; i < limit; i++) {
             const nextDueDate = addMonths(startDate, i);
             const nextDueDateStr = format(nextDueDate, 'yyyy-MM-dd');
             
             newExpenses.push({
               ...payload,
               due_date: nextDueDateStr,
               expense_date: nextDueDateStr,
               is_paid: i === 0 ? isPaid : false,
               recurrence_id: newRecurrenceId,
             });
           }
           const { error } = await supabase.from('expenses').insert(newExpenses);
           if (error) throw error;
           toast.success(`${limit} despesas criadas!`);
        } else {
           const { error } = await supabase.from('expenses').insert([payload]);
           if (error) throw error;
           toast.success('Despesa salva!');
        }
      }

      await refreshData();
      onOpenChange(false);
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSubcategories = safeSubcategories.filter(s => s.categoryId === categoryId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden rounded-sm border-2">
        <DialogHeader className="px-6 py-3 border-b bg-muted/10 flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-lg font-semibold">
            {expense ? 'Editar Despesa' : 'Nova Despesa'}
          </DialogTitle>
          {expense && (
            <Button 
              type="button" 
              variant="ghost" 
              size="sm"
              className="text-destructive hover:bg-destructive/10 h-8 px-2 rounded-sm" 
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Excluir
            </Button>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-5 grid grid-cols-2 gap-x-4 gap-y-4">
          
          {/* Descrição (Full Width) */}
          <div className="col-span-2 space-y-1">
            <Label>Descrição</Label>
            <Input 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              className="h-9 rounded-sm" 
              placeholder="Ex: Supermercado"
            />
          </div>

          {/* Linha 1: Categoria | Subcategoria */}
          <div className="space-y-1">
            <Label>Categoria</Label>
            <Select value={categoryId} onValueChange={v => { setCategoryId(v); setSubcategoryId(''); }}>
              <SelectTrigger className="h-9 rounded-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    <div className="flex items-center gap-2"><CategoryIcon iconName={c.icon} className={`w-4 h-4 text-${c.color}`} /> {c.name}</div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Subcategoria</Label>
            <Select value={subcategoryId} onValueChange={setSubcategoryId} disabled={!categoryId}>
              <SelectTrigger className="h-9 rounded-sm"><SelectValue placeholder="Opcional" /></SelectTrigger>
              <SelectContent>
                {filteredSubcategories.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Linha 2: Vencimento | Valor */}
          <div className="space-y-1">
            <Label>Vencimento</Label>
            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="h-9 rounded-sm" />
          </div>
          <div className="space-y-1">
            <Label>Valor</Label>
            <Input value={amount} onChange={e => setAmount(formatCurrencyInput(e.target.value))} className="h-9 rounded-sm text-right font-medium" placeholder="R$ 0,00" />
          </div>

          {/* Linha 3: Forma de Pagamento */}
          <div className="col-span-2 space-y-1">
            <Label>Forma de Pagamento</Label>
            <div className="grid grid-cols-2 gap-4">
              <Select value={paymentMethod} onValueChange={v => setPaymentMethod(v as PaymentMethod)}>
                <SelectTrigger className="h-9 rounded-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX / Dinheiro</SelectItem>
                  <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                  <SelectItem value="account">Débito em Conta</SelectItem>
                </SelectContent>
              </Select>
              {paymentMethod === 'credit_card' && (
                <Select value={cardId} onValueChange={setCardId}>
                  <SelectTrigger className="h-9 rounded-sm bg-muted/20"><SelectValue placeholder="Selecione o Cartão" /></SelectTrigger>
                  <SelectContent>{cards.map(c => <SelectItem key={c.id} value={c.id}>{c.brand} •••• {c.lastFourDigits}</SelectItem>)}</SelectContent>
                </Select>
              )}
              {paymentMethod === 'account' && (
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger className="h-9 rounded-sm bg-muted/20"><SelectValue placeholder="Selecione a Conta" /></SelectTrigger>
                  <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.bankName}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Linha 4: Status Pago | Data Pagamento */}
          <div className="space-y-1">
            <Label>Status</Label>
            <div className="flex items-center gap-2 border rounded-sm px-2 h-9 bg-muted/10">
              <Switch checked={isPaid} onCheckedChange={handlePaidChange} />
              <span className={cn("text-sm font-medium", isPaid ? "text-green-600" : "text-muted-foreground")}>{isPaid ? 'PAGO' : 'PENDENTE'}</span>
            </div>
          </div>
          <div className="space-y-1">
            <Label className={cn(!isPaid && "opacity-50")}>Data Pagamento</Label>
            <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} disabled={!isPaid} className="h-9 rounded-sm" />
          </div>

          {/* Linha 5: Recorrência | Data Lançamento */}
          <div className="space-y-1">
            <Label>Recorrência</Label>
            <div className="flex items-center gap-2 border rounded-sm px-2 h-9 bg-muted/10">
              <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
              <span className="text-sm text-muted-foreground flex-1">Repetir?</span>
              {isRecurring && <Input type="number" min="1" value={installments} onChange={e => setInstallments(e.target.value)} className="h-7 w-14 text-center p-0 rounded-sm" />}
            </div>
          </div>
          <div className="space-y-1">
            <Label>Data Lançamento</Label>
            <Input type="date" value={launchDate} onChange={e => setLaunchDate(e.target.value)} className="h-9 rounded-sm" />
          </div>

          <DialogFooter className="col-span-2 pt-4 border-t mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-sm h-9">Cancelar</Button>
            <Button type="submit" disabled={isSubmitting} className="rounded-sm min-w-[100px] h-9">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <AlertDialog open={scopeDialogOpen} onOpenChange={setScopeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Atualizar Recorrência</AlertDialogTitle>
            <AlertDialogDescription>
              Esta é uma despesa recorrente. Como deseja aplicar as alterações?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2 py-4">
            <Button variant="outline" className="justify-start h-auto py-3 px-4" onClick={() => handleRecurrenceUpdate('single')}>
              <Calendar className="w-4 h-4 mr-3 text-muted-foreground" />
              <div className="text-left">
                <div className="font-medium">Apenas esta</div>
                <div className="text-xs text-muted-foreground">Alterar somente a despesa atual</div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3 px-4" onClick={() => handleRecurrenceUpdate('future')}>
              <CalendarClock className="w-4 h-4 mr-3 text-muted-foreground" />
              <div className="text-left">
                <div className="font-medium">Esta e próximas</div>
                <div className="text-xs text-muted-foreground">Alterar desta data em diante</div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3 px-4" onClick={() => handleRecurrenceUpdate('all')}>
              <CalendarDays className="w-4 h-4 mr-3 text-muted-foreground" />
              <div className="text-left">
                <div className="font-medium">Todas</div>
                <div className="text-xs text-muted-foreground">Alterar toda a série</div>
              </div>
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}