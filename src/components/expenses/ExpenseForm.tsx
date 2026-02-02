import { useState, useEffect } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
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
import { Loader2, Calendar as CalendarIcon, Calendar, CalendarClock, CalendarDays, History } from 'lucide-react';
import { toast } from 'sonner';
import { format, addMonths } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense | null;
}

export default function ExpenseForm({ open, onOpenChange, expense }: ExpenseFormProps) {
  const { addExpense, updateExpense, removeExpense, categories, subcategories, accounts, cards, refreshData } = useFinance();
  
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [accountId, setAccountId] = useState('');
  const [cardId, setCardId] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [installments, setInstallments] = useState('1');
  const [isPaid, setIsPaid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recurrenceDialogOpen, setRecurrenceDialogOpen] = useState(false);
  const [pendingData, setPendingData] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const filteredSubcategories = subcategories.filter(s => s.categoryId === categoryId);
  const selectedCategory = categories.find(c => c.id === categoryId);

  useEffect(() => {
    if (expense) {
      setDescription(expense.description);
      setAmount(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(expense.amount));
      setDate(format(new Date(expense.dueDate), 'yyyy-MM-dd'));
      setCategoryId(expense.categoryId);
      setSubcategoryId(expense.subcategoryId || '');
      setPaymentMethod(expense.paymentMethod);
      setAccountId(expense.accountId || '');
      setCardId(expense.cardId || '');
      setIsRecurring(expense.isRecurring);
      setInstallments(expense.installments?.toString() || '1');
      setIsPaid(expense.isPaid ?? false);
      setErrors({});
    } else {
      resetForm();
    }
  }, [expense, open]);

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setCategoryId('');
    setSubcategoryId('');
    setPaymentMethod('pix');
    setAccountId('');
    setCardId('');
    setIsRecurring(false);
    setInstallments('1');
    setIsPaid(false);
    setErrors({});
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
  
  const validate = () => {
    const newErrors: Record<string, boolean> = {};
    const numericAmount = parseFloat(amount.replace(/[^\d,]/g, '').replace(',', '.')) || 0;

    if (!description.trim()) newErrors.description = true;
    if (numericAmount <= 0) newErrors.amount = true;
    if (!date) newErrors.date = true;
    if (!categoryId) newErrors.categoryId = true;
    if (filteredSubcategories.length > 0 && !subcategoryId) newErrors.subcategoryId = true;

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      if (newErrors.description) toast.error('O campo Descrição é obrigatório.');
      if (newErrors.amount) toast.error('O campo Valor é obrigatório e deve ser maior que zero.');
      if (newErrors.date) toast.error('O campo Data é obrigatório.');
      if (newErrors.categoryId) toast.error('O campo Categoria é obrigatório.');
      if (newErrors.subcategoryId) toast.error('O campo Subcategoria é obrigatório para esta categoria.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const numericAmount = parseFloat(amount.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
      
      const expenseData = {
        description,
        amount: numericAmount,
        expenseDate: new Date(date),
        dueDate: new Date(date),
        categoryId,
        subcategoryId: subcategoryId || undefined,
        paymentMethod,
        accountId: paymentMethod === 'account' ? accountId : undefined,
        cardId: paymentMethod === 'credit_card' ? cardId : undefined,
        isRecurring,
        installments: isRecurring ? parseInt(installments) : undefined,
        isPaid,
      };

      const isRecurringSeries = expense && (expense.isRecurring || expense.recurrenceId || (expense as any).recurrence_id);

      if (expense) { // Editing an existing expense
        if (isRecurringSeries) {
          setPendingData(expenseData);
          setRecurrenceDialogOpen(true);
          setIsSubmitting(false);
          return;
        }
        
        // From single to recurring
        if (!isRecurringSeries && isRecurring) {
          await removeExpense(expense.id);
          
          const newRecurrenceId = crypto.randomUUID();
          await addExpense({ ...expenseData, recurrenceId: newRecurrenceId });
          
          const limit = installments ? parseInt(installments) - 1 : 11;
          for (let i = 1; i <= limit; i++) {
            const nextDate = addMonths(new Date(date), i);
            await addExpense({ ...expenseData, dueDate: nextDate, expenseDate: nextDate, recurrenceId: newRecurrenceId });
          }

          toast.success('Despesa transformada em recorrente!');
        } else {
          await updateExpense(expense.id, expenseData);
          toast.success('Despesa atualizada!');
        }
      } else { // Creating a new expense
        if (isRecurring) {
          const newRecurrenceId = crypto.randomUUID();
          await addExpense({ ...expenseData, recurrenceId: newRecurrenceId });
          
          const limit = installments ? parseInt(installments) - 1 : 11;
          for (let i = 1; i <= limit; i++) {
            const nextDate = addMonths(new Date(date), i);
            await addExpense({ ...expenseData, dueDate: nextDate, expenseDate: nextDate, recurrenceId: newRecurrenceId });
          }
          toast.success('Despesa recorrente criada!');
        } else {
          await addExpense(expenseData);
          toast.success('Despesa criada!');
        }
      }
      
      onOpenChange(false);
    } catch (error: any) {
       console.error('Erro detalhado do Supabase:', {
        message: error.message,
        details: error.details,
        code: error.code,
      });
      toast.error(`Erro ao salvar: ${error.details || error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecurrenceUpdate = async (scope: 'single' | 'future' | 'past' | 'all') => {
    setIsSubmitting(true);
    try {
      const recurrenceId = expense?.recurrenceId || (expense as any)?.recurrence_id;
      if (!recurrenceId && scope !== 'single') {
        toast.info("Esta não é uma despesa recorrente. Apenas este registro será atualizado.");
        await handleRecurrenceUpdate('single'); 
        return;
      }
      
      console.log('Filtro utilizado:', recurrenceId, 'Escopo:', scope);

      const dados = {
        description: pendingData.description,
        amount: pendingData.amount,
        category_id: pendingData.categoryId,
        subcategory_id: pendingData.subcategoryId || null,
        payment_method: pendingData.paymentMethod,
        account_id: pendingData.accountId || null,
        card_id: pendingData.cardId || null,
        is_recurring: pendingData.isRecurring,
        installments: pendingData.installments,
      };

      let successMessage = '';

      if (scope === 'single') {
        const singleData = { ...dados, due_date: pendingData.dueDate, expense_date: pendingData.expenseDate, is_paid: pendingData.isPaid };
        const { error } = await supabase.from('expenses').update(singleData).eq('id', expense!.id);
        if (error) throw error;
        successMessage = 'Despesa atualizada com sucesso!';

      } else if (scope === 'all') {
        const { error } = await supabase.from('expenses').update(dados).eq('recurrence_id', recurrenceId);
        if (error) throw error;
        successMessage = 'Todas as despesas da série foram atualizadas!';

      } else if (scope === 'past') {
        const { error } = await supabase.from('expenses').update(dados)
          .eq('recurrence_id', recurrenceId)
          .lte('due_date', format(new Date(pendingData.dueDate), 'yyyy-MM-dd'));
        if (error) throw error;
        successMessage = 'Despesa atual e passadas atualizadas!';
      
      } else if (scope === 'future') {
        // 1. Update
        const { error: updateError } = await supabase.from('expenses').update(dados)
          .eq('recurrence_id', recurrenceId)
          .gte('due_date', format(new Date(pendingData.dueDate), 'yyyy-MM-dd'));
        if (updateError) throw updateError;

        // 2. Insert if installments increased
        const desiredInstallments = pendingData.installments || 0;
        if (pendingData.isRecurring && desiredInstallments > 1) {
            const { count, error: countError } = await supabase.from('expenses')
                .select('*', { count: 'exact', head: true })
                .eq('recurrence_id', recurrenceId);

            if (countError) throw countError;

            if (count !== null && desiredInstallments > count) {
                const { data: lastExpense, error: lastExpenseError } = await supabase.from('expenses')
                    .select('due_date').eq('recurrence_id', recurrenceId).order('due_date', { ascending: false }).limit(1).single();
                
                if (lastExpenseError) throw lastExpenseError;

                const lastDate = new Date(lastExpense.due_date);
                const newExpenses = [];
                for (let i = 1; i <= desiredInstallments - count; i++) {
                    const nextDate = addMonths(lastDate, i);
                    newExpenses.push({
                      ...dados,
                      description: pendingData.description,
                      amount: pendingData.amount,
                      category_id: pendingData.categoryId,
                      subcategory_id: pendingData.subcategoryId || null,
                      payment_method: pendingData.paymentMethod,
                      account_id: pendingData.accountId || null,
                      card_id: pendingData.cardId || null,
                      is_recurring: pendingData.isRecurring,
                      installments: pendingData.installments,
                      recurrence_id: recurrenceId,
                      due_date: format(nextDate, 'yyyy-MM-dd'),
                      expense_date: format(nextDate, 'yyyy-MM-dd'),
                      is_paid: false,
                      user_id: expense?.userId
                    });
                }
                const { error: insertError } = await supabase.from('expenses').insert(newExpenses);
                if (insertError) throw insertError;
            }
        }
        successMessage = 'Despesas futuras atualizadas e/ou criadas!';
      }
      
      toast.success(successMessage);
      await refreshData();
      onOpenChange(false);

    } catch (error: any) {
      console.error('Erro detalhado do Supabase:', {
        message: error.message,
        details: error.details,
        code: error.code,
      });
      toast.error(`Erro ao atualizar: ${error.details || error.message}`);
    } finally {
      setIsSubmitting(false);
      setRecurrenceDialogOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{expense ? 'Editar Despesa' : 'Nova Despesa'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category">Categoria <span className="text-red-500">*</span></Label>
            <Select value={categoryId} onValueChange={(value) => { setCategoryId(value); setSubcategoryId(''); setErrors(prev => ({...prev, categoryId: false, subcategoryId: false})); }}>
              <SelectTrigger id="category" className={cn(errors.categoryId && "border-red-500")}>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <span className="flex items-center gap-2">
                      <div className={cn("w-6 h-6 rounded-full flex items-center justify-center", `bg-${cat.color}/10`)}>
                        <CategoryIcon iconName={cat.icon} className={cn("w-3 h-3", `text-${cat.color}`)} />
                      </div>
                      {cat.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredSubcategories.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="subcategory">Subcategoria <span className="text-red-500">*</span></Label>
              <Select value={subcategoryId} onValueChange={(value) => { setSubcategoryId(value); setErrors(prev => ({...prev, subcategoryId: false})); }}>
                <SelectTrigger id="subcategory" className={cn(errors.subcategoryId && "border-red-500")}>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {filteredSubcategories.map((sub) => (
                    <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor <span className="text-red-500">*</span></Label>
              <Input 
                id="amount"
                placeholder="R$ 0,00" 
                value={amount} 
                onChange={(e) => setAmount(formatCurrencyInput(e.target.value))}
                className={cn("text-right font-medium", errors.amount && "border-red-500", selectedCategory?.color ? `focus-visible:ring-${selectedCategory.color}` : "")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Data <span className="text-red-500">*</span></Label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="date"
                  type="date" 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)} 
                  className={cn("pl-9", errors.date && "border-red-500", selectedCategory?.color ? `focus-visible:ring-${selectedCategory.color}` : "")}
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Descrição <span className="text-red-500">*</span></Label>
            <Input id="description" placeholder="Ex: Supermercado" value={description} onChange={(e) => setDescription(e.target.value)} className={cn(errors.description && "border-red-500")} />
          </div>

          <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX / Dinheiro</SelectItem>
                  <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                  <SelectItem value="account">Débito em Conta</SelectItem>
                </SelectContent>
              </Select>
          </div>

          {paymentMethod === 'credit_card' && (
              <div className="space-y-2">
                <Label>Cartão</Label>
                <Select value={cardId} onValueChange={setCardId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o cartão" /></SelectTrigger>
                  <SelectContent>
                    {cards.map(card => (
                      <SelectItem key={card.id} value={card.id}>{card.brand} •••• {card.lastFourDigits}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
          )}

          {paymentMethod === 'account' && (
              <div className="space-y-2">
                <Label>Conta</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.bankName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border rounded-md p-4 bg-muted/20">
            <div className="flex flex-col gap-2">
              <Label htmlFor="status-switch" className="text-sm font-medium">Status do Pagamento</Label>
              <div className="flex items-center justify-between bg-background p-2 rounded-md border">
                <span className="text-sm text-muted-foreground">{isPaid ? 'Pago' : 'Pendente'}</span>
                <Switch id="status-switch" checked={isPaid} onCheckedChange={setIsPaid} />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="recurring" className="text-sm font-medium">Recorrência</Label>
              <div className="flex items-center justify-between bg-background p-2 rounded-md border">
                <span className="text-sm text-muted-foreground">{isRecurring ? 'Sim' : 'Não'}</span>
                <Switch id="recurring" checked={isRecurring} onCheckedChange={setIsRecurring} />
              </div>
            </div>

            {isRecurring && (
              <div className="sm:col-span-2 space-y-2 animate-in fade-in slide-in-from-top-2">
                <Label>Número de Parcelas (1 = Fixo Mensal)</Label>
                <Input type="number" min="1" value={installments} onChange={(e) => setInstallments(e.target.value)} />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      <AlertDialog open={recurrenceDialogOpen} onOpenChange={setRecurrenceDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alteração em Recorrência</AlertDialogTitle>
            <AlertDialogDescription>
              Esta despesa é recorrente. Como deseja aplicar as alterações?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2 py-4">
            <Button variant="outline" className="justify-start h-auto py-3 px-4" onClick={() => handleRecurrenceUpdate('single')}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-full">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Apenas esta</p>
                  <p className="text-xs text-muted-foreground">Altera somente este registro</p>
                </div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3 px-4" onClick={() => handleRecurrenceUpdate('future')}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-full">
                  <CalendarClock className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Esta e futuras</p>
                  <p className="text-xs text-muted-foreground">Deste vencimento em diante</p>
                </div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3 px-4" onClick={() => handleRecurrenceUpdate('past')}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-full">
                  <History className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Esta e Passadas</p>
                  <p className="text-xs text-muted-foreground">Do vencimento atual para trás</p>
                </div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3 px-4" onClick={() => handleRecurrenceUpdate('all')}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-full">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Todas</p>
                  <p className="text-xs text-muted-foreground">Todo o histórico da série</p>
                </div>
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