import { useState, useEffect } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
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
import { Loader2, Trash2, Calendar, CalendarClock, CalendarDays, Lock, FileText, Tag, CreditCard, Repeat, Settings2 } from 'lucide-react';
import { CalculatorPopover } from '@/components/ui/calculator-popover';
import { toast } from 'sonner';
import { addMonths, format } from 'date-fns';
import { getPlanLimit, getRecurrenceQuotaStatus } from '@/lib/recurrenceQuota';
import { type RecurrenceScope, toIsoDay, dayOfMonth, withDayOfMonth } from '@/lib/recurrenceScope';
import { DateInputBR } from "@/components/ui/date-input-br";

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense | null;
  initialData?: Partial<Expense> | null;
}

export default function ExpenseForm({ open, onOpenChange, expense, initialData }: ExpenseFormProps) {
  const navigate = useNavigate();
  const { hasFeatureAccess, subscriptionPlan, user } = useAuth();
  const { refreshData, categories, subcategories, accounts, cards, removeExpense, addCategory, addSubcategory } = useFinance();
  const canUseExtraControl = hasFeatureAccess('extra_control');
  const recurrencePlanLimit = getPlanLimit(subscriptionPlan as string);
  const ADD_CATEGORY_OPTION = '__add_new_category__';
  const ADD_SUBCATEGORY_OPTION = '__add_new_subcategory__';
  
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
  const [deleteScopeDialogOpen, setDeleteScopeDialogOpen] = useState(false);
  const [pendingData, setPendingData] = useState<any>(null);
  const [excludeFromCalculations, setExcludeFromCalculations] = useState(false);
  const [recurrenceUsage, setRecurrenceUsage] = useState(0);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [subcategoryDialogOpen, setSubcategoryDialogOpen] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [observation, setObservation] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [settlementMethod, setSettlementMethod] = useState<PaymentMethod | ''>('');
  const [settlementAccountId, setSettlementAccountId] = useState('');
  const [settlementCardId, setSettlementCardId] = useState('');

  // --- Helpers ---
  const formatToInput = (dateVal: any) => {
    if (!dateVal) return "";
    if (dateVal instanceof Date) return format(dateVal, 'yyyy-MM-dd');
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
      
      if (dataToLoad) {
        setDescription(dataToLoad.description || '');
        
        const catId = dataToLoad.categoryId || (dataToLoad as any).category_id || '';
        const subCatId = dataToLoad.subcategoryId || (dataToLoad as any).subcategory_id || '';
        console.log('[ExpenseForm] Loading data:', { catId, subCatId, raw_subcategoryId: dataToLoad.subcategoryId, raw_subcategory_id: (dataToLoad as any).subcategory_id });
        setCategoryId(catId);
        setSubcategoryId(subCatId);
        
        setDueDate(dataToLoad.dueDate ? formatToInput(dataToLoad.dueDate) : (dataToLoad as any).due_date ? formatToInput((dataToLoad as any).due_date) : today);
        setAmount(dataToLoad.amount ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dataToLoad.amount) : '');
        setPaymentMethod(dataToLoad.paymentMethod || (dataToLoad as any).payment_method || 'pix');
        setCardId(dataToLoad.cardId || (dataToLoad as any).card_id || '');
        setAccountId(dataToLoad.accountId || (dataToLoad as any).account_id || '');
        setIsPaid(dataToLoad.isPaid || (dataToLoad as any).is_paid || false);
        setPaymentDate((dataToLoad.isPaid && dataToLoad.expenseDate) ? formatToInput(dataToLoad.expenseDate) : today);
        setIsRecurring(dataToLoad.isRecurring || false);
        setInstallments(dataToLoad.installments?.toString() || '1');
        setLaunchDate(dataToLoad.expenseDate ? formatToInput(dataToLoad.expenseDate) : today);
        setExcludeFromCalculations((dataToLoad as any).excludeFromCalculations || false);
        setObservation((dataToLoad as any).observation || '');
        setIsScheduled((dataToLoad as any).is_scheduled || false);
        setScheduledDate((dataToLoad as any).scheduled_date ? formatToInput((dataToLoad as any).scheduled_date) : '');
        setSettlementMethod(((dataToLoad as any).settlementMethod || (dataToLoad as any).settlement_method || '') as PaymentMethod | '');
        setSettlementAccountId((dataToLoad as any).settlementAccountId || (dataToLoad as any).settlement_account_id || '');
        setSettlementCardId((dataToLoad as any).settlementCardId || (dataToLoad as any).settlement_card_id || '');
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
        setExcludeFromCalculations(false);
        setObservation('');
        setShowErrors(false);
        setIsScheduled(false);
        setScheduledDate('');
        setSettlementMethod('');
        setSettlementAccountId('');
      }
    }
  }, [open, expense, initialData]);

  useEffect(() => {
    if (!open || !user?.id) return;
    if (expense) return;

    const loadQuota = async () => {
      try {
        const quota = await getRecurrenceQuotaStatus(user.id, subscriptionPlan as string);
        setRecurrenceUsage(quota.used);
      } catch {
        setRecurrenceUsage(0);
      }
    };

    loadQuota();
  }, [open, expense, user?.id, subscriptionPlan]);

  // --- Handlers ---
  const handlePaidChange = (checked: boolean) => {
    setIsPaid(checked);
    if (checked) {
      setPaymentDate(getTodayString());
    }
  };

  const renumberInstallments = async (recurrenceId: string) => {
    try {
      const { data: remaining } = await supabase
        .from('expenses')
        .select('id, due_date')
        .eq('recurrence_id', recurrenceId)
        .order('due_date', { ascending: true });

      if (!remaining || remaining.length === 0) return;

      const total = remaining.length;
      for (let i = 0; i < remaining.length; i++) {
        await supabase.from('expenses').update({
          current_installment: i + 1,
          installments: total,
        }).eq('id', remaining[i].id);
      }
    } catch (err) {
      console.error('Erro ao renumerar parcelas:', err);
    }
  };

  const handleDelete = async () => {
    if (!expense) return;
    
    // If recurring, show scope dialog instead of simple confirm
    if (expense.isRecurring && (expense.recurrenceId || (expense as any).recurrence_id)) {
      setDeleteScopeDialogOpen(true);
      return;
    }
    
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

  const handleRecurrenceDelete = async (scope: 'single' | 'future' | 'all') => {
    if (!expense) return;
    
    setIsSubmitting(true);
    try {
      const recurrenceId = expense.recurrenceId || (expense as any).recurrence_id;
      const originalDueDate = expense.dueDate instanceof Date 
        ? format(expense.dueDate, 'yyyy-MM-dd')
        : String(expense.dueDate).split('T')[0];

      if (scope === 'single') {
        await removeExpense(expense.id);
      } else if (scope === 'future') {
        // Delete current + future
        const { error } = await supabase.from('expenses')
          .delete()
          .eq('recurrence_id', recurrenceId)
          .gte('due_date', originalDueDate);
        if (error) throw error;
      } else {
        // Delete all in the series
        const { error } = await supabase.from('expenses')
          .delete()
          .eq('recurrence_id', recurrenceId);
        if (error) throw error;
      }

      // Renumber remaining installments if not deleting all
      if (scope !== 'all' && recurrenceId) {
        await renumberInstallments(recurrenceId);
      }

      await refreshData();
      const successMessage = scope === 'single' ? 'Despesa excluída!' : 'Despesas excluídas com sucesso!';
      const descriptionMessage = scope === 'single'
        ? 'Apenas a despesa selecionada foi removida.'
        : 'As despesas recorrentes foram removidas conforme sua seleção.';
      toast.success(successMessage, { description: descriptionMessage });
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Erro ao excluir: ' + error.message);
    } finally {
      setIsSubmitting(false);
      setDeleteScopeDialogOpen(false);
    }
  };

  const handleCategorySelectChange = (value: string) => {
    if (value === ADD_CATEGORY_OPTION) {
      setCategoryDialogOpen(true);
      return;
    }
    setCategoryId(value);
    setSubcategoryId('');
  };

  const handleSubcategorySelectChange = (value: string) => {
    if (value === ADD_SUBCATEGORY_OPTION) {
      if (!categoryId) {
        toast.error('Selecione uma categoria antes de criar subcategoria.');
        return;
      }
      setSubcategoryDialogOpen(true);
      return;
    }
    setSubcategoryId(value);
  };

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      toast.error('Informe o nome da categoria.');
      return;
    }

    const created = await addCategory({
      name,
      icon: 'Tag',
      color: 'emerald-500',
      isDefault: false,
    });

    if (created) {
      setCategoryId(created.id);
      setSubcategoryId('');
      setNewCategoryName('');
      setCategoryDialogOpen(false);
      toast.success('Categoria cadastrada com sucesso!');
    }
  };

  const handleCreateSubcategory = async () => {
    const name = newSubcategoryName.trim();
    if (!name) {
      toast.error('Informe o nome da subcategoria.');
      return;
    }
    if (!categoryId) {
      toast.error('Selecione uma categoria antes de criar subcategoria.');
      return;
    }

    const created = await addSubcategory({
      name,
      categoryId,
    });

    if (created) {
      setSubcategoryId(created.id);
      setNewSubcategoryName('');
      setSubcategoryDialogOpen(false);
      toast.success('Subcategoria cadastrada com sucesso!');
    }
  };

  const handleRecurrenceUpdate = async (scope: RecurrenceScope) => {
    if (!expense || !pendingData) return;
    
    setIsSubmitting(true);
    try {
      // Use original dates as anchor (before updating current)
      const originalDueDate = toIsoDay(expense.dueDate as any);
      const originalExpenseDate = expense.expenseDate ? toIsoDay(expense.expenseDate as any) : null;

      // 1. Atualiza a despesa atual
      const { error: singleError } = await supabase.from('expenses').update(pendingData).eq('id', expense.id);
      
      if (singleError) {
        console.error('Erro Supabase:', singleError);
        throw singleError;
      }

      if (scope !== 'single') {
        let recurrenceId = expense.recurrenceId || (expense as any).recurrence_id;
        
        // Legacy: generate recurrence_id for old recurring expenses that don't have one
        if (!recurrenceId) {
          recurrenceId = crypto.randomUUID();
          // Find all expenses with matching base description and is_recurring
          const baseDesc = expense.description.replace(/\s*\(\d+\/\d+\)\s*$/, '').trim();
          const { data: siblings } = await supabase
            .from('expenses')
            .select('id, description')
            .eq('user_id', expense.userId)
            .eq('is_recurring', true);
          
          const matchingIds = (siblings || [])
            .filter(s => s.description.replace(/\s*\(\d+\/\d+\)\s*$/, '').trim() === baseDesc)
            .map(s => s.id);
          
          if (matchingIds.length > 0) {
            await supabase
              .from('expenses')
              .update({ recurrence_id: recurrenceId })
              .in('id', matchingIds);
          }
        }
        
        // Remove per-installment fields: payment state and absolute dates stay individual
        const { due_date, expense_date, is_paid, user_id, current_installment, settlement_method, settlement_account_id, settlement_card_id, ...batchData } = pendingData;

        // Identify affected rows according to the chosen scope
        let selectQuery = supabase
          .from('expenses')
          .select('id, due_date, expense_date')
          .eq('recurrence_id', recurrenceId)
          .neq('id', expense.id);

        if (scope === 'future') selectQuery = selectQuery.gte('due_date', originalDueDate);
        if (scope === 'past') selectQuery = selectQuery.lte('due_date', originalDueDate);

        const { data: targets, error: selectError } = await selectQuery;
        if (selectError) throw selectError;

        const ids = (targets || []).map((t: any) => t.id);

        if (ids.length > 0) {
          if (Object.keys(batchData).length > 0) {
            const { error } = await supabase.from('expenses').update(batchData).in('id', ids);
            if (error) throw error;
          }

          // Propagate day-of-month changes while keeping each installment's own month/year
          const dueDayChanged = due_date && dayOfMonth(due_date) !== dayOfMonth(originalDueDate);
          const expenseDayChanged =
            expense_date && originalExpenseDate && dayOfMonth(expense_date) !== dayOfMonth(originalExpenseDate);

          if (dueDayChanged || expenseDayChanged) {
            await Promise.all(
              (targets || []).map((t: any) => {
                const patch: Record<string, string> = {};
                if (dueDayChanged && t.due_date) {
                  patch.due_date = withDayOfMonth(toIsoDay(t.due_date), dayOfMonth(due_date));
                }
                if (expenseDayChanged && t.expense_date) {
                  patch.expense_date = withDayOfMonth(toIsoDay(t.expense_date), dayOfMonth(expense_date));
                }
                if (Object.keys(patch).length === 0) return Promise.resolve();
                return supabase.from('expenses').update(patch).eq('id', t.id);
              })
            );
          }
        }
      }


      toast.success('Despesas atualizadas com sucesso!', {
        description: 'As alterações foram aplicadas à série de recorrência.',
      });
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
      setShowErrors(true);
      setShakeKey(k => k + 1);
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    if (isScheduled && !scheduledDate) {
      toast.error('Informe a data do agendamento.');
      return;
    }

    setShowErrors(false);

    setIsSubmitting(true);
    try {
      if (!expense && isRecurring && user?.id) {
        const quota = await getRecurrenceQuotaStatus(user.id, subscriptionPlan as string);
        setRecurrenceUsage(quota.used);

        if (quota.exceededByNewRecurring) {
          toast.error('Limite de Recorrências Atingido', {
            description: `Seu plano atual permite apenas ${quota.limit} lançamentos recorrentes. Faça o upgrade para liberar mais!`,
            action: {
              label: 'Ver planos',
              onClick: () => navigate('/planos'),
            },
          });
          setIsSubmitting(false);
          return;
        }
      }

      const finalExpenseDate = isPaid ? paymentDate : launchDate;

      // Sanitização: Garantir tipos numéricos e chaves snake_case
      const payload = {
        description,
        amount: Number(numericAmount), // Garante Float
        due_date: dueDate,
        expense_date: finalExpenseDate,
        category_id: categoryId,
        subcategory_id: subcategoryId || null,
        payment_method: paymentMethod,
        card_id: paymentMethod === 'credit_card' && cardId ? cardId : null,
        account_id: (paymentMethod === 'account' || paymentMethod === 'pix') && accountId ? accountId : null,
        is_paid: isPaid,
        is_recurring: isRecurring,
        installments: isRecurring ? parseInt(installments) : null,
        exclude_from_calculations: canUseExtraControl ? excludeFromCalculations : false,
        observation: observation || null,
        is_scheduled: isScheduled,
        scheduled_date: isScheduled && scheduledDate ? `${scheduledDate}T12:00:00` : null,
        settlement_method: isPaid && settlementMethod ? settlementMethod : null,
        settlement_account_id: isPaid && settlementMethod && settlementMethod !== 'credit_card' && settlementAccountId ? settlementAccountId : null,
        settlement_card_id: isPaid && settlementMethod === 'credit_card' && settlementCardId ? settlementCardId : null,
      };

      if (expense) {
        console.log('Dados enviados (Update):', payload);
        
        if (expense.isRecurring) {
          setPendingData(payload);
          setScopeDialogOpen(true);
          setIsSubmitting(false);
          return;
        }

        // If user is converting a non-recurring expense to recurring with installments > 1,
        // generate the future installments
        if (isRecurring && parseInt(installments) > 1) {
          const newRecurrenceId = crypto.randomUUID();
          const limit = parseInt(installments);
          const [y, m, d] = dueDate.split('-').map(Number);
          const startDate = new Date(y, m - 1, d, 12);

          // Update the current expense as installment 1
          const { error: updateError } = await supabase.from('expenses').update({
            ...payload,
            recurrence_id: newRecurrenceId,
            current_installment: 1,
            installments: limit,
          }).eq('id', expense.id);
          if (updateError) throw updateError;

          // Create future installments (2 onwards)
          const futureExpenses = [];
          for (let i = 1; i < limit; i++) {
            const nextDueDate = addMonths(startDate, i);
            const nextDueDateStr = format(nextDueDate, 'yyyy-MM-dd');
            futureExpenses.push({
              ...payload,
              due_date: nextDueDateStr,
              expense_date: nextDueDateStr,
              is_paid: false,
              recurrence_id: newRecurrenceId,
              current_installment: i + 1,
              installments: limit,
            });
          }
          const { error: insertError } = await supabase.from('expenses').insert(futureExpenses);
          if (insertError) {
            console.error('Erro Supabase (Insert Parcelas):', insertError);
            throw insertError;
          }
          toast.success(`${limit} despesas criadas!`, {
            description: `A despesa "${description}" foi parcelada em ${limit} vezes.`,
          });
        } else {
          const { error } = await supabase.from('expenses').update(payload).eq('id', expense.id);
          if (error) {
            console.error('Erro Supabase:', error);
            throw error;
          }
          toast.success('Despesa atualizada!');
        }
      } else {
        // Para INSERT, incluímos o user_id explicitamente
        const authUser = (await supabase.auth.getUser()).data.user;
        const insertPayload = { ...payload, user_id: authUser?.id };
        console.log('Dados enviados (Insert):', insertPayload);

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
               expense_date: nextDueDateStr,
               is_paid: i === 0 ? isPaid : false,
               recurrence_id: newRecurrenceId,
               current_installment: i + 1,
               installments: limit,
             });
           }
           const { error } = await supabase.from('expenses').insert(newExpenses);
           if (error) {
             console.error('Erro Supabase:', error);
             throw error;
           }
           toast.success(`${limit} despesas criadas!`, {
             description: `A despesa "${description}" foi parcelada em ${limit} vezes.`,
           });
        } else {
           const { error } = await supabase.from('expenses').insert([insertPayload]);
           if (error) {
             console.error('Erro Supabase (Insert Individual):', error);
             throw error;
           }
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
      <DialogContent className="sm:max-w-4xl w-[calc(100vw-1rem)] max-h-[95vh] sm:max-h-[92vh] gap-0 overflow-hidden rounded-2xl border-0 bg-card p-0 shadow-xl flex flex-col">
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 border-b px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="min-w-0">
            <DialogTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground truncate">
              {expense ? 'Editar Despesa' : 'Nova Despesa'}
            </DialogTitle>
            <DialogDescription className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">
              {expense 
                ? `Cadastrada em ${format(new Date(expense.createdAt), 'dd/MM/yyyy HH:mm')}${expense.installments && expense.installments > 1 ? ` • Parcela ${expense.currentInstallment || 1}/${expense.installments}` : expense.isRecurring ? ' • Recorrente' : ''}`
                : 'Preencha os detalhes da transação'}
            </DialogDescription>
          </div>
          {expense && (
            <Button type="button" variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 h-8 px-2 rounded-lg shrink-0" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Excluir</span>
            </Button>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto form-scrollbar p-4 sm:p-6">
            <div className="space-y-5">
          {/* Seção: Informações Básicas */}
          <div className="flex items-center gap-2 -mb-2">
            <FileText className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Informações</span>
            <div className="flex-1 h-px bg-border/60" />
          </div>
          {/* Row 1: Descrição + Valor */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div key={`desc-${shakeKey}`} className={cn("sm:col-span-2 space-y-1.5", showErrors && !description && "animate-shake")}>
              <Label className={cn("text-xs font-semibold uppercase tracking-wider", showErrors && !description ? "text-destructive" : "text-muted-foreground")}>Descrição *</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} className={cn("h-10 rounded-xl border-border/60 bg-muted/30 focus:bg-card transition-colors", showErrors && !description && "border-destructive ring-1 ring-destructive/30")} placeholder="Ex: Supermercado" />
              {showErrors && !description && <span className="text-xs text-destructive">Campo obrigatório</span>}
            </div>
            <div key={`amt-${shakeKey}`} className={cn("space-y-1.5", showErrors && (parseFloat(amount.replace(/[^\d,]/g, '').replace(',', '.')) || 0) <= 0 && "animate-shake")}>
              <Label className={cn("text-xs font-semibold uppercase tracking-wider", showErrors && (parseFloat(amount.replace(/[^\d,]/g, '').replace(',', '.')) || 0) <= 0 ? "text-destructive" : "text-muted-foreground")}>Valor *</Label>
              <div className="flex items-center gap-1">
                <Input value={amount} onChange={e => setAmount(formatCurrencyInput(e.target.value))} className={cn("h-10 rounded-xl border-border/60 bg-muted/30 focus:bg-card text-right font-semibold transition-colors", showErrors && (parseFloat(amount.replace(/[^\d,]/g, '').replace(',', '.')) || 0) <= 0 && "border-destructive ring-1 ring-destructive/30")} placeholder="R$ 0,00" />
                <CalculatorPopover currentValue={amount} onConfirm={(val) => setAmount(formatCurrencyInput(val))} />
              </div>
              {showErrors && (parseFloat(amount.replace(/[^\d,]/g, '').replace(',', '.')) || 0) <= 0 && <span className="text-xs text-destructive">Campo obrigatório</span>}
            </div>
          </div>

          {/* Seção: Classificação */}
          <div className="flex items-center gap-2 -mb-2 pt-2">
            <Tag className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Categoria & Vencimento</span>
            <div className="flex-1 h-px bg-border/60" />
          </div>
          {/* Row 2: Categoria + Subcategoria + Vencimento */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div key={`cat-${shakeKey}`} className={cn("space-y-1.5", showErrors && !categoryId && "animate-shake")}>
              <Label className={cn("text-xs font-semibold uppercase tracking-wider", showErrors && !categoryId ? "text-destructive" : "text-muted-foreground")}>Categoria *</Label>
              <Select value={categoryId} onValueChange={handleCategorySelectChange}>
                <SelectTrigger className={cn("h-10 rounded-xl border-border/60 bg-muted/30", showErrors && !categoryId && "border-destructive ring-1 ring-destructive/30")}><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ADD_CATEGORY_OPTION} className="border-b mb-1 pb-2 font-medium text-primary">+ Nova categoria</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2"><CategoryIcon iconName={c.icon} className={`w-4 h-4 text-${c.color}`} /> {c.name}</div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showErrors && !categoryId && <span className="text-xs text-destructive">Campo obrigatório</span>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subcategoria</Label>
              <Select key={`subcat-${categoryId}-${subcategoryId}`} value={subcategoryId} onValueChange={handleSubcategorySelectChange} disabled={!categoryId}>
                <SelectTrigger className="h-10 rounded-xl border-border/60 bg-muted/30"><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ADD_SUBCATEGORY_OPTION} className="border-b mb-1 pb-2 font-medium text-primary">+ Nova subcategoria</SelectItem>
                  {filteredSubcategories.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div key={`due-${shakeKey}`} className={cn("space-y-1.5", showErrors && !dueDate && "animate-shake")}>
              <Label className={cn("text-xs font-semibold uppercase tracking-wider", showErrors && !dueDate ? "text-destructive" : "text-muted-foreground")}>Vencimento *</Label>
              <DateInputBR value={dueDate} onChange={setDueDate} className={cn("h-10 rounded-xl border-border/60 bg-muted/30", showErrors && !dueDate && "border-destructive ring-1 ring-destructive/30")} />
              {showErrors && !dueDate && <span className="text-xs text-destructive">Campo obrigatório</span>}
            </div>
          </div>

          {/* Seção: Pagamento */}
          <div className="flex items-center gap-2 -mb-2 pt-2">
            <CreditCard className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Pagamento</span>
            <div className="flex-1 h-px bg-border/60" />
          </div>
          {/* Row 3: Pagamento + Status + Recorrência */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Forma de Pagamento</Label>
              <Select value={paymentMethod} onValueChange={v => setPaymentMethod(v as PaymentMethod)}>
                <SelectTrigger className="h-10 rounded-xl border-border/60 bg-muted/30"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX / Dinheiro</SelectItem>
                  <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                  <SelectItem value="account">Débito em Conta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              {paymentMethod === 'credit_card' ? (
                <>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cartão</Label>
                  <Select value={cardId} onValueChange={setCardId}>
                    <SelectTrigger className="h-10 rounded-xl border-border/60 bg-muted/30"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{cards.map(c => <SelectItem key={c.id} value={c.id}>{c.brand} •••• {c.lastFourDigits}</SelectItem>)}</SelectContent>
                  </Select>
                </>
              ) : paymentMethod === 'account' ? (
                <>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Conta</Label>
                  <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger className="h-10 rounded-xl border-border/60 bg-muted/30"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.bankName}</SelectItem>)}</SelectContent>
                  </Select>
                </>
              ) : paymentMethod === 'pix' ? (
                <>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Banco (PIX)</Label>
                  <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger className="h-10 rounded-xl border-border/60 bg-muted/30"><SelectValue placeholder="Opcional" /></SelectTrigger>
                    <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.bankName}</SelectItem>)}</SelectContent>
                  </Select>
                </>
              ) : null}
            </div>
            <div className="flex gap-4">
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</Label>
                <button type="button" onClick={() => handlePaidChange(!isPaid)} className={cn(
                  "flex items-center justify-center gap-2 w-full h-10 rounded-xl border text-sm font-semibold transition-all",
                  isPaid ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted/30 border-border/60 text-muted-foreground"
                )}>
                  <span className={cn("w-2 h-2 rounded-full", isPaid ? "bg-primary" : "bg-muted-foreground/40")} />
                  {isPaid ? 'Pago' : 'Pendente'}
                </button>
              </div>
            </div>
          </div>

          {/* Seção: Quitação — como o pagamento foi efetivado */}
          {isPaid && (
            <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/40 p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2">
                <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Quitação</span>
                <div className="flex-1 h-px bg-emerald-200/60" />
                <span className="text-[10px] text-emerald-700/70">De onde saiu o dinheiro</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Forma de quitação</Label>
                  <Select
                    value={settlementMethod || undefined}
                    onValueChange={(v) => {
                      if (v === 'same_origin') {
                        setSettlementMethod(paymentMethod);
                        setSettlementAccountId(paymentMethod !== 'credit_card' ? accountId : '');
                        setSettlementCardId(paymentMethod === 'credit_card' ? cardId : '');
                        return;
                      }
                      setSettlementMethod(v as PaymentMethod);
                      setSettlementAccountId('');
                      setSettlementCardId('');
                    }}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-border/60 bg-card"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="same_origin">
                        {paymentMethod === 'credit_card'
                          ? 'Mesmo cartão da compra'
                          : paymentMethod === 'account'
                            ? 'Mesma conta da compra'
                            : 'Mesmo meio da compra (PIX/Dinheiro)'}
                      </SelectItem>
                      <SelectItem value="pix">PIX / Dinheiro</SelectItem>
                      <SelectItem value="account">Débito em Conta</SelectItem>
                      <SelectItem value="credit_card">Outro Cartão de Crédito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {settlementMethod && settlementMethod !== 'credit_card' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Banco da quitação</Label>
                    <Select value={settlementAccountId} onValueChange={setSettlementAccountId}>
                      <SelectTrigger className="h-10 rounded-xl border-border/60 bg-card"><SelectValue placeholder="Selecione o banco" /></SelectTrigger>
                      <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.bankName}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                {settlementMethod === 'credit_card' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cartão da quitação</Label>
                    <Select value={settlementCardId} onValueChange={setSettlementCardId}>
                      <SelectTrigger className="h-10 rounded-xl border-border/60 bg-card"><SelectValue placeholder="Selecione o cartão (final)" /></SelectTrigger>
                      <SelectContent>{cards.map(c => <SelectItem key={c.id} value={c.id}>{c.brand} •••• {c.lastFourDigits}</SelectItem>)}</SelectContent>
                    </Select>
                    {cards.length === 0 && (
                      <p className="text-[10px] text-muted-foreground">Cadastre seus cartões em Contas &amp; Cartões para selecionar o final.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Seção: Recorrência & Observação */}
          <div className="flex items-center gap-2 -mb-2 pt-2">
            <Repeat className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Recorrência</span>
            <div className="flex-1 h-px bg-border/60" />
          </div>
          {/* Row 4: Recorrência */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recorrência</Label>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setIsRecurring(!isRecurring)} className={cn(
                  "flex items-center justify-center gap-2 h-10 rounded-xl border text-sm font-semibold transition-all flex-1",
                  isRecurring ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted/30 border-border/60 text-muted-foreground"
                )}>
                  <span className={cn("w-2 h-2 rounded-full", isRecurring ? "bg-primary" : "bg-muted-foreground/40")} />
                  {isRecurring ? 'Sim' : 'Não'}
                </button>
                {isRecurring && <Input type="number" min="1" value={installments} onChange={e => setInstallments(e.target.value)} className="h-10 w-20 text-center rounded-xl border-border/60 bg-muted/30" />}
              </div>
              {!expense && recurrencePlanLimit.limit === 2 && (
                <p className="text-[10px] text-muted-foreground">{recurrenceUsage}/2 recorrências</p>
              )}
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Observação</Label>
              <textarea
                value={observation}
                onChange={e => setObservation(e.target.value)}
                className="flex w-full rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors focus:bg-card resize-none"
                placeholder="Anotações opcionais..."
                rows={2}
              />
            </div>
          </div>

          {/* Seção: Avançado */}
          <div className="flex items-center gap-2 -mb-2 pt-2">
            <Settings2 className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Opções Avançadas</span>
            <div className="flex-1 h-px bg-border/60" />
          </div>
          {/* Toggles: Agendamento + Controle Visual */}
          <div className="space-y-3 p-4 border rounded-xl bg-muted/20">
            {/* Agendamento */}
            <div className="flex items-center gap-3">
              <Switch id="expense-scheduling" checked={isScheduled} onCheckedChange={setIsScheduled} />
              <Label htmlFor="expense-scheduling" className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                <CalendarClock className="h-4 w-4 text-primary" />
                Agendar esta despesa
              </Label>
            </div>
            {isScheduled && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200 space-y-1.5 pl-14">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data do Agendamento</Label>
                <DateInputBR
                  value={scheduledDate}
                  onChange={setScheduledDate}
                  className="h-10 rounded-xl border-border/60 bg-muted/30"
                />
                {scheduledDate && dueDate && scheduledDate > dueDate && (
                  <p className="text-xs text-muted-foreground">Pagamento agendado para depois do vencimento.</p>
                )}
              </div>
            )}

            {/* Separador */}
            <div className="border-t border-border/40" />

             {/* Apenas controle visual */}
             <div className={cn("flex items-center gap-3", !canUseExtraControl && "opacity-40")}>
               <Switch id="visual-control" checked={excludeFromCalculations} onCheckedChange={setExcludeFromCalculations} disabled={!canUseExtraControl && !expense} />
               <Label htmlFor="visual-control" className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                 {!canUseExtraControl && !expense && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                 Apenas controle visual
               </Label>
             </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-border/40">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl h-9 px-5 text-sm">Cancelar</Button>
            <Button type="submit" disabled={isSubmitting} className="rounded-xl min-w-[110px] h-9 bg-primary hover:bg-primary/90 shadow-sm">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>

      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl border-0 bg-card shadow-xl">
          <DialogHeader>
            <DialogTitle>Nova categoria</DialogTitle>
            <DialogDescription>Digite o nome da categoria para despesas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="new-expense-category">Nome</Label>
            <Input id="new-expense-category" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Ex: Assinaturas" className="rounded-xl" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setCategoryDialogOpen(false)}>Cancelar</Button>
            <Button type="button" className="rounded-xl" onClick={handleCreateCategory}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={subcategoryDialogOpen} onOpenChange={setSubcategoryDialogOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl border-0 bg-card shadow-xl">
          <DialogHeader>
            <DialogTitle>Nova subcategoria</DialogTitle>
            <DialogDescription>Digite o nome da subcategoria para a categoria selecionada.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="new-expense-subcategory">Nome</Label>
            <Input id="new-expense-subcategory" value={newSubcategoryName} onChange={(e) => setNewSubcategoryName(e.target.value)} placeholder="Ex: Streaming" className="rounded-xl" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setSubcategoryDialogOpen(false)}>Cancelar</Button>
            <Button type="button" className="rounded-xl" onClick={handleCreateSubcategory}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={scopeDialogOpen} onOpenChange={setScopeDialogOpen}>
        <AlertDialogContent className="max-w-xs p-4 gap-3">
          <AlertDialogHeader className="space-y-1">
            <AlertDialogTitle className="text-base">Atualizar recorrência</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              O status de pagamento continua individual em cada parcela.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-1.5">
            {([
              ['single', 'Apenas esta'],
              ['future', 'Esta e próximas'],
              ['past', 'Esta e anteriores'],
              ['all', 'Todas'],
            ] as const).map(([scope, label]) => (
              <Button
                key={scope}
                variant="outline"
                size="sm"
                className="justify-start h-9 text-sm"
                onClick={() => handleRecurrenceUpdate(scope)}
              >
                {label}
              </Button>
            ))}
          </div>
          <AlertDialogFooter className="mt-1">
            <AlertDialogCancel className="h-8 text-xs w-full">Cancelar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      <AlertDialog open={deleteScopeDialogOpen} onOpenChange={setDeleteScopeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Recorrência</AlertDialogTitle>
            <AlertDialogDescription>
              Esta é uma despesa recorrente. Como deseja excluir?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2 py-4">
            <Button variant="outline" className="justify-start h-auto py-3 px-4" onClick={() => handleRecurrenceDelete('single')}>
              <Calendar className="w-4 h-4 mr-3 text-muted-foreground" />
              <div className="text-left">
                <div className="font-medium">Apenas esta</div>
                <div className="text-xs text-muted-foreground">Excluir somente a despesa atual</div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3 px-4" onClick={() => handleRecurrenceDelete('future')}>
              <CalendarClock className="w-4 h-4 mr-3 text-destructive" />
              <div className="text-left">
                <div className="font-medium">Esta e próximas</div>
                <div className="text-xs text-muted-foreground">Excluir desta data em diante</div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3 px-4" onClick={() => handleRecurrenceDelete('all')}>
              <CalendarDays className="w-4 h-4 mr-3 text-destructive" />
              <div className="text-left">
                <div className="font-medium">Todas</div>
                <div className="text-xs text-muted-foreground">Excluir toda a série</div>
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
