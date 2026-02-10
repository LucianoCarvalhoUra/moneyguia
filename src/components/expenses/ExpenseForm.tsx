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
import { CategoryIcon } from '@/components/CategoryIcon';
import { cn } from '@/lib/utils';
import { Expense, PaymentMethod } from '@/types/finance';
import { Switch } from '@/components/ui/switch';
import { Loader2, Trash2, Calendar, CalendarClock, CalendarDays, History } from 'lucide-react';
import { toast } from 'sonner';
import { addMonths, format } from 'date-fns';

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense | null;
  initialData?: Partial<Expense> | null;
}

export default function ExpenseForm({ open, onOpenChange, expense, initialData }: ExpenseFormProps) {
  const { refreshData, categories, subcategories, accounts, cards, removeExpense } = useFinance();
  
  // --- State Management ---
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  
  const [dueDate, setDueDate] = useState('');
  const [amount, setAmount] = useState('');
  
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [cardId, setCardId] = useState('');
  const [accountId, setAccountId] = useState('');
  
  const [isPaid, setIsPaid] = useState(false);
  const [paymentDate, setPaymentDate] = useState(''); // Block 4
  
  const [isRecurring, setIsRecurring] = useState(false);
  const [installments, setInstallments] = useState('1');
  
  const [launchDate, setLaunchDate] = useState(''); // Block 6
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scopeDialogOpen, setScopeDialogOpen] = useState(false);
  const [simpleDeleteDialogOpen, setSimpleDeleteDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'save' | 'delete' | null>(null);
  const [pendingData, setPendingData] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  // --- Derived State ---
  const filteredSubcategories = subcategories.filter(s => s.categoryId === categoryId);
  const isRecurringSeries = expense && (expense.isRecurring || !!(expense as any).recurrence_id);

  // --- Helpers ---
  const getTodayString = () => new Date().toISOString().split('T')[0];

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
      
      if (expense) {
        setDescription(expense.description);
        setCategoryId(expense.categoryId);
        setSubcategoryId(expense.subcategoryId || '');
        setDueDate(String(expense.dueDate).split('T')[0]);
        setAmount(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(expense.amount));
        setPaymentMethod(expense.paymentMethod);
        setCardId(expense.cardId || '');
        setAccountId(expense.accountId || '');
        setIsPaid(expense.isPaid);
        // If paid, paymentDate is relevant. If not, we default to today or expenseDate
        setPaymentDate(expense.isPaid ? String(expense.expenseDate).split('T')[0] : today);
        setIsRecurring(expense.isRecurring);
        setInstallments(expense.installments?.toString() || '1');
        setLaunchDate(String(expense.expenseDate).split('T')[0]);
      } else if (initialData) {
        setDescription(initialData.description || '');
        setCategoryId(initialData.categoryId || '');
        setSubcategoryId(initialData.subcategoryId || '');
        setDueDate(initialData.dueDate ? String(initialData.dueDate).split('T')[0] : today);
        setAmount(initialData.amount ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(initialData.amount) : '');
        setPaymentMethod(initialData.paymentMethod || 'pix');
        setIsPaid(initialData.isPaid || false);
        setPaymentDate(today);
        setIsRecurring(initialData.isRecurring || false);
        setLaunchDate(initialData.expenseDate ? String(initialData.expenseDate).split('T')[0] : today);
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
      setErrors({});
    }
  }, [open, expense, initialData]);

  // --- Handlers ---
  const handlePaidChange = (checked: boolean) => {
    setIsPaid(checked);
    if (checked) {
      setPaymentDate(getTodayString());
    }
  };

  const validate = () => {
    const newErrors: Record<string, boolean> = {};
    const numericAmount = parseFloat(amount.replace(/[^\d,]/g, '').replace(',', '.')) || 0;

    if (!description.trim()) newErrors.description = true;
    if (!categoryId) newErrors.categoryId = true;
    if (!dueDate) newErrors.dueDate = true;
    if (numericAmount <= 0) newErrors.amount = true;
    if (!launchDate) newErrors.launchDate = true;
    if (isPaid && !paymentDate) newErrors.paymentDate = true;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validate()) {
      toast.error('Por favor, preencha os campos obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    try {
      const numericAmount = parseFloat(amount.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
      const user = (await supabase.auth.getUser()).data.user;

      // Logic: If Paid, use paymentDate as expense_date. If not, use launchDate.
      const finalExpenseDate = isPaid ? paymentDate : launchDate;

      const payload = {
        description,
        amount: numericAmount,
        due_date: dueDate, // String YYYY-MM-DD
        expense_date: finalExpenseDate, // String YYYY-MM-DD
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

      console.log('📦 Payload:', payload);

      if (expense) {
        // Edit Mode
        if (isRecurringSeries && isRecurring) {
          setPendingData(payload);
          setActionType('save');
          setScopeDialogOpen(true);
          setIsSubmitting(false);
          return;
        }

        const { error } = await supabase.from('expenses').update(payload).eq('id', expense.id);
        if (error) throw error;
        toast.success('Despesa atualizada!');
      } else {
        // Create Mode
        if (isRecurring && parseInt(installments) > 1) {
          const newRecurrenceId = crypto.randomUUID();
          const newExpenses = [];
          const limit = parseInt(installments);
          const [y, m, d] = dueDate.split('-').map(Number);
          const startDate = new Date(y, m - 1, d, 12);

          for (let i = 0; i < limit; i++) {
            const nextDueDate = addMonths(startDate, i);
            const nextDueDateStr = format(nextDueDate, 'yyyy-MM-dd');
            
            newExpenses.push({
              ...payload,
              due_date: nextDueDateStr,
              expense_date: nextDueDateStr, // Sync expense date for future installments
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
      toast.error(`Erro: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Recurrence & Delete Logic ---
  const handleRecurrenceUpdate = async (scope: 'single' | 'future' | 'past' | 'all') => {
    setIsSubmitting(true);
    try {
      const recurrenceId = expense?.recurrenceId || (expense as any)?.recurrence_id;
      const effectiveId = recurrenceId || expense?.id;
      const data = { ...pendingData };

      if (scope === 'single') {
        await supabase.from('expenses').update(data).eq('id', expense!.id);
      } else if (scope === 'all') {
        await supabase.from('expenses').update(data).or(`recurrence_id.eq.${effectiveId},id.eq.${effectiveId}`);
      } else if (scope === 'future') {
        // Simplified future update logic
        await supabase.from('expenses').update(data)
          .or(`recurrence_id.eq.${effectiveId},id.eq.${effectiveId}`)
          .gte('due_date', expense!.dueDate);
      }
      
      toast.success('Série atualizada!');
      await refreshData();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsSubmitting(false);
      setScopeDialogOpen(false);
    }
  };

  const handleDelete = async (scope?: 'single' | 'future' | 'past' | 'all') => {
    if (!expense) return;
    setIsSubmitting(true);
    try {
      if (scope) {
        const recurrenceId = expense.recurrenceId || (expense as any).recurrence_id;
        let query = supabase.from('expenses').delete();
        
        if (scope === 'all') query = query.eq('recurrence_id', recurrenceId);
        else if (scope === 'future') query = query.eq('recurrence_id', recurrenceId).gte('due_date', expense.dueDate);
        else if (scope === 'single') query = query.eq('id', expense.id);
        
        await query;
      } else {
        await removeExpense(expense.id);
      }
      toast.success('Excluído com sucesso!');
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsSubmitting(false);
      setScopeDialogOpen(false);
      setSimpleDeleteDialogOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] p-0 gap-0 overflow-hidden rounded-sm border-2">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b bg-muted/10 flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-lg font-semibold">
            {expense ? 'Editar Despesa' : 'Nova Despesa'}
          </DialogTitle>
          {expense && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2 rounded-sm"
              onClick={() => isRecurringSeries ? (setActionType('delete'), setScopeDialogOpen(true)) : setSimpleDeleteDialogOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </Button>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Description (Essential) */}
          <div className="space-y-1.5">
            <Label htmlFor="desc">Descrição</Label>
            <Input 
              id="desc" 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              className={cn("rounded-sm", errors.description && "border-red-500")}
              placeholder="Ex: Compras do Mês"
            />
          </div>

          {/* Block 1: Category | Subcategory */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={categoryId} onValueChange={v => { setCategoryId(v); setSubcategoryId(''); }}>
                <SelectTrigger className={cn("rounded-sm", errors.categoryId && "border-red-500")}>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <CategoryIcon iconName={c.icon} className={cn("w-4 h-4", `text-${c.color}`)} />
                        {c.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Subcategoria</Label>
              <Select value={subcategoryId} onValueChange={setSubcategoryId} disabled={!categoryId}>
                <SelectTrigger className="rounded-sm">
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  {filteredSubcategories.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Block 2: Due Date | Amount */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Vencimento</Label>
              <Input 
                type="date" 
                value={dueDate} 
                onChange={e => setDueDate(e.target.value)} 
                className={cn("rounded-sm", errors.dueDate && "border-red-500")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Valor</Label>
              <Input 
                value={amount} 
                onChange={e => setAmount(formatCurrencyInput(e.target.value))} 
                placeholder="R$ 0,00"
                className={cn("rounded-sm text-right font-medium", errors.amount && "border-red-500")}
              />
            </div>
          </div>

          {/* Block 3: Payment Method */}
          <div className="space-y-1.5">
            <Label>Forma de Pagamento</Label>
            <Select value={paymentMethod} onValueChange={v => setPaymentMethod(v as PaymentMethod)}>
              <SelectTrigger className="rounded-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">PIX / Dinheiro</SelectItem>
                <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                <SelectItem value="account">Débito em Conta</SelectItem>
              </SelectContent>
            </Select>
            
            {paymentMethod === 'credit_card' && (
              <Select value={cardId} onValueChange={setCardId}>
                <SelectTrigger className="rounded-sm mt-2 bg-muted/20">
                  <SelectValue placeholder="Selecione o Cartão" />
                </SelectTrigger>
                <SelectContent>
                  {cards.map(c => <SelectItem key={c.id} value={c.id}>{c.brand} •••• {c.lastFourDigits}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            
            {paymentMethod === 'account' && (
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="rounded-sm mt-2 bg-muted/20">
                  <SelectValue placeholder="Selecione a Conta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.bankName}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Block 4: Status | Payment Date */}
          <div className="grid grid-cols-2 gap-4 items-end bg-muted/20 p-3 rounded-sm border">
            <div className="flex flex-col gap-2">
              <Label className="text-xs uppercase text-muted-foreground font-bold">Status</Label>
              <div className="flex items-center gap-3">
                <Switch checked={isPaid} onCheckedChange={handlePaidChange} />
                <span className={cn("text-sm font-medium", isPaid ? "text-green-600" : "text-muted-foreground")}>
                  {isPaid ? 'PAGO' : 'PENDENTE'}
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className={cn("text-xs", !isPaid && "opacity-50")}>Data do Pagamento</Label>
              <Input 
                type="date" 
                value={paymentDate} 
                onChange={e => setPaymentDate(e.target.value)} 
                disabled={!isPaid}
                className={cn("rounded-sm h-9", !isPaid && "opacity-50")}
              />
            </div>
          </div>

          {/* Block 5: Recurrence */}
          <div className="flex items-center justify-between p-3 rounded-sm border bg-muted/20">
            <div className="flex items-center gap-3">
              <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
              <div className="flex flex-col">
                <span className="text-sm font-medium">Recorrência</span>
                <span className="text-xs text-muted-foreground">Repetir mensalmente?</span>
              </div>
            </div>
            {isRecurring && (
              <div className="w-24">
                <Input 
                  type="number" 
                  min="1" 
                  value={installments} 
                  onChange={e => setInstallments(e.target.value)} 
                  className="rounded-sm h-8 text-center"
                  placeholder="Qtd"
                />
              </div>
            )}
          </div>

          {/* Block 6: Launch Date */}
          <div className="space-y-1.5 pt-2">
            <Label className="text-xs text-muted-foreground">Data do Lançamento (Competência)</Label>
            <Input 
              type="date" 
              value={launchDate} 
              onChange={e => setLaunchDate(e.target.value)} 
              className="rounded-sm"
            />
          </div>

          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-sm">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="rounded-sm min-w-[100px]">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      
      {/* Scope Dialog */}
      <AlertDialog open={scopeDialogOpen} onOpenChange={setScopeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alteração em Série</AlertDialogTitle>
            <AlertDialogDescription>Como deseja aplicar esta {actionType === 'save' ? 'alteração' : 'exclusão'}?</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2">
            <Button variant="outline" className="justify-start" onClick={() => actionType === 'save' ? handleRecurrenceUpdate('single') : handleDelete('single')}>
              <Calendar className="w-4 h-4 mr-2" /> Apenas esta
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => actionType === 'save' ? handleRecurrenceUpdate('future') : handleDelete('future')}>
              <CalendarClock className="w-4 h-4 mr-2" /> Esta e futuras
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => actionType === 'save' ? handleRecurrenceUpdate('all') : handleDelete('all')}>
              <CalendarDays className="w-4 h-4 mr-2" /> Todas
            </Button>
          </div>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Simple Delete Dialog */}
      <AlertDialog open={simpleDeleteDialogOpen} onOpenChange={setSimpleDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Despesa</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete()} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}