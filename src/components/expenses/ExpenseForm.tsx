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
import { Loader2, Trash2, Calendar, CalendarClock, CalendarDays, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { addMonths, format } from 'date-fns';
import { getPlanLimit, getRecurrenceQuotaStatus } from '@/lib/recurrenceQuota';

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
  const [pendingData, setPendingData] = useState<any>(null);
  const [excludeFromCalculations, setExcludeFromCalculations] = useState(false);
  const [recurrenceUsage, setRecurrenceUsage] = useState(0);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [subcategoryDialogOpen, setSubcategoryDialogOpen] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [observation, setObservation] = useState('');

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
        setExcludeFromCalculations((dataToLoad as any).excludeFromCalculations || false);
        setObservation((dataToLoad as any).observation || '');
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

  const handleRecurrenceUpdate = async (scope: 'single' | 'future' | 'all') => {
    if (!expense || !pendingData) return;
    
    setIsSubmitting(true);
    try {
      // 1. Atualiza a despesa atual (sempre) para garantir que datas e dados estejam corretos
      const { error: singleError } = await supabase.from('expenses').update(pendingData).eq('id', expense.id);
      if (singleError) throw singleError;

      if (scope !== 'single') {
        const recurrenceId = expense.recurrenceId || (expense as any).recurrence_id;
        
        if (!recurrenceId) {
          toast.error("Não foi possível identificar a série de recorrência.");
          setIsSubmitting(false);
          return;
        }
        
        // Remove date fields from batch to preserve individual dates
        const { due_date, expense_date, ...batchData } = pendingData;
        let query = supabase.from('expenses').update(batchData).eq('recurrence_id', recurrenceId).neq('id', expense.id);

        if (scope === 'future') {
          const dueDate = pendingData.due_date;
          query = query.gte('due_date', dueDate);
        }

        const { error } = await query;
        if (error) throw error;
      }

      toast.success('Despesas atualizadas com sucesso!');
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
      if (!expense && isRecurring && user?.id) {
        const quota = await getRecurrenceQuotaStatus(user.id, subscriptionPlan as string);
        setRecurrenceUsage(quota.used);

        if (quota.exceededByNewRecurring) {
          toast.error('Limite de Recorrências Atingido', {
            description: `Seu plano atual permite apenas ${quota.limit} lançamentos recorrentes. Faça o upgrade para liberar mais!`,
            action: {
              label: 'Ver planos',
              onClick: () => navigate('/plans'),
            },
          });
          setIsSubmitting(false);
          return;
        }
      }

      const authUser = (await supabase.auth.getUser()).data.user;
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
        user_id: authUser?.id,
        exclude_from_calculations: canUseExtraControl ? excludeFromCalculations : false,
        observation: observation || null,
      };

      if (expense) {
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
      <DialogContent className="sm:max-w-2xl gap-0 overflow-hidden rounded-2xl border-0 bg-card p-0 shadow-xl">
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 border-b px-6 py-4 bg-gradient-to-r from-primary/5 to-transparent">
          <div>
            <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
              {expense ? 'Editar Despesa' : 'Nova Despesa'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">Preencha os detalhes da transação</DialogDescription>
          </div>
          {expense && (
            <Button type="button" variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 h-8 px-2 rounded-lg" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-1" /> Excluir
            </Button>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Row 1: Descrição + Valor */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Descrição</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} className="h-10 rounded-xl border-border/60 bg-muted/30 focus:bg-card transition-colors" placeholder="Ex: Supermercado" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Valor</Label>
              <Input value={amount} onChange={e => setAmount(formatCurrencyInput(e.target.value))} className="h-10 rounded-xl border-border/60 bg-muted/30 focus:bg-card text-right font-semibold transition-colors" placeholder="R$ 0,00" />
            </div>
          </div>

          {/* Row 2: Categoria + Subcategoria + Vencimento */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Categoria</Label>
              <Select value={categoryId} onValueChange={handleCategorySelectChange}>
                <SelectTrigger className="h-10 rounded-xl border-border/60 bg-muted/30"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2"><CategoryIcon iconName={c.icon} className={`w-4 h-4 text-${c.color}`} /> {c.name}</div>
                    </SelectItem>
                  ))}
                  <SelectItem value={ADD_CATEGORY_OPTION} className="border-t mt-1 pt-2 font-medium text-primary">+ Nova categoria</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subcategoria</Label>
              <Select value={subcategoryId} onValueChange={handleSubcategorySelectChange} disabled={!categoryId}>
                <SelectTrigger className="h-10 rounded-xl border-border/60 bg-muted/30"><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>
                  {filteredSubcategories.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  <SelectItem value={ADD_SUBCATEGORY_OPTION} className="border-t mt-1 pt-2 font-medium text-primary">+ Nova subcategoria</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vencimento</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="h-10 rounded-xl border-border/60 bg-muted/30" />
            </div>
          </div>

          {/* Row 3: Pagamento + Status + Recorrência */}
          <div className="grid grid-cols-3 gap-4">
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
              ) : (
                <>
                  <Label className={cn("text-xs font-semibold uppercase tracking-wider text-muted-foreground", !isPaid && "opacity-40")}>Data Pagamento</Label>
                  <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} disabled={!isPaid} className="h-10 rounded-xl border-border/60 bg-muted/30" />
                </>
              )}
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

          {/* Row 4: Recorrência */}
          <div className="grid grid-cols-3 gap-4">
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
            <div className="col-span-2 space-y-1.5">
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

          {/* Bottom: Visual control + Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-border/40">
            <div className={cn("flex items-center space-x-2", !canUseExtraControl && "opacity-40")}>
              <Switch id="visual-control" checked={excludeFromCalculations} onCheckedChange={setExcludeFromCalculations} disabled={!canUseExtraControl} />
              <Label htmlFor="visual-control" className="text-xs font-normal text-muted-foreground cursor-pointer flex items-center gap-1">
                {!canUseExtraControl && <Lock className="w-3 h-3" />}
                Apenas controle visual
              </Label>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl h-9 px-5 text-sm">Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-xl min-w-[110px] h-9 bg-primary hover:bg-primary/90 shadow-sm">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
              </Button>
            </div>
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









