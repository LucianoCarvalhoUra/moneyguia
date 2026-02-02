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
import { Loader2, Calendar as CalendarIcon, Calendar, CalendarClock, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { format, addMonths } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface IncomeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  income?: Income | null;
}

export default function IncomeForm({ open, onOpenChange, income }: IncomeFormProps) {
  const { addIncome, updateIncome, removeIncome, incomeCategories, incomeSubcategories } = useIncome();
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
  const [recurrenceDialogOpen, setRecurrenceDialogOpen] = useState(false);
  const [pendingData, setPendingData] = useState<any>(null);

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
  };

  const formatCurrencyInput = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    const floatValue = Number(numericValue) / 100;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(floatValue);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount || !date || !categoryId) {
      toast.error('Preencha os campos obrigatórios');
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

      // Etapa 2: Interceptar o Submit para Recorrência
      const isRecurringSeries = income && (income.isRecurring || (income as any).recurrenceId || (income as any).recurrence_id);

      // Caso 1: Edição de uma série já existente (Modal de Confirmação)
      if (isRecurringSeries) {
        if (income) {
          setPendingData(incomeData);
          setRecurrenceDialogOpen(true);
          setIsSubmitting(false);
          return;
        }
      }

      // Caso 2: Transformação de Única para Recorrente (Geração Automática)
      if (income && !isRecurringSeries && isRecurring) {
        // Remove a receita antiga
        await removeIncome(income.id);
        
        // Gera ID de recorrência
        const newRecurrenceId = crypto.randomUUID();
        
        // Cria a atual
        await addIncome({ ...incomeData, recurrenceId: newRecurrenceId } as any);
        
        // Loop para futuras (12 meses padrão para receitas recorrentes)
        const baseDate = new Date(date);
        for (let i = 1; i <= 11; i++) {
          const nextDate = addMonths(baseDate, i);
          await addIncome({ ...incomeData, receiveDate: nextDate, recurrenceId: newRecurrenceId } as any);
        }

        toast.success('Receita transformada em recorrente e registros futuros gerados!');
        onOpenChange(false);
        return;
      }

      if (income) {
        await updateIncome(income.id, incomeData);
        toast.success('Receita atualizada!');
      } else {
        await addIncome(incomeData);
        toast.success('Receita criada!');
      }
      onOpenChange(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecurrenceUpdate = async (scope: 'single' | 'future' | 'all') => {
    setIsSubmitting(true);
    try {
      const recurrenceId = (income as any).recurrenceId || (income as any).recurrence_id;

      if (scope === 'all' && recurrenceId) {
        // Update ALL records in the series
        const { error } = await (supabase
          .from('incomes') as any)
          // Não atualizamos datas para não mover todo o histórico para o mesmo dia
          .update({
            title: pendingData.title,
            amount: pendingData.amount,
            category_id: pendingData.categoryId,
            subcategory_id: pendingData.subcategoryId,
            account_id: pendingData.accountId,
            is_received: pendingData.isReceived,
          } as any)
          .eq('recurrence_id', recurrenceId);

        if (error) throw error;
        toast.success('Todas as receitas da série foram atualizadas!');
        // Atualiza o item atual na interface
        await updateIncome(income!.id, pendingData);
      } else if (scope === 'future' && recurrenceId) {
        // Update THIS and FUTURE records
        const { error } = await (supabase
          .from('incomes') as any)
          .update({
            title: pendingData.title,
            amount: pendingData.amount,
            category_id: pendingData.categoryId,
            subcategory_id: pendingData.subcategoryId,
            account_id: pendingData.accountId,
            is_received: pendingData.isReceived,
          } as any)
          .eq('recurrence_id', recurrenceId)
          .gte('receive_date', format(new Date(pendingData.receiveDate), 'yyyy-MM-dd'));

        if (error) throw error;
        toast.success('Receita atual e futuras atualizadas!');
        // Atualiza o item atual na interface
        await updateIncome(income!.id, pendingData);
      } else {
        await updateIncome(income!.id, { ...pendingData, recurrenceScope: scope });
        toast.success('Receita atualizada!');
      }
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao atualizar receita');
    } finally {
      setIsSubmitting(false);
      setRecurrenceDialogOpen(false);
    }
  };

  const filteredSubcategories = incomeSubcategories.filter(s => s.categoryId === categoryId);
  const selectedCategory = incomeCategories.find(c => c.id === categoryId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{income ? 'Editar Receita' : 'Nova Receita'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
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
              <Label>Subcategoria</Label>
              <Select value={subcategoryId} onValueChange={setSubcategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione (Opcional)" />
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
              <Label>Valor</Label>
              <Input 
                placeholder="R$ 0,00" 
                value={amount} 
                onChange={(e) => setAmount(formatCurrencyInput(e.target.value))}
                className={cn("text-right font-medium", selectedCategory?.color ? `focus-visible:ring-${selectedCategory.color}` : "")}
              />
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="date" 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)} 
                  className={cn("pl-9", selectedCategory?.color ? `focus-visible:ring-${selectedCategory.color}` : "")}
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

          {/* Bloco de Controle (Agrupado) */}
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

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input placeholder="Ex: Salário Mensal" value={title} onChange={(e) => setTitle(e.target.value)} />
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

      {/* Etapa 1: Criar o Modal de Escolha */}
      <AlertDialog open={recurrenceDialogOpen} onOpenChange={setRecurrenceDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alteração em Recorrência</AlertDialogTitle>
            <AlertDialogDescription>
              Esta receita é recorrente. Como deseja aplicar as alterações?
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