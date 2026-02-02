import { useState, useEffect } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { supabase } from '@/integrations/supabase/client';
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
import { Expense, PaymentMethod } from '@/types/finance';
import { Switch } from '@/components/ui/switch';
import { Loader2, Calendar as CalendarIcon, Calendar, CalendarClock, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { format, addMonths } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense | null;
}

export default function ExpenseForm({ open, onOpenChange, expense }: ExpenseFormProps) {
  const { addExpense, updateExpense, removeExpense, categories, subcategories, accounts, cards } = useFinance();
  
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [accountId, setAccountId] = useState('');
  const [cardId, setCardId] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [installments, setInstallments] = useState('1');
  const [isPaid, setIsPaid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recurrenceDialogOpen, setRecurrenceDialogOpen] = useState(false);
  const [pendingData, setPendingData] = useState<any>(null);

  useEffect(() => {
    if (expense) {
      setDescription(expense.description);
      setAmount(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(expense.amount));
      setDate(format(new Date(expense.dueDate), 'yyyy-MM-dd'));
      setCategoryId(expense.categoryId);
      setSubcategoryId(expense.subcategoryId || '');
      setPaymentMethod(expense.paymentMethod);
      setAccountId(expense.accountId || '');
      setCardId(expense.cardId || '');
      setIsRecurring(expense.isRecurring);
      setInstallments(expense.installments?.toString() || '1');
      setIsPaid(expense.isPaid ?? false);
    } else {
      resetForm();
    }
  }, [expense, open]);

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setCategoryId('');
    setSubcategoryId('');
    setPaymentMethod('pix');
    setAccountId('');
    setCardId('');
    setIsRecurring(false);
    setInstallments('1');
    setIsPaid(false);
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
    if (!description || !amount || !date || !categoryId) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);
    try {
      const numericAmount = parseFloat(amount.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
      
      const expenseData = {
        description,
        amount: numericAmount,
        expenseDate: new Date(date),
        dueDate: new Date(date),
        categoryId,
        subcategoryId: subcategoryId || undefined,
        paymentMethod,
        accountId: paymentMethod === 'account' ? accountId : undefined,
        cardId: paymentMethod === 'credit_card' ? cardId : undefined,
        isRecurring,
        installments: isRecurring ? parseInt(installments) : undefined,
        isPaid,
      };

      // Etapa 2: Interceptar o Submit para Recorrência
      const isRecurringSeries = expense && (expense.isRecurring || (expense as any).recurrenceId || (expense as any).recurrence_id);

      // Caso 1: Edição de uma série já existente (Modal de Confirmação)
      if (isRecurringSeries) {
        // Se for uma edição de recorrente, SEMPRE pergunta o escopo, 
        // pois o usuário pode querer alterar apenas esta ou todas.
        if (expense) { 
          setPendingData(expenseData);
          setRecurrenceDialogOpen(true);
          setIsSubmitting(false);
          return;
        }
      }

      // Caso 2: Transformação de Única para Recorrente (Geração Automática)
      if (expense && !isRecurringSeries && isRecurring) {
        // Remove a despesa antiga
        await removeExpense(expense.id);
        
        // Gera ID de recorrência para vincular o grupo
        const newRecurrenceId = crypto.randomUUID();
        
        // Cria a despesa atual com o ID de recorrência
        await addExpense({ ...expenseData, recurrenceId: newRecurrenceId } as any);
        
        // Loop para gerar as futuras (12 meses ou conforme parcelas)
        const limit = installments ? parseInt(installments) - 1 : 11;
        const baseDate = new Date(date);

        for (let i = 1; i <= limit; i++) {
          const nextDate = addMonths(baseDate, i);
          // Clona os dados, ajusta a data e mantém o vínculo
          await addExpense({ ...expenseData, dueDate: nextDate, expenseDate: nextDate, recurrenceId: newRecurrenceId } as any);
        }

        toast.success('Despesa transformada em recorrente e registros futuros gerados!');
        onOpenChange(false);
        return;
      }

      if (expense) {
        await updateExpense(expense.id, expenseData);
        toast.success('Despesa atualizada!');
      } else {
        await addExpense(expenseData);
        toast.success('Despesa criada!');
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
      const recurrenceId = (expense as any).recurrenceId || (expense as any).recurrence_id;

      if (scope === 'all' && recurrenceId) {
        // Update ALL records in the series
        const { error } = await (supabase
          .from('expenses') as any) // Cast to any to bypass strict type checking on dynamic update
          // Não atualizamos datas para não mover todo o histórico para o mesmo dia
          .update({
            description: pendingData.description,
            amount: pendingData.amount,
            category_id: pendingData.categoryId,
            subcategory_id: pendingData.subcategoryId,
            payment_method: pendingData.paymentMethod,
            account_id: pendingData.accountId,
            card_id: pendingData.cardId,
          } as any)
          .eq('recurrence_id', recurrenceId);

        if (error) throw error;
        toast.success('Todas as despesas da série foram atualizadas!');
        // Atualiza o item atual na interface
        await updateExpense(expense!.id, pendingData);
      } else if (scope === 'future' && recurrenceId) {
        // Update THIS and FUTURE records
        const { error } = await (supabase
          .from('expenses') as any)
          .update({
            description: pendingData.description,
            amount: pendingData.amount,
            category_id: pendingData.categoryId,
            subcategory_id: pendingData.subcategoryId,
            payment_method: pendingData.paymentMethod,
            account_id: pendingData.accountId,
            card_id: pendingData.cardId,
          } as any)
          .eq('recurrence_id', recurrenceId)
          .gte('due_date', format(new Date(pendingData.dueDate), 'yyyy-MM-dd'));

        if (error) throw error;
        toast.success('Despesa atual e futuras atualizadas!');
        // Atualiza o item atual na interface
        await updateExpense(expense!.id, pendingData);
      } else {
        // Single update
        await updateExpense(expense!.id, { ...pendingData, recurrenceScope: 'single' });
        toast.success('Despesa atualizada!');
      }
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao atualizar despesa');
    } finally {
      setIsSubmitting(false);
      setRecurrenceDialogOpen(false);
    }
  };

  const filteredSubcategories = subcategories.filter(s => s.categoryId === categoryId);
  const selectedCategory = categories.find(c => c.id === categoryId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{expense ? 'Editar Despesa' : 'Nova Despesa'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
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
              <Label>Forma de Pagamento</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX / Dinheiro</SelectItem>
                  <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                  <SelectItem value="account">Débito em Conta</SelectItem>
                </SelectContent>
              </Select>
          </div>

          {paymentMethod === 'credit_card' && (
              <div className="space-y-2">
                <Label>Cartão</Label>
                <Select value={cardId} onValueChange={setCardId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o cartão" /></SelectTrigger>
                  <SelectContent>
                    {cards.map(card => (
                      <SelectItem key={card.id} value={card.id}>{card.brand} •••• {card.lastFourDigits}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
          )}

          {paymentMethod === 'account' && (
              <div className="space-y-2">
                <Label>Conta</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.bankName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
          )}

          {/* Bloco de Controle (Agrupado) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border rounded-md p-4 bg-muted/20">
            <div className="flex flex-col gap-2">
              <Label htmlFor="status-switch" className="text-sm font-medium">Status do Pagamento</Label>
              <div className="flex items-center justify-between bg-background p-2 rounded-md border">
                <span className="text-sm text-muted-foreground">{isPaid ? 'Pago' : 'Pendente'}</span>
                <Switch id="status-switch" checked={isPaid} onCheckedChange={setIsPaid} />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="recurring" className="text-sm font-medium">Recorrência</Label>
              <div className="flex items-center justify-between bg-background p-2 rounded-md border">
                <span className="text-sm text-muted-foreground">{isRecurring ? 'Sim' : 'Não'}</span>
                <Switch id="recurring" checked={isRecurring} onCheckedChange={setIsRecurring} />
              </div>
            </div>

            {isRecurring && (
              <div className="sm:col-span-2 space-y-2 animate-in fade-in slide-in-from-top-2">
                <Label>Número de Parcelas (1 = Fixo Mensal)</Label>
                <Input type="number" min="1" value={installments} onChange={(e) => setInstallments(e.target.value)} />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input placeholder="Ex: Supermercado" value={description} onChange={(e) => setDescription(e.target.value)} />
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
              Esta despesa é recorrente. Como deseja aplicar as alterações?
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