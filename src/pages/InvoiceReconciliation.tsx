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
  const { cards, expenses, categories, subcategories, accounts, addExpense } = useFinance();
  
  const currentDate = new Date();
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [invoiceAmount, setInvoiceAmount] = useState<string>('');
  
  // Adjustment form
  const [adjustmentCategory, setAdjustmentCategory] = useState<string>('');
  const [adjustmentSubcategory, setAdjustmentSubcategory] = useState<string>('');
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

  // Filter installment expenses for the selected card (all time, not just selected month)
  const installmentExpenses = useMemo(() => {
    if (!selectedCardId) return [];
    
    return expenses.filter((expense) => 
      expense.cardId === selectedCardId &&
      expense.paymentMethod === 'credit_card' &&
      expense.installments && expense.installments > 1
    );
  }, [expenses, selectedCardId]);

  // Group installment expenses by recurrenceId or description
  const groupedInstallments = useMemo(() => {
    const groups: Record<string, typeof installmentExpenses> = {};
    
    installmentExpenses.forEach((expense) => {
      const key = expense.recurrenceId || expense.description.replace(/\s*\(\d+\/\d+\)\s*$/, '');
      if (!groups[key]) groups[key] = [];
      groups[key].push(expense);
    });

    // Sort each group by currentInstallment
    Object.values(groups).forEach(group => {
      group.sort((a, b) => (a.currentInstallment || 0) - (b.currentInstallment || 0));
    });

    return groups;
  }, [installmentExpenses]);

  const [showInstallments, setShowInstallments] = useState(false);

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
        subcategoryId: adjustmentSubcategory || undefined,
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
      setAdjustmentSubcategory('');
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
              <Select value={selectedCardId} onValueChange={(v) => { setSelectedCardId(v); setShowInstallments(false); }}>
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {/* Category */}
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={adjustmentCategory} onValueChange={(v) => { setAdjustmentCategory(v); setAdjustmentSubcategory(''); }}>
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

              {/* Subcategory */}
              <div className="space-y-2">
                <Label>Subcategoria</Label>
                <Select 
                  value={adjustmentSubcategory} 
                  onValueChange={setAdjustmentSubcategory}
                  disabled={!adjustmentCategory || subcategories.filter(s => s.categoryId === adjustmentCategory).length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={!adjustmentCategory ? "Selecione categoria" : "Opcional"} />
                  </SelectTrigger>
                  <SelectContent>
                    {subcategories
                      .filter(s => s.categoryId === adjustmentCategory)
                      .map((sub) => (
                        <SelectItem key={sub.id} value={sub.id}>
                          {sub.name}
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
      {/* Installment Expenses Toggle */}
      {selectedCardId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                Despesas Parceladas
              </CardTitle>
              <CardDescription>
                {Object.keys(groupedInstallments).length} compra(s) parcelada(s) no cartão {selectedCard?.brand} •••• {selectedCard?.lastFourDigits}
              </CardDescription>
            </div>
            <Button
              className="border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground"
              size="sm"
              onClick={() => setShowInstallments(!showInstallments)}
            >
              {showInstallments ? 'Ocultar' : 'Visualizar'}
            </Button>
          </CardHeader>
          {showInstallments && (
            <CardContent>
              {Object.keys(groupedInstallments).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma despesa parcelada</p>
                  <p className="text-sm">Não há parcelas registradas neste cartão</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {Object.entries(groupedInstallments).map(([key, group]) => {
                    const firstExpense = group[0];
                    const totalInstallments = firstExpense.installments || group.length;
                    const paidCount = group.filter(e => e.isPaid).length;
                    const totalAmount = group.reduce((sum, e) => sum + e.amount, 0);
                    const category = categories.find(c => c.id === firstExpense.categoryId);
                    const baseDescription = firstExpense.description.replace(/\s*\(\d+\/\d+\)\s*$/, '');
                    const progress = (paidCount / totalInstallments) * 100;

                    return (
                      <div key={key} className="rounded-xl border border-border/50 overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 bg-muted/30">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <CategoryIcon iconName={category?.icon || 'Package'} className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{baseDescription}</p>
                              <p className="text-xs text-muted-foreground">
                                {paidCount}/{totalInstallments} parcelas pagas • Total: {formatCurrency(totalAmount)}
                              </p>
                            </div>
                          </div>
                          <span className="text-sm font-medium text-muted-foreground">
                            {formatCurrency(firstExpense.amount)}/mês
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div className="px-4 py-2 bg-muted/10">
                          <div className="w-full h-2 rounded-full bg-muted">
                            <div
                              className="h-2 rounded-full bg-primary transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                        {/* Installment details */}
                        <div className="divide-y divide-border/30">
                          {group.map((expense) => (
                            <div
                              key={expense.id}
                              className={cn(
                                "flex items-center justify-between px-4 py-2.5 text-sm",
                                expense.isPaid ? "opacity-60" : ""
                              )}
                            >
                              <div className="flex items-center gap-2">
                                {expense.isPaid ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                                ) : (
                                  <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
                                )}
                                <span className="text-foreground">
                                  Parcela {expense.currentInstallment || '?'}/{totalInstallments}
                                </span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-muted-foreground">
                                  {format(new Date(expense.dueDate), 'dd/MM/yyyy')}
                                </span>
                                <span className="font-medium text-foreground w-24 text-right">
                                  {formatCurrency(expense.amount)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
