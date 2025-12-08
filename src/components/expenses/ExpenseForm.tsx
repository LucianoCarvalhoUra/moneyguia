import { useState, useEffect } from 'react';
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
import {
  PaymentMethod,
  PAYMENT_METHOD_LABELS,
  Expense,
} from '@/types/finance';
import { toast } from 'sonner';

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense;
}

export default function ExpenseForm({ open, onOpenChange, expense }: ExpenseFormProps) {
  const { accounts, cards, categories, subcategories, addExpense, updateExpense, getSubcategoriesByCategory } = useFinance();
  const isEditing = !!expense;

  const [categoryId, setCategoryId] = useState(expense?.categoryId || '');
  const [subcategoryId, setSubcategoryId] = useState(expense?.subcategoryId || '');
  const [description, setDescription] = useState(expense?.description || '');
  const [amount, setAmount] = useState(expense?.amount?.toString() || '');
  const [expenseDate, setExpenseDate] = useState<Date>(
    expense?.expenseDate ? new Date(expense.expenseDate) : new Date()
  );
  const [dueDate, setDueDate] = useState<Date>(
    expense?.dueDate ? new Date(expense.dueDate) : new Date()
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    expense?.paymentMethod || 'pix'
  );
  const [accountId, setAccountId] = useState(expense?.accountId || '');
  const [cardId, setCardId] = useState(expense?.cardId || '');
  const [isRecurring, setIsRecurring] = useState(expense?.isRecurring || false);
  const [installments, setInstallments] = useState(expense?.installments?.toString() || '1');
  const [observation, setObservation] = useState(expense?.observation || '');

  const availableSubcategories = categoryId ? getSubcategoriesByCategory(categoryId) : [];

  // Reset subcategory when category changes
  useEffect(() => {
    if (!expense) {
      setSubcategoryId('');
    }
  }, [categoryId, expense]);

  // Set default category
  useEffect(() => {
    if (!categoryId && categories.length > 0) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const amountNumber = parseFloat(amount.replace(',', '.'));
    if (isNaN(amountNumber) || amountNumber <= 0) {
      toast.error('Informe um valor válido');
      return;
    }

    if (!categoryId) {
      toast.error('Selecione uma categoria');
      return;
    }

    const expenseData = {
      categoryId,
      subcategoryId: subcategoryId || undefined,
      description,
      amount: amountNumber,
      expenseDate,
      dueDate,
      paymentMethod,
      accountId: paymentMethod === 'account' || paymentMethod === 'pix' ? accountId : undefined,
      cardId: paymentMethod === 'credit_card' ? cardId : undefined,
      isRecurring,
      installments: isRecurring ? parseInt(installments) : undefined,
      observation,
    };

    if (isEditing && expense) {
      updateExpense(expense.id, expenseData);
      toast.success('Despesa atualizada com sucesso!');
    } else {
      addExpense(expenseData);
      toast.success('Despesa cadastrada com sucesso!');
    }

    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setCategoryId(categories.length > 0 ? categories[0].id : '');
    setSubcategoryId('');
    setDescription('');
    setAmount('');
    setExpenseDate(new Date());
    setDueDate(new Date());
    setPaymentMethod('pix');
    setAccountId('');
    setCardId('');
    setIsRecurring(false);
    setInstallments('1');
    setObservation('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEditing ? 'Editar Despesa' : 'Nova Despesa'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Category */}
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
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

          {/* Subcategory */}
          {availableSubcategories.length > 0 && (
            <div className="space-y-2">
              <Label>Subcategoria (opcional)</Label>
              <Select value={subcategoryId || "none"} onValueChange={(v) => setSubcategoryId(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma subcategoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {availableSubcategories.map((sub) => (
                    <SelectItem key={sub.id} value={sub.id}>
                      {sub.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              placeholder="Ex: Almoço no restaurante"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
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

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data da Despesa</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(expenseDate, 'dd/MM/yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={expenseDate}
                    onSelect={(date) => date && setExpenseDate(date)}
                    locale={ptBR}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Data de Vencimento</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dueDate, 'dd/MM/yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={(date) => date && setDueDate(date)}
                    locale={ptBR}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>Forma de Pagamento</Label>
            <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Account/Card Selection */}
          {(paymentMethod === 'account' || paymentMethod === 'pix') && accounts.length > 0 && (
            <div className="space-y-2">
              <Label>Conta Corrente</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma conta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.bankName} - {account.accountNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {paymentMethod === 'credit_card' && cards.length > 0 && (
            <div className="space-y-2">
              <Label>Cartão de Crédito</Label>
              <Select value={cardId} onValueChange={setCardId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cartão" />
                </SelectTrigger>
                <SelectContent>
                  {cards.map((card) => (
                    <SelectItem key={card.id} value={card.id}>
                      {card.brand} •••• {card.lastFourDigits}
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
                Despesa Recorrente
              </Label>
              <p className="text-sm text-muted-foreground">
                Gerar parcelas automaticamente
              </p>
            </div>
            <Switch
              id="recurring"
              checked={isRecurring}
              onCheckedChange={setIsRecurring}
            />
          </div>

          {isRecurring && (
            <div className="space-y-2">
              <Label htmlFor="installments">Número de Parcelas</Label>
              <Input
                id="installments"
                type="number"
                min="1"
                max="48"
                value={installments}
                onChange={(e) => setInstallments(e.target.value)}
              />
            </div>
          )}

          {/* Observation */}
          <div className="space-y-2">
            <Label htmlFor="observation">Observação (opcional)</Label>
            <Textarea
              id="observation"
              placeholder="Adicione uma nota..."
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
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
