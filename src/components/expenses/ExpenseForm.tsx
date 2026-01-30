import { useState, useEffect } from 'react';
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
import { Expense, PaymentMethod, PAYMENT_METHOD_LABELS } from '@/types/finance';
import { CategoryIcon } from '@/components/CategoryIcon';

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense | null;
}

export default function ExpenseForm({ open, onOpenChange, expense }: ExpenseFormProps) {
  const { 
    addExpense, 
    updateExpense, 
    categories, 
    subcategories, 
    accounts, 
    cards 
  } = useFinance();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('none');
  const [dueDate, setDueDate] = useState<Date | undefined>(new Date());
  const [isPaid, setIsPaid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [accountId, setAccountId] = useState<string>('none');
  const [cardId, setCardId] = useState<string>('none');
  const [isRecurring, setIsRecurring] = useState(false);
  const [installments, setInstallments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (expense) {
      setDescription(expense.description);
      setAmount(expense.amount.toString());
      setCategoryId(expense.categoryId);
      setSubcategoryId(expense.subcategoryId || 'none');
      setDueDate(new Date(expense.dueDate));
      setIsPaid(expense.isPaid);
      setPaymentMethod(expense.paymentMethod);
      setAccountId(expense.accountId || 'none');
      setCardId(expense.cardId || 'none');
      setIsRecurring(expense.isRecurring);
      setInstallments(expense.installments ? expense.installments.toString() : '');
    } else {
      resetForm();
    }
  }, [expense, open]);

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setCategoryId('');
    setSubcategoryId('none');
    setDueDate(new Date());
    setIsPaid(false);
    setPaymentMethod('pix');
    setAccountId('none');
    setCardId('none');
    setIsRecurring(false);
    setInstallments('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description || !amount || !categoryId || !dueDate) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);
    try {
      const expenseData = {
        description,
        amount: parseFloat(amount.replace(',', '.')),
        categoryId,
        subcategoryId: subcategoryId === 'none' ? null : subcategoryId,
        dueDate: dueDate,
        expenseDate: dueDate, // Usando a data de vencimento como data da despesa por padrão
        isPaid,
        paymentMethod,
        accountId: accountId === 'none' ? null : accountId,
        cardId: cardId === 'none' ? null : cardId,
        isRecurring,
        installments: installments ? parseInt(installments) : null,
      };

      if (expense) {
        await updateExpense(expense.id, expenseData);
        toast.success('Despesa atualizada com sucesso!');
      } else {
        await addExpense(expenseData);
        toast.success('Despesa criada com sucesso!');
      }
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar despesa');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSubcategories = subcategories.filter(s => s.categoryId === categoryId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{expense ? 'Editar Despesa' : 'Nova Despesa'}</DialogTitle>
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
                {categories.map((cat) => (
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
              placeholder="Ex: Compras do mês" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
              <Label>Vencimento</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "dd/MM/yyyy", { locale: ptBR }) : <span>Selecione</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <Label className="cursor-pointer" htmlFor="is-paid">Está pago?</Label>
            <Switch id="is-paid" checked={isPaid} onCheckedChange={setIsPaid} />
          </div>

          <div className="space-y-2">
            <Label>Forma de Pagamento</Label>
            <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {paymentMethod === 'credit_card' && (
             <div className="space-y-2">
               <Label>Cartão</Label>
               <Select value={cardId} onValueChange={setCardId}>
                 <SelectTrigger>
                   <SelectValue placeholder="Selecione o cartão" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="none">Selecione...</SelectItem>
                   {cards.map((card) => (
                     <SelectItem key={card.id} value={card.id}>
                       {card.brand} •••• {card.lastFourDigits}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
          )}

          {(paymentMethod === 'debit_card' || paymentMethod === 'pix' || paymentMethod === 'bank_transfer') && (
             <div className="space-y-2">
               <Label>Conta</Label>
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
          )}

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <Label className="cursor-pointer" htmlFor="is-recurring">É recorrente?</Label>
            <Switch id="is-recurring" checked={isRecurring} onCheckedChange={setIsRecurring} />
          </div>

          {isRecurring && (
            <div className="space-y-2">
              <Label>Parcelas (opcional)</Label>
              <Input 
                type="number" 
                placeholder="Ex: 12" 
                value={installments}
                onChange={(e) => setInstallments(e.target.value)}
              />
            </div>
          )}

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