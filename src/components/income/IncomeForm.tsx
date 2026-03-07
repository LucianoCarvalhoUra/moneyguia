import { useState, useEffect } from 'react';
import { useIncome } from '@/contexts/IncomeContext';
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
import { Income } from '@/types/income';
import { Loader2, Trash2, Calendar, CalendarClock, CalendarDays, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { getPlanLimit, getRecurrenceQuotaStatus } from '@/lib/recurrenceQuota';

interface IncomeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  income?: Income | null;
  initialData?: Partial<Income> | null;
}

export default function IncomeForm({ open, onOpenChange, income, initialData }: IncomeFormProps) {
  const navigate = useNavigate();
  const { hasFeatureAccess, subscriptionPlan, user } = useAuth();
  const { refreshData, incomeCategories, incomeSubcategories, removeIncome, addIncome, updateIncome, addIncomeCategory, addIncomeSubcategory } = useIncome();
  const canUseExtraControl = hasFeatureAccess('extra_control');
  const recurrencePlanLimit = getPlanLimit(subscriptionPlan as string);
  const ADD_CATEGORY_OPTION = '__add_new_income_category__';
  const ADD_SUBCATEGORY_OPTION = '__add_new_income_subcategory__';
  
  // --- State ---
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [receiveDate, setReceiveDate] = useState('');
  const [amount, setAmount] = useState('');
  const [isReceived, setIsReceived] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [excludeFromCalculations, setExcludeFromCalculations] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scopeDialogOpen, setScopeDialogOpen] = useState(false);
  const [pendingData, setPendingData] = useState<any>(null);
  const [recurrenceUsage, setRecurrenceUsage] = useState(0);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [subcategoryDialogOpen, setSubcategoryDialogOpen] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [observation, setObservation] = useState('');
  const [showErrors, setShowErrors] = useState(false);

  // --- Helpers ---
  const formatToInput = (dateVal: any) => {
    if (!dateVal) return "";
    if (dateVal instanceof Date) return format(dateVal, 'yyyy-MM-dd');
    const str = String(dateVal);
    return str.includes('T') ? str.split('T')[0] : str;
  };

  const safeSubcategories = incomeSubcategories || [];

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
      const dataToLoad = income || initialData;
      
      if (dataToLoad) {
        setDescription(dataToLoad.title || '');
        
        const catId = dataToLoad.categoryId || (dataToLoad as any).category_id || '';
        setCategoryId(catId);
        setSubcategoryId(dataToLoad.subcategoryId || (dataToLoad as any).subcategory_id || '');
        
        setReceiveDate(dataToLoad.receiveDate ? formatToInput(dataToLoad.receiveDate) : today);
        setAmount(dataToLoad.amount ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dataToLoad.amount) : '');
        setIsReceived(dataToLoad.isReceived || false);
        setIsRecurring(dataToLoad.isRecurring || false);
        setExcludeFromCalculations((dataToLoad as any).excludeFromCalculations || (dataToLoad as any).exclude_from_calculations || false);
        setObservation((dataToLoad as any).description || '');
      } else {
        // Reset
        setDescription('');
        setCategoryId('');
        setSubcategoryId('');
        setReceiveDate(today);
        setAmount('');
        setIsReceived(false);
        setIsRecurring(false);
        setExcludeFromCalculations(false);
        setObservation('');
        setShowErrors(false);
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

  const handleDelete = async () => {
    if (!income) return;
    if (!confirm('Tem certeza que deseja excluir esta receita?')) return;
    
    setIsSubmitting(true);
    try {
      await removeIncome(income.id);
      await refreshData();
      toast.success('Receita excluida e sincronizada com o banco.');
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

    const created = await addIncomeCategory({
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

    const created = await addIncomeSubcategory({
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
    if (!income || !pendingData) return;
    
    setIsSubmitting(true);
    try {
      // 1. Atualiza a receita atual
      const { error: singleError } = await supabase.from('incomes').update(pendingData).eq('id', income.id);
      if (singleError) throw singleError;

      if (scope !== 'single') {
        const recurrenceId = income.recurrenceId || (income as any).recurrence_id;
        
        if (!recurrenceId) {
          toast.error("Não foi possível identificar a série de recorrência.");
          setIsSubmitting(false);
          return;
        }
        
        // Remove date fields from batch to preserve individual dates
        const { receive_date, ...batchData } = pendingData;
        let query = supabase.from('incomes').update(batchData).eq('recurrence_id', recurrenceId).neq('id', income.id);

        if (scope === 'future') {
          const anchorDate = pendingData.receive_date;
          query = query.gte('receive_date', anchorDate);
        }

        const { error } = await query;
        if (error) throw error;
      }

      await refreshData();
      toast.success('Receitas atualizadas e sincronizadas com o banco.');
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
    if (!description || !categoryId || !receiveDate || numericAmount <= 0) {
      setShowErrors(true);
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    setShowErrors(false);

    setIsSubmitting(true);
    try {
      if (!income && isRecurring && user?.id) {
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

      const payload = {
        title: description,
        amount: numericAmount,
        receive_date: receiveDate,
        category_id: categoryId,
        subcategory_id: subcategoryId || null,
        is_received: isReceived,
        is_recurring: isRecurring,
        exclude_from_calculations: canUseExtraControl ? excludeFromCalculations : false,
        description: observation || null,
      };

      if (income) {
        if (income.isRecurring) {
          setPendingData(payload);
          setScopeDialogOpen(true);
          setIsSubmitting(false);
          return;
        }

        await updateIncome(income.id, {
          title: description,
          amount: numericAmount,
          receiveDate: new Date(receiveDate),
          categoryId,
          subcategoryId: subcategoryId || undefined,
          isReceived,
          isRecurring,
          excludeFromCalculations: canUseExtraControl ? excludeFromCalculations : false,
        });
      } else {
        await addIncome({
          title: description,
          amount: numericAmount,
          receiveDate: new Date(receiveDate),
          categoryId,
          subcategoryId: subcategoryId || undefined,
          isReceived,
          isRecurring,
          excludeFromCalculations: canUseExtraControl ? excludeFromCalculations : false,
        });
      }

      await refreshData();
      toast.success(
        income
          ? 'Receita atualizada e sincronizada com o banco.'
          : 'Receita salva e sincronizada com o banco.',
      );
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] gap-0 overflow-hidden rounded-2xl border-0 bg-card p-0 shadow-xl">
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 border-b px-6 py-4 bg-gradient-to-r from-primary/5 to-transparent">
          <div>
            <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
              {income ? 'Editar Receita' : 'Nova Receita'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">Preencha os detalhes da transação</DialogDescription>
          </div>
          {income && (
            <Button type="button" variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 h-8 px-2 rounded-lg" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-1" /> Excluir
            </Button>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Row 1: Descrição + Valor */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className={cn("text-xs font-semibold uppercase tracking-wider", showErrors && !description ? "text-destructive" : "text-muted-foreground")}>Descrição *</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} className={cn("h-10 rounded-xl border-border/60 bg-muted/30 focus:bg-card transition-colors", showErrors && !description && "border-destructive ring-1 ring-destructive/30")} placeholder="Ex: Salário Mensal" />
              {showErrors && !description && <span className="text-xs text-destructive">Campo obrigatório</span>}
            </div>
            <div className="space-y-1.5">
              <Label className={cn("text-xs font-semibold uppercase tracking-wider", showErrors && (parseFloat(amount.replace(/[^\d,]/g, '').replace(',', '.')) || 0) <= 0 ? "text-destructive" : "text-muted-foreground")}>Valor *</Label>
              <Input value={amount} onChange={e => setAmount(formatCurrencyInput(e.target.value))} className={cn("h-10 rounded-xl border-border/60 bg-muted/30 focus:bg-card text-right font-semibold transition-colors", showErrors && (parseFloat(amount.replace(/[^\d,]/g, '').replace(',', '.')) || 0) <= 0 && "border-destructive ring-1 ring-destructive/30")} placeholder="R$ 0,00" />
              {showErrors && (parseFloat(amount.replace(/[^\d,]/g, '').replace(',', '.')) || 0) <= 0 && <span className="text-xs text-destructive">Campo obrigatório</span>}
            </div>
          </div>

          {/* Row 2: Categoria + Subcategoria + Data */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className={cn("text-xs font-semibold uppercase tracking-wider", showErrors && !categoryId ? "text-destructive" : "text-muted-foreground")}>Categoria *</Label>
              <Select value={categoryId} onValueChange={handleCategorySelectChange}>
                <SelectTrigger className={cn("h-10 rounded-xl border-border/60 bg-muted/30", showErrors && !categoryId && "border-destructive ring-1 ring-destructive/30")}><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {incomeCategories.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2"><CategoryIcon iconName={c.icon} className={`w-4 h-4 text-${c.color}`} /> {c.name}</div>
                    </SelectItem>
                  ))}
                  <SelectItem value={ADD_CATEGORY_OPTION} className="border-t mt-1 pt-2 font-medium text-primary">+ Nova categoria</SelectItem>
                </SelectContent>
              </Select>
              {showErrors && !categoryId && <span className="text-xs text-destructive">Campo obrigatório</span>}
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
              <Label className={cn("text-xs font-semibold uppercase tracking-wider", showErrors && !receiveDate ? "text-destructive" : "text-muted-foreground")}>Data de Recebimento *</Label>
              <Input type="date" value={receiveDate} onChange={e => setReceiveDate(e.target.value)} className={cn("h-10 rounded-xl border-border/60 bg-muted/30", showErrors && !receiveDate && "border-destructive ring-1 ring-destructive/30")} />
              {showErrors && !receiveDate && <span className="text-xs text-destructive">Campo obrigatório</span>}
            </div>
          </div>

          {/* Row 3: Status + Recorrência + Observação */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</Label>
              <button type="button" onClick={() => setIsReceived(!isReceived)} className={cn(
                "flex items-center justify-center gap-2 w-full h-10 rounded-xl border text-sm font-semibold transition-all",
                isReceived ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted/30 border-border/60 text-muted-foreground"
              )}>
                <span className={cn("w-2 h-2 rounded-full", isReceived ? "bg-primary" : "bg-muted-foreground/40")} />
                {isReceived ? 'Recebido' : 'Pendente'}
              </button>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recorrência</Label>
              <button type="button" onClick={() => setIsRecurring(!isRecurring)} className={cn(
                "flex items-center justify-center gap-2 w-full h-10 rounded-xl border text-sm font-semibold transition-all",
                isRecurring ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted/30 border-border/60 text-muted-foreground"
              )}>
                <span className={cn("w-2 h-2 rounded-full", isRecurring ? "bg-primary" : "bg-muted-foreground/40")} />
                {isRecurring ? 'Sim' : 'Não'}
              </button>
              {!income && recurrencePlanLimit.limit === 2 && (
                <p className="text-[10px] text-muted-foreground">{recurrenceUsage}/2 recorrências</p>
              )}
            </div>
            <div className="space-y-1.5">
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
              <Switch id="income-visual-control" checked={excludeFromCalculations} onCheckedChange={setExcludeFromCalculations} disabled={!canUseExtraControl} />
              <Label htmlFor="income-visual-control" className="text-xs font-normal text-muted-foreground cursor-pointer flex items-center gap-1">
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
            <DialogDescription>Digite o nome da categoria para receitas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="new-income-category">Nome</Label>
            <Input id="new-income-category" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Ex: Comissões" className="rounded-xl" />
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
            <Label htmlFor="new-income-subcategory">Nome</Label>
            <Input id="new-income-subcategory" value={newSubcategoryName} onChange={(e) => setNewSubcategoryName(e.target.value)} placeholder="Ex: Cliente recorrente" className="rounded-xl" />
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
            <AlertDialogDescription>Esta é uma receita recorrente. Como deseja aplicar as alterações?</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2 py-4">
            <Button variant="outline" className="justify-start h-auto py-3 px-4" onClick={() => handleRecurrenceUpdate('single')}>
              <Calendar className="w-4 h-4 mr-3 text-muted-foreground" />
              <div className="text-left">
                <div className="font-medium">Apenas esta</div>
                <div className="text-xs text-muted-foreground">Alterar somente a receita atual</div>
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







