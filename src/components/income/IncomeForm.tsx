import { useState, useEffect } from 'react';
import { useIncome } from '@/contexts/IncomeContext';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Income } from '@/types/income';
import { toast } from 'sonner';

interface IncomeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  income?: Income;
}

export default function IncomeForm({ open, onOpenChange, income }: IncomeFormProps) {
  const { incomeCategories, addIncome, updateIncome } = useIncome();
  const { accounts } = useFinance();
  const isEditing = !!income;

  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [receiveDate, setReceiveDate] = useState<Date>(new Date());
  const [description, setDescription] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [accountId, setAccountId] = useState('');

  const resetFormFields = () => {
    setCategoryId(incomeCategories.length > 0 ? incomeCategories[0].id : '');
    setTitle('');
    setAmount('');
    setReceiveDate(new Date());
    setDescription('');
    setIsRecurring(false);
    setAccountId('');
  };

  useEffect(() => {
    if (income) {
      setCategoryId(income.categoryId || '');
      setTitle(income.title || '');
      setAmount(income.amount?.toString() || '');
      setReceiveDate(income.receiveDate ? new Date(income.receiveDate) : new Date());
      setDescription(income.description || '');
      setIsRecurring(income.isRecurring || false);
      setAccountId(income.accountId || '');
    } else if (open) {
      resetFormFields();
    }
  }, [income, open, incomeCategories]);

  useEffect(() => {
    if (!categoryId && incomeCategories.length > 0) {
      setCategoryId(incomeCategories[0].id);
    }
  }, [incomeCategories, categoryId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const amountNumber = parseFloat(amount.replace(',', '.'));
    if (isNaN(amountNumber) || amountNumber <= 0) {
      toast.error('Informe um valor válido');
      return;
    }

    if (!title.trim()) {
      toast.error('Informe um título');
      return;
    }

    if (!categoryId) {
      toast.error('Selecione uma categoria');
      return;
    }

    const incomeData = {
      categoryId,
      title: title.trim(),
      amount: amountNumber,
      receiveDate,
      description: description || undefined,
      isRecurring,
      accountId: accountId || undefined,
    };

    if (isEditing && income) {
      updateIncome(income.id, incomeData);
      toast.success('Receita atualizada com sucesso!');
    } else {
      addIncome(incomeData);
      toast.success(isRecurring ? 'Receitas recorrentes cadastradas!' : 'Receita cadastrada com sucesso!');
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEditing ? 'Editar Receita' : 'Nova Receita'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              placeholder="Ex: Salário Mensal"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {incomeCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <span className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      {cat.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Valor (R$)</Label>
            <Input
              id="amount"
              type="text"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          {/* Receive Date */}
          <div className="space-y-2">
            <Label>Data de Recebimento</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(receiveDate, 'dd/MM/yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={receiveDate}
                  onSelect={(date) => date && setReceiveDate(date)}
                  locale={ptBR}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Account */}
          {accounts.length > 0 && (
            <div className="space-y-2">
              <Label>Conta de Destino (opcional)</Label>
              <Select value={accountId || "none"} onValueChange={(v) => setAccountId(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma conta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.bankName} - {account.accountNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Recurring */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <Label htmlFor="recurring" className="font-medium">
                Receita Recorrente
              </Label>
              <p className="text-sm text-muted-foreground">
                Gerar automaticamente para os próximos 12 meses
              </p>
            </div>
            <Switch
              id="recurring"
              checked={isRecurring}
              onCheckedChange={setIsRecurring}
              disabled={isEditing}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Observação (opcional)</Label>
            <Textarea
              id="description"
              placeholder="Adicione uma nota..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="hero" className="flex-1">
              {isEditing ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
