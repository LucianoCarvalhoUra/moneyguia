﻿import { useState, useEffect } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useIncome } from '@/contexts/IncomeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CategoryIcon } from '@/components/CategoryIcon';
import { cn } from '@/lib/utils';
import { Income } from '@/types/income';
import { Loader2, Trash2, Calendar, CalendarClock, CalendarDays, Lock, Wallet, FileText, Tag, CreditCard, Repeat, Settings2 } from 'lucide-react';
import { CalculatorPopover } from '@/components/ui/calculator-popover';
import { toast } from 'sonner';
import { addMonths, format } from 'date-fns';
import { type RecurrenceScope, toIsoDay, dayOfMonth, withDayOfMonth } from '@/lib/recurrenceScope';
import { getPlanLimit, getRecurrenceQuotaStatus } from '@/lib/recurrenceQuota';
import { DateInputBR } from "@/components/ui/date-input-br";

interface IncomeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  income?: Income | null;
  initialData?: Partial<Income> | null;
}

export default function IncomeForm({ open, onOpenChange, income, initialData }: IncomeFormProps) {
  const navigate = useNavigate();
  const { hasFeatureAccess, subscriptionPlan, user } = useAuth();
  const { accounts } = useFinance();
  const { refreshData, incomeCategories, incomeSubcategories, removeIncome, addIncomeCategory, addIncomeSubcategory } = useIncome();
  const canUseExtraControl = hasFeatureAccess('extra_control');
  const recurrencePlanLimit = getPlanLimit(subscriptionPlan as string);
  const ADD_CATEGORY_OPTION = '__add_new_income_category__';
  const ADD_SUBCATEGORY_OPTION = '__add_new_income_subcategory__';
  
  // --- State ---
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [receiveDate, setReceiveDate] = useState('');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [isReceived, setIsReceived] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [installments, setInstallments] = useState('1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [excludeFromCalculations, setExcludeFromCalculations] = useState(false);
  const [recurrenceUsage, setRecurrenceUsage] = useState(0);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [subcategoryDialogOpen, setSubcategoryDialogOpen] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [description, setDescription] = useState(''); // Usado para observações
  const [showErrors, setShowErrors] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scopeDialogOpen, setScopeDialogOpen] = useState(false);
  const [pendingData, setPendingData] = useState<any>(null);
  const [recurrenceType, setRecurrenceType] = useState<'fixed_day' | 'business_day'>('fixed_day');
  const [targetBusinessDay, setTargetBusinessDay] = useState<number>(1);
  const [weekendStrategy, setWeekendStrategy] = useState<'next' | 'previous' | 'exact'>('next');


  // --- Helpers ---
  const formatToInput = (dateVal: any) => {
    if (!dateVal) return "";
    if (dateVal instanceof Date) return format(dateVal, 'yyyy-MM-dd');
    const str = String(dateVal);
    return str.includes('T') ? str.split('T')[0] : str;
  };

  const getTodayString = () => format(new Date(), 'yyyy-MM-dd');

  const formatCurrencyInput = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    if (!numericValue) return '';
    const floatValue = Number(numericValue) / 100;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(floatValue);
  };

  // --- Initialization ---
  useEffect(() => {
    if (open) {
      const today = getTodayString();
      const dataToLoad = income || initialData;
      
      if (dataToLoad) {
        setTitle(dataToLoad.title || '');
        setCategoryId(dataToLoad.categoryId || (dataToLoad as any).category_id || '');
        setSubcategoryId(dataToLoad.subcategoryId || (dataToLoad as any).subcategory_id || '');
        setReceiveDate(dataToLoad.receiveDate ? formatToInput(dataToLoad.receiveDate) : (dataToLoad as any).receive_date ? formatToInput((dataToLoad as any).receive_date) : today);
        setAmount(dataToLoad.amount ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dataToLoad.amount) : '');
        setAccountId(dataToLoad.accountId || (dataToLoad as any).account_id || '');
        setIsReceived(dataToLoad.isReceived || (dataToLoad as any).is_received || false);
        setIsRecurring(dataToLoad.isRecurring || false);
        setInstallments(dataToLoad.installments?.toString() || '1');
        setExcludeFromCalculations((dataToLoad as any).exclude_from_calculations || false);
        setDescription(dataToLoad.description || '');
        setIsScheduled((dataToLoad as any).is_scheduled || false);
        setScheduledDate((dataToLoad as any).scheduled_date ? formatToInput((dataToLoad as any).scheduled_date) : '');
      } else {
        setTitle('');
        setCategoryId('');
        setSubcategoryId('');
        setReceiveDate(today);
        setAmount('');
        setAccountId('');
        setIsReceived(false);
        setIsRecurring(false);
        setInstallments('1');
        setExcludeFromCalculations(false);
        setDescription('');
        setShowErrors(false);
        setIsScheduled(false);
        setScheduledDate('');
      }
    }
  }, [open, income, initialData]);

  useEffect(() => {
    if (!open || !user?.id) return;
    if (income) return;
    const loadQuota = async () => {
      try {
        const quota = await getRecurrenceQuotaStatus(user.id, subscriptionPlan as string);
        setRecurrenceUsage(quota.used);
      } catch {
        setRecurrenceUsage(0);
      }
    };
    loadQuota();
  }, [open, income, user?.id, subscriptionPlan]);

  // --- Handlers ---
  const handleDelete = async () => {
    if (!income) return;
    if (!confirm('Tem certeza que deseja excluir esta receita?')) return;
    setIsSubmitting(true);
    try {
      await removeIncome(income.id);
      toast.success('Receita excluída!');
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Erro ao excluir: ' + error.message);
    } finally {
      setIsSubmitting(false);
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

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return toast.error('Informe o nome da categoria.');
    const created = await addIncomeCategory({ name, icon: 'Banknote', color: 'emerald-500', isDefault: false });
    if (created) {
      setCategoryId(created.id);
      setSubcategoryId('');
      setNewCategoryName('');
      setCategoryDialogOpen(false);
      toast.success('Categoria cadastrada!');
    }
  };

  const handleRecurrenceUpdate = async (scope: RecurrenceScope) => {
    if (!income || !pendingData) return;
    setIsSubmitting(true);
    try {
      const originalReceiveDate = toIsoDay(income.receiveDate as any);

      const { error: singleError } = await supabase.from('incomes').update(pendingData).eq('id', income.id);
      if (singleError) throw singleError;

      if (scope !== 'single') {
        let recurrenceId = income.recurrenceId || (income as any).recurrence_id;
        if (!recurrenceId) {
          recurrenceId = crypto.randomUUID();
          const baseTitle = income.title.replace(/\s*\(\d+\/\d+\)\s*$/, '').trim();
          const { data: siblings } = await supabase
            .from('incomes')
            .select('id, title')
            .eq('user_id', income.userId)
            .eq('is_recurring', true);
          const matchingIds = (siblings || [])
            .filter((s: any) => s.title.replace(/\s*\(\d+\/\d+\)\s*$/, '').trim() === baseTitle)
            .map((s: any) => s.id);
          if (matchingIds.length > 0) {
            await supabase.from('incomes').update({ recurrence_id: recurrenceId }).in('id', matchingIds);
          }
        }

        // Preserve individual payment data: do not propagate receive_date, is_received, user_id, current_installment
        const { receive_date, is_received, user_id, current_installment, ...batchData } = pendingData;

        let selectQuery = supabase
          .from('incomes')
          .select('id, receive_date')
          .eq('recurrence_id', recurrenceId)
          .neq('id', income.id);

        if (scope === 'future') selectQuery = selectQuery.gte('receive_date', originalReceiveDate);
        if (scope === 'past') selectQuery = selectQuery.lte('receive_date', originalReceiveDate);

        const { data: targets, error: selectError } = await selectQuery;
        if (selectError) throw selectError;

        const ids = (targets || []).map((t: any) => t.id);

        if (ids.length > 0) {
          if (Object.keys(batchData).length > 0) {
            const { error } = await supabase.from('incomes').update(batchData).in('id', ids);
            if (error) throw error;
          }

          // Propagate day-of-month change keeping each installment's own month/year
          if (receive_date && dayOfMonth(receive_date) !== dayOfMonth(originalReceiveDate)) {
            await Promise.all(
              (targets || []).map((t: any) =>
                t.receive_date
                  ? supabase
                      .from('incomes')
                      .update({ receive_date: withDayOfMonth(toIsoDay(t.receive_date), dayOfMonth(receive_date)) })
                      .eq('id', t.id)
                  : Promise.resolve()
              )
            );
          }
        }
      }


      toast.success('Receitas atualizadas com sucesso!');
      await new Promise(resolve => setTimeout(resolve, 300));
      await refreshData();
      onOpenChange(false);
    } catch (error: any) {
      console.error('[IncomeBatchUpdate]', error);
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
    if (!title || !categoryId || !receiveDate || numericAmount <= 0) {
      setShowErrors(true);
      setShakeKey(k => k + 1);
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title,
        amount: numericAmount,
        receive_date: receiveDate,
        category_id: categoryId,
        subcategory_id: subcategoryId || null,
        account_id: accountId || null,
        is_received: isReceived,
        is_recurring: isRecurring,
        installments: isRecurring ? parseInt(installments) : null,
        user_id: user?.id,
        exclude_from_calculations: canUseExtraControl ? excludeFromCalculations : false,
        description: description || null, // Observação
        is_scheduled: isScheduled,
        scheduled_date: isScheduled && scheduledDate ? `${scheduledDate}T12:00:00` : null,
      };

      if (income) {
        if (income.isRecurring) {
          setPendingData(payload);
          setScopeDialogOpen(true);
          setIsSubmitting(false);
          return;
        }
        const { error } = await supabase.from('incomes').update(payload).eq('id', income.id);
        if (error) throw error;
        toast.success('Receita atualizada!');
      } else {
        if (isRecurring && parseInt(installments) > 1) {
          const newRecurrenceId = crypto.randomUUID();
          const newIncomes = [];
          const limit = parseInt(installments);
          const [y, m, d] = receiveDate.split('-').map(Number);
          const startDate = new Date(y, m - 1, d, 12);

          for (let i = 0; i < limit; i++) {
            const nextDate = addMonths(startDate, i);
            newIncomes.push({
              ...payload,
              receive_date: format(nextDate, 'yyyy-MM-dd'),
              is_received: i === 0 ? isReceived : false,
              recurrence_id: newRecurrenceId,
              current_installment: i + 1,
              installments: limit,
            });
          }
          const { error } = await supabase.from('incomes').insert(newIncomes);
          if (error) throw error;
          toast.success(`${limit} receitas parceladas criadas!`);
        } else {
          const { error } = await supabase.from('incomes').insert([payload]);
          if (error) throw error;
          toast.success('Receita salva!');
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

  const filteredSubcategories = incomeSubcategories.filter(s => s.categoryId === categoryId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl w-[calc(100vw-1rem)] max-h-[95vh] sm:max-h-[92vh] gap-0 overflow-hidden rounded-2xl border-0 bg-card p-0 shadow-xl flex flex-col">
        {/* Header - Identidade Verde */}
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 border-b px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-emerald-500/5 to-transparent">
          <div className="min-w-0">
            <DialogTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground truncate">
              {income ? 'Editar Receita' : 'Nova Receita'}
            </DialogTitle>
            <DialogDescription className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">
              {income 
                ? `Cadastrada em ${format(new Date(income.createdAt), 'dd/MM/yyyy HH:mm')}${income.installments && income.installments > 1 ? ` • Parcela ${income.currentInstallment || 1}/${income.installments}` : ''}`
                : 'Preencha os detalhes do seu ganho'}
            </DialogDescription>
          </div>
          {income && (
            <Button type="button" variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 h-8 px-2 rounded-lg shrink-0" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Excluir</span>
            </Button>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto form-scrollbar p-4 sm:p-6">
            <div className="space-y-5">
          {/* Seção: Informações */}
          <div className="flex items-center gap-2 -mb-2">
            <FileText className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Informações</span>
            <div className="flex-1 h-px bg-border/60" />
          </div>
          {/* Row 1: Descrição + Valor */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div key={`title-${shakeKey}`} className={cn("sm:col-span-2 space-y-1.5", showErrors && !title && "animate-shake")}>
              <Label className={cn("text-xs font-semibold uppercase tracking-wider", showErrors && !title ? "text-destructive" : "text-muted-foreground")}>Descrição *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} className={cn("h-10 rounded-xl border-border/60 bg-muted/30 focus:bg-card transition-colors", showErrors && !title && "border-destructive ring-1 ring-destructive/30")} placeholder="Ex: Salário" />
              {showErrors && !title && <span className="text-xs text-destructive">Campo obrigatório</span>}
            </div>
            <div key={`amt-${shakeKey}`} className={cn("space-y-1.5", showErrors && (parseFloat(amount.replace(/[^\d,]/g, '').replace(',', '.')) || 0) <= 0 && "animate-shake")}>
              <Label className={cn("text-xs font-semibold uppercase tracking-wider", showErrors && (parseFloat(amount.replace(/[^\d,]/g, '').replace(',', '.')) || 0) <= 0 ? "text-destructive" : "text-muted-foreground")}>Valor *</Label>
              <div className="flex items-center gap-1">
                <Input value={amount} onChange={e => setAmount(formatCurrencyInput(e.target.value))} className={cn("h-10 rounded-xl border-border/60 bg-muted/30 focus:bg-card text-right font-semibold transition-colors text-emerald-600", showErrors && (parseFloat(amount.replace(/[^\d,]/g, '').replace(',', '.')) || 0) <= 0 && "border-destructive ring-1 ring-destructive/30")} placeholder="R$ 0,00" />
                <CalculatorPopover currentValue={amount} onConfirm={(val) => setAmount(formatCurrencyInput(val))} />
              </div>
              {showErrors && (parseFloat(amount.replace(/[^\d,]/g, '').replace(',', '.')) || 0) <= 0 && <span className="text-xs text-destructive">Campo obrigatório</span>}
            </div>
          </div>

          {/* Seção: Categoria & Recebimento */}
          <div className="flex items-center gap-2 -mb-2 pt-2">
            <Tag className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Categoria & Recebimento</span>
            <div className="flex-1 h-px bg-border/60" />
          </div>
          {/* Row 2: Categoria + Subcategoria + Recebimento */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div key={`cat-${shakeKey}`} className={cn("space-y-1.5", showErrors && !categoryId && "animate-shake")}>
              <Label className={cn("text-xs font-semibold uppercase tracking-wider", showErrors && !categoryId ? "text-destructive" : "text-muted-foreground")}>Categoria *</Label>
              <Select value={categoryId} onValueChange={handleCategorySelectChange}>
                <SelectTrigger className={cn("h-10 rounded-xl border-border/60 bg-muted/30", showErrors && !categoryId && "border-destructive ring-1 ring-destructive/30")}><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ADD_CATEGORY_OPTION} className="border-b mb-1 pb-2 font-medium text-emerald-600">+ Nova categoria</SelectItem>
                  {incomeCategories.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2"><CategoryIcon iconName={c.icon} className={`w-4 h-4 text-emerald-500`} /> {c.name}</div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subcategoria</Label>
              <Select value={subcategoryId} onValueChange={setSubcategoryId} disabled={!categoryId}>
                <SelectTrigger className="h-10 rounded-xl border-border/60 bg-muted/30"><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>
                  {filteredSubcategories.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div key={`due-${shakeKey}`} className={cn("space-y-1.5", showErrors && !receiveDate && "animate-shake")}>
              <Label className={cn("text-xs font-semibold uppercase tracking-wider", showErrors && !receiveDate ? "text-destructive" : "text-muted-foreground")}>Data de Recebimento *</Label>
              <DateInputBR value={receiveDate} onChange={setReceiveDate} className={cn("h-10 rounded-xl border-border/60 bg-muted/30", showErrors && !receiveDate && "border-destructive ring-1 ring-destructive/30")} />
            </div>
          </div>

          {/* Seção: Conta */}
          <div className="flex items-center gap-2 -mb-2 pt-2">
            <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Conta de Destino</span>
            <div className="flex-1 h-px bg-border/60" />
          </div>
          {/* Row 3: Conta + Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Conta de Destino</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="h-10 rounded-xl border-border/60 bg-muted/30"><SelectValue placeholder="Selecione a conta (Opcional)" /></SelectTrigger>
                <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.bankName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</Label>
              <button type="button" onClick={() => setIsReceived(!isReceived)} className={cn(
                "flex items-center justify-center gap-2 w-full h-10 rounded-xl border text-sm font-semibold transition-all",
                isReceived ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600" : "bg-muted/30 border-border/60 text-muted-foreground"
              )}>
                <span className={cn("w-2 h-2 rounded-full", isReceived ? "bg-emerald-500" : "bg-muted-foreground/40")} />
                {isReceived ? 'Recebido' : 'Pendente'}
              </button>
            </div>
          </div>

          {/* Seção: Recorrência & Observação */}
          <div className="flex items-center gap-2 -mb-2 pt-2">
            <Repeat className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Recorrência</span>
            <div className="flex-1 h-px bg-border/60" />
          </div>
          {/* Row 4: Recorrência + Observação */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recorrência</Label>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setIsRecurring(!isRecurring)} className={cn(
                  "flex items-center justify-center gap-2 h-10 rounded-xl border text-sm font-semibold transition-all flex-1",
                  isRecurring ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600" : "bg-muted/30 border-border/60 text-muted-foreground"
                )}>
                  <span className={cn("w-2 h-2 rounded-full", isRecurring ? "bg-emerald-500" : "bg-muted-foreground/40")} />
                  {isRecurring ? 'Sim' : 'Não'}
                </button>
                {isRecurring && <Input type="number" min="1" value={installments} onChange={e => setInstallments(e.target.value)} className="h-10 w-20 text-center rounded-xl border-border/60 bg-muted/30" />}
              </div>
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Observação</Label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} className="flex w-full rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-sm focus:bg-card resize-none" placeholder="Anotações opcionais..." rows={2} />
            </div>
          </div>

          {/* Seção: Avançado */}
          <div className="flex items-center gap-2 -mb-2 pt-2">
            <Settings2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Opções Avançadas</span>
            <div className="flex-1 h-px bg-border/60" />
          </div>
          {/* Toggles: Agendamento + Controle Visual */}
          <div className="space-y-3 p-4 border rounded-xl bg-muted/20">
            <div className={cn("flex items-center gap-3", isReceived && "opacity-40 pointer-events-none")}>
              <Switch id="income-scheduling" checked={isScheduled} onCheckedChange={setIsScheduled} disabled={isReceived} />
              <Label htmlFor="income-scheduling" className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                <CalendarClock className="h-4 w-4 text-emerald-600" />
                Agendar esta receita
              </Label>
            </div>
            {isScheduled && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200 space-y-1.5 pl-14">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data do Agendamento (Baixa Automática)</Label>
                <DateInputBR value={scheduledDate} onChange={setScheduledDate} className="h-10 rounded-xl border-border/60 bg-muted/30" />
              </div>
            )}
            <div className="border-t border-border/40" />
            <div className={cn("flex items-center gap-3", !canUseExtraControl && "opacity-40")}>
              <Switch id="visual-control-income" checked={excludeFromCalculations} onCheckedChange={setExcludeFromCalculations} disabled={!canUseExtraControl && !income} />
              <Label htmlFor="visual-control-income" className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                {!canUseExtraControl && !income && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                Apenas controle visual (não contabilizar)
              </Label>
            </div>
          </div>

            </div>
          </div>

          {/* Actions */}
          <div className="shrink-0 border-t border-border/40 bg-card p-4 sm:p-6">
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl h-10 px-6 text-sm font-medium">Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-xl min-w-[130px] h-10 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm text-sm font-semibold">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar receita'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>

      {/* Modal Nova Categoria */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl border-0 bg-card shadow-xl">
          <DialogHeader><DialogTitle>Nova categoria de receita</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Ex: Investimentos" className="rounded-xl" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setCategoryDialogOpen(false)}>Cancelar</Button>
            <Button type="button" className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleCreateCategory}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={scopeDialogOpen} onOpenChange={setScopeDialogOpen}>
        <AlertDialogContent className="max-w-xs p-4 gap-3">
          <AlertDialogHeader className="space-y-1">
            <AlertDialogTitle className="text-base">Atualizar recorrência</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              O status de recebimento continua individual em cada parcela.
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

    </Dialog>
  );
}