import { useState, useEffect } from 'react';
import { useIncome } from '@/contexts/IncomeContext';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Income } from '@/types/income';
import { CategoryIcon } from '@/components/CategoryIcon';

interface IncomeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  income?: Income | null;
}

export default function IncomeForm({ open, onOpenChange, income }: IncomeFormProps) {
  const { 
    addIncome, 
    updateIncome, 
    incomeCategories, 
    incomeSubcategories 
  } = useIncome();
  const { accounts } = useFinance();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('none');
  const [receiveDate, setReceiveDate] = useState<Date | undefined>(new Date());
  const [isReceived, setIsReceived] = useState(false);
  const [accountId, setAccountId] = useState<string>('none');
  const [isRecurring, setIsRecurring] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (income) {
      setTitle(income.title);
      setAmount(income.amount.toString());
      setCategoryId(income.categoryId);
      setSubcategoryId(income.subcategoryId || 'none');
      setReceiveDate(new Date(income.receiveDate));
      setIsReceived(income.isReceived);
      setAccountId(income.accountId || 'none');
      setIsRecurring(income.isRecurring);
    } else {
      resetForm();
    }
  }, [income, open]);

  const resetForm = () => {
    setTitle('');
    setAmount('');
    setCategoryId('');
    setSubcategoryId('none');
    setReceiveDate(new Date());
    setIsReceived(false);
    setAccountId('none');
    setIsRecurring(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !amount || !categoryId || !receiveDate) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);
    try {
      const incomeData = {
        title,
        amount: parseFloat(amount.replace(',', '.')),
        categoryId,
        subcategoryId: subcategoryId === 'none' ? null : subcategoryId,
        receiveDate: receiveDate,
        isReceived,
        accountId: accountId === 'none' ? null : accountId,
        isRecurring,
      };

      if (income) {
        await updateIncome(income.id, incomeData);
        toast.success('Receita atualizada com sucesso!');
      } else {
        await addIncome(incomeData);
        toast.success('Receita criada com sucesso!');
      }
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar receita');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSubcategories = incomeSubcategories.filter(s => s.categoryId === categoryId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{income ? 'Editar Receita' : 'Nova Receita'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Categoria */}
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {incomeCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <CategoryIcon iconName={cat.icon} className={cn("w-4 h-4", `text-${cat.color}`)} />
                      <span>{cat.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 2. Subcategoria */}
          {filteredSubcategories.length > 0 && (
            <div className="space-y-2">
              <Label>Subcategoria</Label>
              <Select value={subcategoryId} onValueChange={setSubcategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione (Opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {filteredSubcategories.map((sub) => (
                    <SelectItem key={sub.id} value={sub.id}>
                      {sub.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 3. Descrição */}
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input 
              placeholder="Ex: Salário Mensal" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Demais Campos */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                <Input 
                  type="number" 
                  step="0.01" 
                  className="pl-9" 
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !receiveDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {receiveDate ? format(receiveDate, "dd/MM/yyyy", { locale: ptBR }) : <span>Selecione</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={receiveDate}
                    onSelect={setReceiveDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <Label className="cursor-pointer" htmlFor="is-received">Recebido?</Label>
            <Switch id="is-received" checked={isReceived} onCheckedChange={setIsReceived} />
          </div>

          <div className="space-y-2">
            <Label>Conta de Destino</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Selecione...</SelectItem>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.bankName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <Label className="cursor-pointer" htmlFor="is-recurring">É recorrente?</Label>
            <Switch id="is-recurring" checked={isRecurring} onCheckedChange={setIsRecurring} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
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