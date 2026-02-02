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
import { format, addMonths } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface IncomeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  income?: Income | null;
}

export default function IncomeForm({ open, onOpenChange, income }: IncomeFormProps) {
  const { addIncome, updateIncome, removeIncome, incomeCategories, incomeSubcategories, refreshData } = useIncome();
  const { accounts } = useFinance();
  
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [isReceived, setIsReceived] = useState(true);
  const [isRecurring, setIsRecurring] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [scope, setScope] = useState<'single' | 'future' | 'past' | 'all'>('single');

  const filteredSubcategories = incomeSubcategories.filter(s => s.categoryId === categoryId);
  const selectedCategory = incomeCategories.find(c => c.id === categoryId);

  useEffect(() => {
    if (income) {
      setTitle(income.title);
      setAmount(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(income.amount));
      setDate(format(new Date(income.receiveDate), 'yyyy-MM-dd'));
      setCategoryId(income.categoryId);
      setSubcategoryId(income.subcategoryId || '');
      setAccountId(income.accountId || '');
      setIsReceived(income.isReceived);
      setIsRecurring(income.isRecurring);
      setErrors({});
      setScope('single');
    } else {
      resetForm();
    }
  }, [income, open]);

  const resetForm = () => {
    setTitle('');
    setAmount('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setCategoryId('');
    setSubcategoryId('');
    setAccountId('');
    setIsReceived(true);
    setIsRecurring(false);
    setErrors({});
    setScope('single');
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
    if (!date) newErrors.date = true;
    if (!categoryId) newErrors.categoryId = true;
    if (filteredSubcategories.length > 0 && !subcategoryId) newErrors.subcategoryId = true;

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      if (newErrors.title) toast.error('O campo Descrição é obrigatório.');
      if (newErrors.amount) toast.error('O campo Valor é obrigatório e deve ser maior que zero.');
      if (newErrors.date) toast.error('O campo Data é obrigatório.');
      if (newErrors.categoryId) toast.error('O campo Categoria é obrigatório.');
      if (newErrors.subcategoryId) toast.error('O campo Subcategoria é obrigatório para esta categoria.');
      return false;
    }
    return true;
  };

  const isRecurringSeries = income && (income.isRecurring || income.recurrenceId || (income as any).recurrence_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const numericAmount = parseFloat(amount.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
      
      const incomeData = {
        title,
        amount: numericAmount,
        receiveDate: new Date(date),
        categoryId,
        subcategoryId: subcategoryId || undefined,
        accountId: accountId || undefined,
        isReceived,
        isRecurring,
      };

      if (income) { // Editing an existing income
        if (isRecurringSeries) {
          await handleRecurrenceUpdate(scope, incomeData);
          return;
        }

        // From single to recurring
        if (!isRecurringSeries && isRecurring) {
          await removeIncome(income.id);
          
          const newRecurrenceId = crypto.randomUUID();
          await addIncome({ ...incomeData, recurrenceId: newRecurrenceId });
          
          // Create next 11 entries
          for (let i = 1; i <= 11; i++) {
            const nextDate = addMonths(new Date(date), i);
            await addIncome({ ...incomeData, receiveDate: nextDate, recurrenceId: newRecurrenceId });
          }
          toast.success('Receita transformada em recorrente!');
        } else {
          await updateIncome(income.id, incomeData);
          toast.success('Receita atualizada!');
        }
      } else { // Creating a new income
        if (isRecurring) {
          const newRecurrenceId = crypto.randomUUID();
          await addIncome({ ...incomeData, recurrenceId: newRecurrenceId });
          
          // Create next 11 entries
          for (let i = 1; i <= 11; i++) {
            const nextDate = addMonths(new Date(date), i);
            await addIncome({ ...incomeData, receiveDate: nextDate, recurrenceId: newRecurrenceId });
          }
          toast.success('Receita recorrente criada!');
        } else {
          await addIncome(incomeData);
          toast.success('Receita criada!');
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

  const handleRecurrenceUpdate = async (scope: 'single' | 'future' | 'past' | 'all', data: any) => {
    setIsSubmitting(true);
    try {
      const recurrenceId = income?.recurrenceId || (income as any)?.recurrence_id;
       if (!recurrenceId && scope !== 'single') {
        toast.info("Esta não é uma receita recorrente. Apenas este registro será atualizado.");
        await handleRecurrenceUpdate('single', data);
        return;
      }

      console.log('Filtro utilizado:', recurrenceId, 'Escopo:', scope);

      const dados = {
        title: data.title,
        amount: data.amount,
        category_id: data.categoryId,
        subcategory_id: data.subcategoryId || null,
        account_id: data.accountId || null,
        is_received: data.isReceived,
        is_recurring: data.isRecurring,
      };

      let successMessage = '';

      if (scope === 'single') {
        const singleData = { ...dados, receive_date: data.receiveDate };
        const { error } = await supabase.from('incomes').update(singleData).eq('id', income!.id);
        if (error) throw error;
        successMessage = 'Receita atualizada com sucesso!';

      } else if (scope === 'all') {
        const { error } = await supabase.from('incomes').update(dados).eq('recurrence_id', recurrenceId);
        if (error) throw error;
        successMessage = 'Todas as receitas da série foram atualizadas!';

      } else if (scope === 'past') {
        const { error } = await supabase.from('incomes').update(dados)
          .eq('recurrence_id', recurrenceId)
          .lte('receive_date', format(new Date(data.receiveDate), 'yyyy-MM-dd'));
        if (error) throw error;
        successMessage = 'Receita atual e passadas atualizadas!';
      
      } else if (scope === 'future') {
        const { error } = await supabase.from('incomes').update(dados)
          .eq('recurrence_id', recurrenceId)
          .gte('receive_date', format(new Date(data.receiveDate), 'yyyy-MM-dd'));
        if (error) throw error;
        successMessage = 'Receitas futuras atualizadas com sucesso!';
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

  const handleDelete = async () => {
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
      setDeleteDialogOpen(false);
    }
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

          <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label htmlFor="income-date">Data <span className="text-red-500">*</span></Label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="income-date"
                  type="date" 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)} 
                  className={cn("pl-9", errors.date && "border-red-500", selectedCategory?.color ? `focus-visible:ring-${selectedCategory.color}` : "")}
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="income-title">Descrição <span className="text-red-500">*</span></Label>
            <Input id="income-title" placeholder="Ex: Salário Mensal" value={title} onChange={(e) => setTitle(e.target.value)} className={cn(errors.title && "border-red-500")} />
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
          </div>

          {isRecurringSeries && (
            <div className="space-y-3 pt-2 border-t">
              <Label className="text-base font-medium">Aplicar alterações para:</Label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { value: 'single', label: 'Apenas esta', desc: 'Apenas este registro', icon: Calendar },
                  { value: 'future', label: 'Esta e futuras', desc: 'Deste vencimento em diante', icon: CalendarClock },
                  { value: 'past', label: 'Esta e passadas', desc: 'Do vencimento atual para trás', icon: History },
                  { value: 'all', label: 'Todas', desc: 'Todo o histórico da série', icon: CalendarDays },
                ].map((option) => (
                  <div
                    key={option.value}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:bg-accent",
                      scope === option.value ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card"
                    )}
                    onClick={() => setScope(option.value as any)}
                  >
                    <div className="p-2 bg-muted rounded-full">
                      <option.icon className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-sm">{option.label}</p>
                      <p className="text-xs text-muted-foreground">{option.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {income && (
              <Button type="button" variant="destructive" className="mr-auto" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </Button>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir {scope === 'single' ? 'esta receita' : 'as receitas selecionadas'}?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}