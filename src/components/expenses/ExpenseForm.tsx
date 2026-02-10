import { useState, useEffect } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CategoryIcon } from '@/components/CategoryIcon';
import { cn } from '@/lib/utils';
import { Expense, PaymentMethod } from '@/types/finance';
import { Loader2, Trash2 } from 'lucide-react';
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

  // --- Helpers ---
  const formatToInput = (dateVal: any) => {
    if (!dateVal) return "";
    // Garante YYYY-MM-DD ignorando timezones
    const str = String(dateVal);
    return str.includes('T') ? str.split('T')[0] : str;
  };

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
      
      if (expense) {
        setDescription(expense.description);
        setCategoryId(expense.categoryId);
        setSubcategoryId(expense.subcategoryId || '');
        setDueDate(formatToInput(expense.dueDate));
        setAmount(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(expense.amount));
        setPaymentMethod(expense.paymentMethod);
        setCardId(expense.cardId || '');
        setAccountId(expense.accountId || '');
        setIsPaid(expense.isPaid);
        setPaymentDate(expense.isPaid ? formatToInput(expense.expenseDate) : today);
        setIsRecurring(expense.isRecurring);
        setInstallments(expense.installments?.toString() || '1');
        setLaunchDate(formatToInput(expense.expenseDate));
      } else if (initialData) {
        // Lógica para duplicação ou dados iniciais
        setDescription(initialData.description || '');
        setCategoryId(initialData.categoryId || '');
        setSubcategoryId(initialData.subcategoryId || '');
        setDueDate(initialData.dueDate ? formatToInput(initialData.dueDate) : today);
        setAmount(initialData.amount ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(initialData.amount) : '');
        setPaymentMethod(initialData.paymentMethod || 'pix');
        setIsPaid(initialData.isPaid || false);
        setPaymentDate(today);
        setIsRecurring(initialData.isRecurring || false);
        setLaunchDate(initialData.expenseDate ? formatToInput(initialData.expenseDate) : today);
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
        // Edição simples (sem lógica complexa de recorrência aqui, conforme pedido para simplificar/ignorar lógica antiga)
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

  const filteredSubcategories = subcategories.filter(s => s.categoryId === categoryId);

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
    </Dialog>
  );
}