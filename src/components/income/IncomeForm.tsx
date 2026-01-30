import { useState, useEffect } from 'react';
import { useIncome } from '@/contexts/IncomeContext';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CategoryIcon } from '@/components/CategoryIcon';
import { cn } from '@/lib/utils';
import { Income } from '@/types/income';
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (income) {
      setTitle(income.title);
      setAmount(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(income.amount));
      setDate(format(new Date(income.receiveDate), 'yyyy-MM-dd'));
      setCategoryId(income.categoryId);
      setSubcategoryId(income.subcategoryId || '');
      setAccountId(income.accountId || '');
      setIsReceived(income.isReceived);
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
        isRecurring: false,
      };

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

          <div className="space-y-2">
            <Label>Conta de Destino (Opcional)</Label>
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
    </Dialog>
  );
}