import { useState, useEffect } from 'react';
import { useIncome } from '@/contexts/IncomeContext';
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
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface IncomeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  income?: Income | null;
}

export default function IncomeForm({ open, onOpenChange, income }: IncomeFormProps) {
  const { addIncome, updateIncome, incomeCategories, incomeSubcategories } = useIncome();
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

      // Validação de Recorrência (Obrigatória)
      // Se for edição de uma receita que é recorrente ou faz parte de uma série, intercepta o salvamento.
      const isRecurringSeries = income && (income.isRecurring || (income as any).recurrenceId || (income as any).recurrence_id);

      if (isRecurringSeries) {
        const hasChanges = 
          incomeData.amount !== income.amount ||
          incomeData.categoryId !== income.categoryId ||
          incomeData.subcategoryId !== (income.subcategoryId || undefined);
        
        if (hasChanges || isRecurringSeries) { // Força a verificação sempre que for recorrente
          setPendingData(incomeData);
          setRecurrenceDialogOpen(true);
          setIsSubmitting(false);
          return;
        }
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
      // @ts-ignore
      await updateIncome(income!.id, { ...pendingData, recurrenceScope: scope });
      toast.success('Receita atualizada!');
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

      <AlertDialog open={recurrenceDialogOpen} onOpenChange={setRecurrenceDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alteração em Receita Recorrente</AlertDialogTitle>
            <AlertDialogDescription>
              Esta receita faz parte de uma série. Como você deseja aplicar as alterações de valor/categoria?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2 py-4">
            <Button variant="outline" className="justify-start" onClick={() => handleRecurrenceUpdate('single')}>
              Apenas esta (Mês atual)
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => handleRecurrenceUpdate('future')}>
              Esta e futuras (A partir de agora)
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => handleRecurrenceUpdate('all')}>
              Todas (Inclusive passadas)
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