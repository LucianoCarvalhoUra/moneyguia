import { useState, useEffect } from 'react';
import { useIncome } from '@/contexts/IncomeContext';
import { supabase } from '@/integrations/supabase/client';
import { useFinance } from '@/contexts/FinanceContext';
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
import { Income } from '@/types/income';
import { Switch } from '@/components/ui/switch';
import { Loader2, Calendar as CalendarIcon, Calendar, CalendarClock, CalendarDays, History, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, addMonths, getDate, setDate } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface IncomeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  income?: Income | null;
  initialData?: Partial<Income> | null;
}

export default function IncomeForm({ open, onOpenChange, income, initialData }: IncomeFormProps) {
  const { addIncome, updateIncome, removeIncome, incomeCategories, incomeSubcategories, refreshData } = useIncome();
  const { accounts } = useFinance();
  
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [incomeDate, setIncomeDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [receiveDate, setReceiveDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [isReceived, setIsReceived] = useState(true);
  const [isRecurring, setIsRecurring] = useState(false);
  const [installments, setInstallments] = useState('1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scopeDialogOpen, setScopeDialogOpen] = useState(false);
  const [simpleDeleteDialogOpen, setSimpleDeleteDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'save' | 'delete' | null>(null);
  const [pendingData, setPendingData] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const filteredSubcategories = incomeSubcategories.filter(s => s.categoryId === categoryId);
  const selectedCategory = incomeCategories.find(c => c.id === categoryId);

  useEffect(() => {
    if (income) {
      setTitle(income.title);
      setAmount(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(income.amount));
      setIncomeDate(format(new Date((income as any).incomeDate || income.receiveDate), 'yyyy-MM-dd'));
      setReceiveDate(format(new Date(income.receiveDate), 'yyyy-MM-dd'));
      setCategoryId(income.categoryId);
      setSubcategoryId(income.subcategoryId || '');
      setAccountId(income.accountId || '');
      setIsReceived(income.isReceived);
      setIsRecurring(income.isRecurring);
      setErrors({});
    } else if (initialData) {
      setTitle(initialData.title || '');
      setAmount(initialData.amount ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(initialData.amount) : '');
      setIncomeDate((initialData as any).incomeDate ? format(new Date((initialData as any).incomeDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
      setReceiveDate(initialData.receiveDate ? format(new Date(initialData.receiveDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
      setCategoryId(initialData.categoryId || '');
      setSubcategoryId(initialData.subcategoryId || '');
      setAccountId(initialData.accountId || '');
      setIsReceived(initialData.isReceived || false);
      setIsRecurring(initialData.isRecurring || false);
      setErrors({});
    } else {
      resetForm();
    }
  }, [income, initialData, open]);

  const resetForm = () => {
    setTitle('');
    setAmount('');
    setIncomeDate(format(new Date(), 'yyyy-MM-dd'));
    setReceiveDate(format(new Date(), 'yyyy-MM-dd'));
    setCategoryId('');
    setSubcategoryId('');
    setAccountId('');
    setIsReceived(false);
    setIsRecurring(false);
    setInstallments('1');
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

    if (!title.trim()) newErrors.title = true;
    if (numericAmount <= 0) newErrors.amount = true;
    if (!incomeDate) newErrors.incomeDate = true;
    if (!receiveDate) newErrors.receiveDate = true;
    if (!categoryId) newErrors.categoryId = true;
    if (filteredSubcategories.length > 0 && !subcategoryId) newErrors.subcategoryId = true;

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      if (newErrors.title) toast.error('O campo Descrição é obrigatório.');
      if (newErrors.amount) toast.error('O campo Valor é obrigatório e deve ser maior que zero.');
      if (newErrors.incomeDate) toast.error('A Data de Lançamento é obrigatória.');
      if (newErrors.receiveDate) toast.error('A Data de Recebimento é obrigatória.');
      if (newErrors.categoryId) toast.error('O campo Categoria é obrigatório.');
      if (newErrors.subcategoryId) toast.error('O campo Subcategoria é obrigatório para esta categoria.');
      return false;
    }
    return true;
  };

  const isRecurringSeries = income && (income.isRecurring || !!income.recurrenceId || !!(income as any).recurrence_id || !!(income as any).parent_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const numericAmount = parseFloat(amount.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
      const incomeData = {
        title,
        amount: numericAmount,
        incomeDate: new Date(incomeDate),
        receiveDate: new Date(receiveDate),
        categoryId,
        subcategoryId: subcategoryId || undefined,
        accountId: accountId || undefined,
        isReceived,
        isRecurring,
        installments: isRecurring ? parseInt(installments) : undefined,
      };

      console.log('Iniciando salvamento de receita...', incomeData);

      if (income) { // Editing an existing income
        if (isRecurringSeries) {
          setPendingData(incomeData);
          setActionType('save');
          setScopeDialogOpen(true);
          return;
        }
        
        // Direct update for single income
        const { error } = await supabase.from('incomes').update({
            title,
            amount: numericAmount,
            income_date: format(new Date(incomeDate), 'yyyy-MM-dd'),
            receive_date: format(new Date(receiveDate), 'yyyy-MM-dd'),
            category_id: categoryId,
            subcategory_id: subcategoryId || null,
            account_id: accountId || null,
            is_received: isReceived,
            is_recurring: isRecurring,
            installments: isRecurring ? parseInt(installments) : null
        }).eq('id', income.id);

        if (error) throw error;
        toast.success('Alteração salva com sucesso!');

      } else { // Creating a new income
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('incomes').insert([{
            title,
            amount: numericAmount,
            income_date: format(new Date(incomeDate), 'yyyy-MM-dd'),
            receive_date: format(new Date(receiveDate), 'yyyy-MM-dd'),
            category_id: categoryId,
            subcategory_id: subcategoryId || null,
            account_id: accountId || null,
            is_received: isReceived,
            is_recurring: isRecurring,
            installments: isRecurring ? parseInt(installments) : null,
            user_id: user?.id
        }]);

        if (error) throw error;
        toast.success('Receita criada com sucesso!');
      }
      
      await refreshData();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar receita');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecurrenceUpdate = async (scope: 'single' | 'future' | 'past' | 'all', data: any) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      // 1. Update Current Income First
      const commonData = {
        title: data.title,
        amount: data.amount,
        category_id: data.categoryId,
        subcategory_id: data.subcategoryId || null,
        account_id: data.accountId || null,
        is_received: data.isReceived,
        is_recurring: data.isRecurring, // Keep recurring
        installments: data.installments,
      };

      const { error: currentError } = await supabase.from('incomes').update({
        ...commonData,
        receive_date: format(data.receiveDate, 'yyyy-MM-dd'),
        income_date: format(data.incomeDate, 'yyyy-MM-dd')
      }).eq('id', income!.id);

      if (currentError) throw currentError;

      // 2. Logic for Scope
      if (scope !== 'single') {
        const recurrenceId = income?.recurrenceId || (income as any)?.recurrence_id || (income as any)?.parent_id;
        let query = supabase.from('incomes').select('*');
        
        if (recurrenceId) {
          query = query.eq('recurrence_id', recurrenceId);
        } else {
          query = query.eq('title', income!.title).eq('amount', income!.amount);
        }

        if (scope === 'future') {
          query = query.gte('receive_date', format(data.receiveDate, 'yyyy-MM-dd'));
        }

        const { data: relatedIncomes } = await query;

        if (relatedIncomes && relatedIncomes.length > 0) {
          // 3. Conversion from Recurring to Single
          if (!data.isRecurring && scope === 'all') {
             const futureToDelete = relatedIncomes.filter((i: any) => new Date(i.receive_date) > new Date(data.receiveDate));
             const idsToDelete = futureToDelete.map((i: any) => i.id);
             if (idsToDelete.length > 0) {
               await supabase.from('incomes').delete().in('id', idsToDelete);
             }
             await supabase.from('incomes').update({ recurrence_id: null, is_recurring: false }).eq('id', income!.id);
          } else {
             // Batch Update
             const newDay = getDate(data.receiveDate);
             const updates = relatedIncomes.map((inc: any) => {
               if (inc.id === income!.id) return null;

               let newDate = new Date(inc.receive_date);
               if (getDate(new Date(income!.receiveDate)) !== newDay) {
                 newDate = setDate(newDate, newDay);
               }

               return {
                 ...commonData,
                 id: inc.id,
                 user_id: inc.user_id,
                 recurrence_id: recurrenceId,
                 receive_date: format(newDate, 'yyyy-MM-dd'),
                 income_date: format(newDate, 'yyyy-MM-dd')
               };
             }).filter(Boolean);

             if (updates.length > 0) {
               const { error: batchError } = await supabase.from('incomes').upsert(updates);
               if (batchError) throw batchError;
             }
          }
        }
      }
      
      toast.success('Alteração salva com sucesso!');
      await refreshData();
      onOpenChange(false);

    } catch (error: any) {
      console.error('Erro ao atualizar:', error);
      toast.error('Erro ao atualizar receita');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = () => {
    if (!income) return;
    if (isRecurringSeries) {
      setActionType('delete');
      setScopeDialogOpen(true);
    } else {
      setSimpleDeleteDialogOpen(true);
    }
  };

  const performDelete = async (scope: 'single' | 'future' | 'past' | 'all') => {
    if (!income) return;
    setIsSubmitting(true);
    try {
      const { recurrenceId, id, receiveDate } = income;
      let query;

      if (scope === 'single' || !recurrenceId) {
        query = supabase.from('incomes').delete().eq('id', id);
      } else if (scope === 'future') {
        query = supabase.from('incomes').delete().eq('recurrence_id', recurrenceId).gte('receive_date', format(new Date(receiveDate), 'yyyy-MM-dd'));
      } else if (scope === 'past') {
        query = supabase.from('incomes').delete().eq('recurrence_id', recurrenceId).lte('receive_date', format(new Date(receiveDate), 'yyyy-MM-dd'));
      } else { // 'all'
        query = supabase.from('incomes').delete().eq('recurrence_id', recurrenceId);
      }

      const { error } = await query;
      if (error) throw error;

      toast.success('Receita(s) excluída(s) com sucesso!');
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
    if (!income) return;
    setIsSubmitting(true);
    try {
      await removeIncome(income.id);
      toast.success('Receita excluída com sucesso!');
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
          <DialogTitle>{income ? 'Editar Receita' : 'Nova Receita'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
           <div className="space-y-2">
            <Label htmlFor="income-category">Categoria <span className="text-red-500">*</span></Label>
            <Select value={categoryId} onValueChange={(value) => { setCategoryId(value); setSubcategoryId(''); setErrors(prev => ({...prev, categoryId: false, subcategoryId: false})); }}>
              <SelectTrigger id="income-category" className={cn(errors.categoryId && "border-red-500")}>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {incomeCategories.map((cat) => (
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
              <Label htmlFor="income-subcategory">Subcategoria <span className="text-red-500">*</span></Label>
              <Select value={subcategoryId} onValueChange={(value) => { setSubcategoryId(value); setErrors(prev => ({...prev, subcategoryId: false})); }}>
                <SelectTrigger id="income-subcategory" className={cn(errors.subcategoryId && "border-red-500")}>
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
            <Label htmlFor="income-title">Descrição <span className="text-red-500">*</span></Label>
            <Input id="income-title" placeholder="Ex: Salário Mensal" value={title} onChange={(e) => setTitle(e.target.value)} className={cn(errors.title && "border-red-500")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="income-amount">Valor <span className="text-red-500">*</span></Label>
            <Input 
              id="income-amount"
              placeholder="R$ 0,00" 
              value={amount} 
              onChange={(e) => setAmount(formatCurrencyInput(e.target.value))}
              className={cn("text-right font-medium", errors.amount && "border-red-500", selectedCategory?.color ? `focus-visible:ring-${selectedCategory.color}` : "")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="income-date">Data de Lançamento (Hoje) <span className="text-red-500">*</span></Label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="income-date"
                  type="date" 
                  value={incomeDate} 
                  onChange={(e) => setIncomeDate(e.target.value)} 
                  className={cn("pl-9", errors.incomeDate && "border-red-500")}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="receive-date">Data de Recebimento <span className="text-red-500">*</span></Label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="receive-date"
                  type="date" 
                  value={receiveDate} 
                  onChange={(e) => setReceiveDate(e.target.value)} 
                  className={cn("pl-9", errors.receiveDate && "border-red-500", selectedCategory?.color ? `focus-visible:ring-${selectedCategory.color}` : "")}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
              <Label>Conta de Destino / Recebimento</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.bankName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border rounded-md p-4 bg-muted/20">
            <div className="flex flex-col gap-2">
              <Label htmlFor="status-switch" className="text-sm font-medium">Status do Recebimento</Label>
              <div className="flex items-center justify-between bg-background p-2 rounded-md border">
                <span className="text-sm text-muted-foreground">{isReceived ? 'Recebido' : 'Pendente'}</span>
                <Switch id="status-switch" checked={isReceived} onCheckedChange={setIsReceived} />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="recurring-income" className="text-sm font-medium">Recorrência</Label>
              <div className="flex items-center justify-between bg-background p-2 rounded-md border">
                <span className="text-sm text-muted-foreground">{isRecurring ? 'Sim' : 'Não'}</span>
                <Switch id="recurring-income" checked={isRecurring} onCheckedChange={setIsRecurring} />
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
            {income && (
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
              Esta receita é recorrente. Como deseja aplicar a {actionType === 'save' ? 'alteração' : 'exclusão'}?
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
            <AlertDialogDescription>Tem certeza que deseja excluir esta receita?</AlertDialogDescription>
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