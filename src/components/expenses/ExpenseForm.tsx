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
import { Loader2, Calendar as CalendarIcon, Calendar, CalendarClock, CalendarDays, History, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, addMonths, setDate, getDate } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense | null;
  initialData?: Partial<Expense> | null;
}

export default function ExpenseForm({ open, onOpenChange, expense, initialData }: ExpenseFormProps) {
  const { addExpense, updateExpense, removeExpense, categories, subcategories, accounts, cards, refreshData } = useFinance();
  
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dueDate, setDueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [accountId, setAccountId] = useState('');
  const [cardId, setCardId] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [installments, setInstallments] = useState('1');
  const [isPaid, setIsPaid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scopeDialogOpen, setScopeDialogOpen] = useState(false);
  const [simpleDeleteDialogOpen, setSimpleDeleteDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'save' | 'delete' | null>(null);
  const [pendingData, setPendingData] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const filteredSubcategories = subcategories.filter(s => s.categoryId === categoryId);
  const selectedCategory = categories.find(c => c.id === categoryId);

  useEffect(() => {
    if (expense) {
      setDescription(expense.description);
      setAmount(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(expense.amount));
      setExpenseDate(format(new Date(expense.expenseDate), 'yyyy-MM-dd'));
      setDueDate(format(new Date(expense.dueDate), 'yyyy-MM-dd'));
      setCategoryId(expense.categoryId);
      setSubcategoryId(expense.subcategoryId || '');
      setPaymentMethod(expense.paymentMethod);
      setAccountId(expense.accountId || '');
      setCardId(expense.cardId || '');
      setIsRecurring(expense.isRecurring);
      setInstallments(expense.installments?.toString() || '1');
      setIsPaid(expense.isPaid ?? false);
      setErrors({});
    } else if (initialData) {
      setDescription(initialData.description || '');
      setAmount(initialData.amount ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(initialData.amount) : '');
      setExpenseDate(initialData.expenseDate ? format(new Date(initialData.expenseDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
      setDueDate(initialData.dueDate ? format(new Date(initialData.dueDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
      setCategoryId(initialData.categoryId || '');
      setSubcategoryId(initialData.subcategoryId || '');
      setPaymentMethod(initialData.paymentMethod || 'pix');
      setAccountId(initialData.accountId || '');
      setCardId(initialData.cardId || '');
      setIsRecurring(initialData.isRecurring || false);
      setInstallments(initialData.installments?.toString() || '1');
      setIsPaid(initialData.isPaid ?? false);
      setErrors({});
    } else {
      resetForm();
    }
  }, [expense, initialData, open]);

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setExpenseDate(format(new Date(), 'yyyy-MM-dd'));
    setDueDate(format(new Date(), 'yyyy-MM-dd'));
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
    if (!expenseDate) newErrors.expenseDate = true;
    if (!dueDate) newErrors.dueDate = true;
    if (!categoryId) newErrors.categoryId = true;
    if (filteredSubcategories.length > 0 && !subcategoryId) newErrors.subcategoryId = true;

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      if (newErrors.description) toast.error('O campo Descrição é obrigatório.');
      if (newErrors.amount) toast.error('O campo Valor é obrigatório e deve ser maior que zero.');
      if (newErrors.expenseDate) toast.error('A Data de Lançamento é obrigatória.');
      if (newErrors.dueDate) toast.error('A Data de Vencimento é obrigatória.');
      if (newErrors.categoryId) toast.error('O campo Categoria é obrigatório.');
      if (newErrors.subcategoryId) toast.error('O campo Subcategoria é obrigatório para esta categoria.');
      return false;
    }
    return true;
  };


  // Verifica se a despesa faz parte de uma série recorrente (tem recurrence_id)
  const isRecurringSeries = expense && !!expense.recurrenceId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const numericAmount = parseFloat(amount.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
      
      const expenseData = {
        description,
        amount: numericAmount,
        expenseDate: new Date(expenseDate),
        dueDate: new Date(dueDate),
        categoryId,
        subcategoryId: subcategoryId || undefined,
        paymentMethod,
        accountId: paymentMethod === 'account' ? accountId : undefined,
        cardId: paymentMethod === 'credit_card' ? cardId : undefined,
        isRecurring,
        installments: isRecurring ? parseInt(installments) : undefined,
        isPaid,
      };

      console.log('Iniciando salvamento...', expenseData);
      console.log('DEBUG - expense:', expense?.id, 'recurrenceId:', expense?.recurrenceId, 'isRecurringSeries:', isRecurringSeries);

      if (expense) { // Editing an existing expense
        // Se a despesa pertence a uma série recorrente (tem recurrence_id), mostrar diálogo de escopo
        if (isRecurringSeries) {
          console.log('DEBUG - Abrindo diálogo de escopo para série recorrente');
          setPendingData(expenseData);
          setActionType('save');
          setScopeDialogOpen(true);
          setIsSubmitting(false);
          return;
        }

        console.log('DEBUG - Atualizando despesa avulsa diretamente');
        // Despesa avulsa (não faz parte de série) - atualizar diretamente
        const { error: updateError } = await supabase.from('expenses').update({
          description: expenseData.description,
          amount: expenseData.amount,
          due_date: format(expenseData.dueDate, 'yyyy-MM-dd'),
          expense_date: format(expenseData.expenseDate, 'yyyy-MM-dd'),
          category_id: expenseData.categoryId,
          subcategory_id: expenseData.subcategoryId || null,
          payment_method: expenseData.paymentMethod,
          account_id: expenseData.accountId || null,
          card_id: expenseData.cardId || null,
          is_recurring: expenseData.isRecurring,
          installments: expenseData.installments || null,
          is_paid: expenseData.isPaid
        }).eq('id', expense.id);

        if (updateError) throw updateError;
        toast.success('Despesa atualizada!');

      } else { // Creating a new expense
        const { data: { user } } = await supabase.auth.getUser();
        
        // 2. Cloning/Creation logic
        if (isRecurring && parseInt(installments) > 1) {
          const newRecurrenceId = crypto.randomUUID(); // New parent_id for the new group
          const newExpenses = [];
          const limit = parseInt(installments);
          const startDate = new Date(dueDate);

          for (let i = 0; i < limit; i++) {
            const nextDueDate = addMonths(startDate, i);
            newExpenses.push({
              description, amount: numericAmount,
              due_date: format(nextDueDate, 'yyyy-MM-dd'),
              expense_date: format(nextDueDate, 'yyyy-MM-dd'), // Sync expense date
              category_id: categoryId, subcategory_id: subcategoryId || null,
              payment_method: paymentMethod, account_id: accountId || null, card_id: cardId || null,
              is_recurring: true, installments: limit, is_paid: false, // New installments are not paid
              recurrence_id: newRecurrenceId,
              user_id: user?.id,
            });
          }
          const { error } = await supabase.from('expenses').insert(newExpenses);
          if (error) throw error;
          toast.success(`${limit} despesas recorrentes criadas!`);
        } else {
          // Insert single expense
          const { error } = await supabase.from('expenses').insert([{
            description: expenseData.description,
            amount: expenseData.amount,
            due_date: format(expenseData.dueDate, 'yyyy-MM-dd'),
            expense_date: format(expenseData.expenseDate, 'yyyy-MM-dd'),
            category_id: expenseData.categoryId,
            subcategory_id: expenseData.subcategoryId,
            payment_method: expenseData.paymentMethod,
            account_id: expenseData.accountId,
            card_id: expenseData.cardId,
            is_recurring: expenseData.isRecurring,
            installments: expenseData.installments,
            is_paid: expenseData.isPaid,
            user_id: user?.id
          }]);
          if (error) throw error;
          toast.success('Despesa criada!');
        }
      }

      // Force refresh
      await refreshData();
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


  const handleRecurrenceUpdate = async (scope: 'single' | 'future' | 'past' | 'all', data: any) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const recurrenceId = expense?.recurrenceId;
      
      console.log('Iniciando atualização recorrente...', { recurrenceId, scope, data });

      // Opção "Apenas esta" - atualiza só esse registro
      if (scope === 'single') {
        const { error: singleError } = await supabase.from('expenses').update({
          description: data.description,
          amount: data.amount,
          due_date: format(data.dueDate, 'yyyy-MM-dd'),
          expense_date: format(data.expenseDate, 'yyyy-MM-dd'),
          category_id: data.categoryId,
          subcategory_id: data.subcategoryId || null,
          payment_method: data.paymentMethod,
          account_id: data.accountId || null,
          card_id: data.cardId || null,
          is_paid: data.isPaid,
          // Mantém os campos de recorrência intactos
          is_recurring: expense?.isRecurring ?? true,
          installments: expense?.installments || null,
          recurrence_id: recurrenceId || null,
        }).eq('id', expense!.id);

        if (singleError) throw singleError;
        toast.success('Despesa atualizada com sucesso!');
        await refreshData();
        onOpenChange(false);
        return;
      }

      // Para os outros escopos, precisamos do recurrence_id
      if (!recurrenceId) {
        toast.error("Esta despesa não faz parte de uma série recorrente.");
        setIsSubmitting(false);
        return;
      }

      const dados = {
        description: data.description,
        amount: data.amount,
        category_id: data.categoryId,
        subcategory_id: data.subcategoryId || null,
        payment_method: data.paymentMethod,
        account_id: data.accountId || null,
        card_id: data.cardId || null,
      };

      let successMessage = '';

      switch (scope) {
        case 'single':
          const singleData = { ...dados, due_date: format(data.dueDate, 'yyyy-MM-dd'), expense_date: format(data.expenseDate, 'yyyy-MM-dd'), is_paid: data.isPaid };
          const { error: singleError } = await supabase.from('expenses').update(singleData).eq('id', expense!.id);
          if (singleError) throw singleError;
          successMessage = 'Despesa atualizada com sucesso!';
          break;

        case 'all':
          // For 'all', we update everything in the group. Dates are tricky here if we want to shift them all.
          // Usually 'all' updates category/value/desc. If date is changed, it might imply shifting the whole series or setting same day.
          // For simplicity and robustness, we apply the "Day Adjustment" logic to ALL records if date changed.
          // But first, let's just update the common fields.
          const { error: allError } = await supabase.from('expenses').update(dados)
            .eq('recurrence_id', recurrenceId);
          if (allError) throw allError;
          successMessage = 'Todas as despesas da série foram atualizadas!';
          break;
        }

        case 'past': {
          const { error: pastError } = await supabase.from('expenses').update(dados)
            .eq('recurrence_id', recurrenceId)
            .lte('due_date', format(data.dueDate, 'yyyy-MM-dd'));
          if (pastError) throw pastError;
          successMessage = 'Despesa atual e passadas atualizadas!';
          break;
        }

        case 'future': {
          const { data: futureExpenses, error: fetchError } = await supabase
            .from('expenses')
            .select('*')
            .eq('recurrence_id', recurrenceId)
            .gte('due_date', format(new Date(data.dueDate), 'yyyy-MM-dd'));

          if (fetchError) throw fetchError;

          if (futureExpenses && futureExpenses.length > 0) {
            const newDay = getDate(data.dueDate);
            
            const updates = futureExpenses.map((exp: any) => {
              const originalDate = new Date(exp.due_date);
              const newDate = setDate(originalDate, newDay);

              return {
                description: data.description,
                amount: data.amount,
                category_id: data.categoryId,
                subcategory_id: data.subcategoryId || null,
                payment_method: data.paymentMethod,
                account_id: data.accountId || null,
                card_id: data.cardId || null,
                is_recurring: true,
                installments: data.installments,
                id: exp.id,
                user_id: exp.user_id,
                recurrence_id: recurrenceId,
                due_date: format(newDate, 'yyyy-MM-dd'),
                expense_date: format(newDate, 'yyyy-MM-dd')
              };
            });

            const { error: updateError } = await supabase.from('expenses').upsert(updates);
            if (updateError) throw updateError;
          }
          successMessage = 'Despesa atual e futuras foram atualizadas!';
          break;
        }
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
    }
  };

  const handleDeleteClick = () => {
    if (!expense) return;
    if (isRecurringSeries) {
      setActionType('delete');
      setScopeDialogOpen(true);
    } else {
      setSimpleDeleteDialogOpen(true);
    }
  };

  const performDelete = async (scope: 'single' | 'future' | 'past' | 'all') => {
    if (!expense) return;
    setIsSubmitting(true);
    try {
      const { recurrenceId, id, dueDate } = expense;
      let query;

      if (scope === 'single' || !recurrenceId) {
        query = supabase.from('expenses').delete().eq('id', id);
      } else if (scope === 'future') {
        query = supabase.from('expenses').delete().eq('recurrence_id', recurrenceId).gte('due_date', format(new Date(dueDate), 'yyyy-MM-dd'));
      } else if (scope === 'past') {
        query = supabase.from('expenses').delete().eq('recurrence_id', recurrenceId).lte('due_date', format(new Date(dueDate), 'yyyy-MM-dd'));
      } else { // 'all'
        query = supabase.from('expenses').delete().eq('recurrence_id', recurrenceId);
      }

      const { error } = await query;
      if (error) throw error;

      toast.success('Despesa(s) excluída(s) com sucesso!');
      await refreshData();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Erro ao excluir: ${error.message}`);
    } finally {
      setIsSubmitting(false);
      setScopeDialogOpen(false);
    }
  };

  const performSimpleDelete = async () => {
    if (!expense) return;
    setIsSubmitting(true);
    try {
      await removeExpense(expense.id);
      toast.success('Despesa excluída com sucesso!');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Erro ao excluir: ${error.message}`);
    } finally {
      setIsSubmitting(false);
      setSimpleDeleteDialogOpen(false);
    }
  };

  const handleScopeSelection = (scope: 'single' | 'future' | 'past' | 'all') => {
    if (actionType === 'save') {
      handleRecurrenceUpdate(scope, pendingData);
    } else if (actionType === 'delete') {
      performDelete(scope);
    }
    setScopeDialogOpen(false);
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

          <div className="space-y-2">
            <Label htmlFor="description">Descrição <span className="text-red-500">*</span></Label>
            <Input id="description" placeholder="Ex: Supermercado" value={description} onChange={(e) => setDescription(e.target.value)} className={cn(errors.description && "border-red-500")} />
          </div>

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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expense-date">Data de Lançamento <span className="text-red-500">*</span></Label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="expense-date"
                  type="date" 
                  value={expenseDate} 
                  onChange={(e) => setExpenseDate(e.target.value)} 
                  className={cn("pl-9", errors.expenseDate && "border-red-500")}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="due-date">Data de Vencimento <span className="text-red-500">*</span></Label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="due-date"
                  type="date" 
                  value={dueDate} 
                  onChange={(e) => setDueDate(e.target.value)} 
                  className={cn("pl-9", errors.dueDate && "border-red-500", selectedCategory?.color ? `focus-visible:ring-${selectedCategory.color}` : "")}
                />
              </div>
            </div>
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

          <DialogFooter className="gap-2 sm:gap-0">
            {expense && (
              <Button type="button" variant="destructive" className="mr-auto" onClick={handleDeleteClick}>
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </Button>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Salvar
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
      
      {/* Scope Selection Dialog */}
      <AlertDialog open={scopeDialogOpen} onOpenChange={setScopeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'save' ? 'Confirmar Alteração' : 'Confirmar Exclusão'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta despesa é recorrente. Como deseja aplicar a {actionType === 'save' ? 'alteração' : 'exclusão'}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2 py-4">
            <Button variant="outline" className="justify-start h-auto py-3 px-4" onClick={() => handleScopeSelection('single')}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-full"><Calendar className="w-4 h-4" /></div>
                <div className="text-left"><p className="font-medium">Apenas esta</p><p className="text-xs text-muted-foreground">Apenas este registro</p></div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3 px-4" onClick={() => handleScopeSelection('future')}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-full"><CalendarClock className="w-4 h-4" /></div>
                <div className="text-left"><p className="font-medium">Esta e futuras</p><p className="text-xs text-muted-foreground">Deste vencimento em diante</p></div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3 px-4" onClick={() => handleScopeSelection('past')}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-full"><History className="w-4 h-4" /></div>
                <div className="text-left"><p className="font-medium">Esta e passadas</p><p className="text-xs text-muted-foreground">Do vencimento atual para trás</p></div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3 px-4" onClick={() => handleScopeSelection('all')}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-full"><CalendarDays className="w-4 h-4" /></div>
                <div className="text-left"><p className="font-medium">Todas</p><p className="text-xs text-muted-foreground">Todo o histórico da série</p></div>
              </div>
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Simple Delete Confirmation */}
      <AlertDialog open={simpleDeleteDialogOpen} onOpenChange={setSimpleDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir esta despesa?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={performSimpleDelete} className="bg-destructive hover:bg-destructive/90">Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}