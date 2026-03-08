import { useState, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, CreditCard, AlertCircle, CheckCircle2, Calculator, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CategoryIcon } from '@/components/CategoryIcon';
import { getUserFriendlyError } from '@/lib/errorMapper';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function InvoiceReconciliation() {
  const { cards, expenses, categories, accounts, addExpense } = useFinance();
  
  const currentDate = new Date();
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [invoiceAmount, setInvoiceAmount] = useState<string>('');
  
  // Adjustment form
  const [adjustmentCategory, setAdjustmentCategory] = useState<string>('');
  const [adjustmentPaymentDate, setAdjustmentPaymentDate] = useState<Date | undefined>();
  const [adjustmentPaymentMethod, setAdjustmentPaymentMethod] = useState<'account' | 'pix'>('pix');
  const [adjustmentAccountId, setAdjustmentAccountId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate years for selection (last 3 years + current year)
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
  }, []);

  // Calculate total expenses for selected card and month
  const cardMonthlyTotal = useMemo(() => {
    if (!selectedCardId) return 0;
    
    const startDate = startOfMonth(new Date(selectedYear, selectedMonth));
    const endDate = endOfMonth(new Date(selectedYear, selectedMonth));
    
    return expenses
      .filter((expense) => {
        const dueDate = new Date(expense.dueDate);
        return (
          expense.cardId === selectedCardId &&
          expense.paymentMethod === 'credit_card' &&
          dueDate >= startDate &&
          dueDate <= endDate
        );
      })
      .reduce((sum, expense) => sum + expense.amount, 0);
  }, [expenses, selectedCardId, selectedMonth, selectedYear]);

  // Calculate difference
  const invoiceAmountNumber = parseFloat(invoiceAmount.replace(',', '.')) || 0;
  const difference = invoiceAmountNumber - cardMonthlyTotal;
  const hasDifference = invoiceAmount && Math.abs(difference) >= 0.01;

  // Get selected card
  const selectedCard = cards.find(c => c.id === selectedCardId);

  // Get expenses for the selected card and month
  const cardExpenses = useMemo(() => {
    if (!selectedCardId) return [];
    
    const startDate = startOfMonth(new Date(selectedYear, selectedMonth));
    const endDate = endOfMonth(new Date(selectedYear, selectedMonth));
    
    return expenses.filter((expense) => {
      const dueDate = new Date(expense.dueDate);
      return (
        expense.cardId === selectedCardId &&
        expense.paymentMethod === 'credit_card' &&
        dueDate >= startDate &&
        dueDate <= endDate
      );
    });
  }, [expenses, selectedCardId, selectedMonth, selectedYear]);

  const handleConfirmReconciliation = async () => {
    if (!hasDifference || difference === 0) {
      toast.success('Fatura conciliada! Não há diferença a ajustar.');
      return;
    }

    if (!adjustmentCategory) {
      toast.error('Selecione uma categoria para o ajuste');
      return;
    }

    if (!adjustmentPaymentDate) {
      toast.error('Selecione a data de pagamento');
      return;
    }

    if (adjustmentPaymentMethod === 'account' && !adjustmentAccountId) {
      toast.error('Selecione a conta para pagamento');
      return;
    }

    setIsSubmitting(true);
    try {
      await addExpense({
        categoryId: adjustmentCategory,
        description: `Ajuste de Fatura - ${selectedCard?.brand} ****${selectedCard?.lastFourDigits} (${MONTHS[selectedMonth]}/${selectedYear})`,
        amount: Math.abs(difference),
        expenseDate: new Date(),
        dueDate: adjustmentPaymentDate,
        paymentMethod: adjustmentPaymentMethod,
        accountId: adjustmentPaymentMethod === 'account' ? adjustmentAccountId : undefined,
        cardId: selectedCardId,
        isRecurring: false,
        observation: difference > 0 
          ? 'Despesa não registrada identificada na conciliação' 
          : 'Valor registrado a maior identificado na conciliação',
        isPaid: false,
      });

      toast.success('Ajuste de fatura registrado com sucesso!');
      
      // Reset form
      setInvoiceAmount('');
      setAdjustmentCategory('');
      setAdjustmentPaymentDate(undefined);
      setAdjustmentAccountId('');
    } catch (error) {
      toast.error(getUserFriendlyError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Fechamento de Fatura</h1>
        <p className="text-muted-foreground">Concilie suas faturas de cartão de crédito com os valores do banco</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Selection Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Selecionar Fatura
            </CardTitle>
            <CardDescription>Escolha o cartão e o mês de referência</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Card Selection */}
            <div className="space-y-2">
              <Label>Cartão de Crédito</Label>
              <Select value={selectedCardId} onValueChange={setSelectedCardId}>
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
              {cards.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum cartão cadastrado. Adicione um cartão primeiro.
                </p>
              )}
            </div>

            {/* Month/Year Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mês</Label>
                <Select 
                  value={selectedMonth.toString()} 
                  onValueChange={(v) => setSelectedMonth(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ano</Label>
                <Select 
                  value={selectedYear.toString()} 
                  onValueChange={(v) => setSelectedYear(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Invoice Amount Input */}
            <div className="space-y-2">
              <Label>Valor Total da Fatura (conforme banco)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  R$
                </span>
                <Input
                  type="text"
                  placeholder="0,00"
                  value={invoiceAmount}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d,]/g, '');
                    setInvoiceAmount(value);
                  }}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" />
              Resumo da Conciliação
            </CardTitle>
            <CardDescription>
              {selectedCard 
                ? `${selectedCard.brand} •••• ${selectedCard.lastFourDigits} - ${MONTHS[selectedMonth]}/${selectedYear}`
                : 'Selecione um cartão para ver o resumo'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedCardId ? (
              <>
                {/* Registered Total */}
                <div className="p-4 rounded-xl bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-1">Total Registrado</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(cardMonthlyTotal)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {cardExpenses.length} despesa(s) encontrada(s)
                  </p>
                </div>

                {/* Invoice Amount */}
                {invoiceAmount && (
                  <div className="p-4 rounded-xl bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">Valor da Fatura (Banco)</p>
                    <p className="text-2xl font-bold text-foreground">
                      {formatCurrency(invoiceAmountNumber)}
                    </p>
                  </div>
                )}

                {/* Difference */}
                {invoiceAmount && (
                  <div className={cn(
                    "p-4 rounded-xl flex items-center gap-3",
                    Math.abs(difference) < 0.01 
                      ? "bg-green-500/10" 
                      : difference > 0 
                        ? "bg-destructive/10" 
                        : "bg-yellow-500/10"
                  )}>
                    {Math.abs(difference) < 0.01 ? (
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    ) : (
                      <AlertCircle className={cn(
                        "w-6 h-6",
                        difference > 0 ? "text-destructive" : "text-yellow-500"
                      )} />
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Diferença</p>
                      <p className={cn(
                        "text-xl font-bold",
                        Math.abs(difference) < 0.01 
                          ? "text-green-500" 
                          : difference > 0 
                            ? "text-destructive" 
                            : "text-yellow-500"
                      )}>
                        {difference > 0 ? '+' : ''}{formatCurrency(difference)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {Math.abs(difference) < 0.01 
                          ? 'Valores conferem!' 
                          : difference > 0 
                            ? 'Valor faltando no registro' 
                            : 'Valor a mais no registro'
                        }
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Selecione um cartão</p>
                <p className="text-sm">para visualizar o resumo</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Adjustment Form */}
      {hasDifference && Math.abs(difference) >= 0.01 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              Lançamento de Ajuste
            </CardTitle>
            <CardDescription>
              Registre a diferença de {formatCurrency(Math.abs(difference))} como uma nova despesa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Category */}
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={adjustmentCategory} onValueChange={setAdjustmentCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <span className="flex items-center gap-2">
                          <CategoryIcon iconName={cat.icon} className="w-4 h-4" />
                          {cat.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Date */}
              <div className="space-y-2">
                <Label>Data de Pagamento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      className={cn(
                        "w-full justify-start text-left font-normal border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
                        !adjustmentPaymentDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {adjustmentPaymentDate 
                        ? format(adjustmentPaymentDate, "dd/MM/yyyy", { locale: ptBR })
                        : "Selecione"
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={adjustmentPaymentDate}
                      onSelect={setAdjustmentPaymentDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label>Forma de Pagamento</Label>
                <Select 
                  value={adjustmentPaymentMethod} 
                  onValueChange={(v) => setAdjustmentPaymentMethod(v as 'account' | 'pix')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="account">Conta Corrente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Account Selection (if payment method is account) */}
              {adjustmentPaymentMethod === 'account' && (
                <div className="space-y-2">
                  <Label>Conta</Label>
                  <Select value={adjustmentAccountId} onValueChange={setAdjustmentAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.bankName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <Button 
                className="bg-primary text-primary-foreground shadow hover:bg-primary/90" 
                onClick={handleConfirmReconciliation}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Processando...' : 'Confirmar Fechamento'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No difference - simple confirm */}
      {invoiceAmount && Math.abs(difference) < 0.01 && selectedCardId && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
                <div>
                  <p className="font-medium text-foreground">Fatura conciliada!</p>
                  <p className="text-sm text-muted-foreground">
                    Os valores registrados conferem com a fatura do banco.
                  </p>
                </div>
              </div>
              <Button className="border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground" onClick={() => toast.success('Conciliação confirmada!')}>
                Confirmar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expenses List */}
      {selectedCardId && cardExpenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Despesas do Período</CardTitle>
            <CardDescription>
              {cardExpenses.length} despesa(s) registrada(s) para {selectedCard?.brand} em {MONTHS[selectedMonth]}/{selectedYear}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {cardExpenses.map((expense) => {
                const category = categories.find(c => c.id === expense.categoryId);
                return (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", category?.color ? `bg-${category.color}/10` : "bg-muted")}>
                        <CategoryIcon iconName={category?.icon || 'Package'} className={cn("w-4 h-4", category?.color ? `text-${category.color}` : "text-muted-foreground")} />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">{expense.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(expense.dueDate), 'dd/MM/yyyy')}
                        </p>
                      </div>
                    </div>
                    <span className="font-medium text-foreground">
                      {formatCurrency(expense.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
