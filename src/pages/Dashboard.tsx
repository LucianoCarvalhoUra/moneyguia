import { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useIncome } from '@/contexts/IncomeContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, ChevronLeft, ChevronRight, Wallet, TrendingUp } from 'lucide-react';
import ExpenseSummaryCard from '@/components/dashboard/ExpenseSummaryCard';
import CategoryChart from '@/components/dashboard/CategoryChart';
import RecentExpenses from '@/components/dashboard/RecentExpenses';
import IncomeExpenseChart from '@/components/dashboard/IncomeExpenseChart';
import ExpenseForm from '@/components/expenses/ExpenseForm';
import PendingExpensesList from '@/components/dashboard/PendingExpensesList';

export default function Dashboard() {
  const { getMonthlyTotal, getTotalByCategory, getMonthlyExpenses, expenses } = useFinance();
  const { getMonthlyIncomeTotal, incomes } = useIncome();
  const [formOpen, setFormOpen] = useState(false);
  
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  // Get monthly data
  const monthlyExpenses = getMonthlyExpenses(selectedYear, selectedMonth);
  const monthlyIncomes = incomes.filter((i) => {
    const date = new Date(i.receiveDate);
    return date.getFullYear() === selectedYear && date.getMonth() === selectedMonth;
  });

  // Total expenses/incomes (projected - all items)
  const currentExpenseTotal = getMonthlyTotal(selectedYear, selectedMonth);
  const currentIncomeTotal = getMonthlyIncomeTotal(selectedYear, selectedMonth);
  const projectedBalance = currentIncomeTotal - currentExpenseTotal;
  
  // Real balance (only paid expenses and received incomes)
  const paidExpensesTotal = monthlyExpenses
    .filter(e => e.isPaid)
    .reduce((acc, e) => acc + e.amount, 0);
  const receivedIncomesTotal = monthlyIncomes
    .filter(i => i.isReceived)
    .reduce((acc, i) => acc + i.amount, 0);
  const realBalance = receivedIncomesTotal - paidExpensesTotal;
  
  const previousMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
  const previousYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
  const previousExpenseTotal = getMonthlyTotal(previousYear, previousMonth);
  const previousIncomeTotal = getMonthlyIncomeTotal(previousYear, previousMonth);
  const previousBalance = previousIncomeTotal - previousExpenseTotal;
  
  const categoryTotals = getTotalByCategory(selectedYear, selectedMonth);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const handlePreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do seu orçamento</p>
        </div>
        <Button className="bg-primary text-primary-foreground shadow hover:bg-primary/90" onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Despesa
        </Button>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-center gap-4 py-2">
        <Button className="hover:bg-accent hover:text-accent-foreground" size="icon" onClick={handlePreviousMonth}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="text-lg font-semibold text-foreground min-w-[180px] text-center">
          {months[selectedMonth]} {selectedYear}
        </div>
        <Button className="hover:bg-accent hover:text-accent-foreground" size="icon" onClick={handleNextMonth}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <ExpenseSummaryCard
          title="Total de Ganhos"
          value={currentIncomeTotal}
          previousValue={previousIncomeTotal}
          icon="income"
        />
        <ExpenseSummaryCard
          title="Total de Gastos"
          value={currentExpenseTotal}
          previousValue={previousExpenseTotal}
          icon="expense"
        />
        <ExpenseSummaryCard
          title="Saldo Previsto"
          value={projectedBalance}
          previousValue={previousBalance}
          icon="balance"
          className={projectedBalance < 0 ? 'border-destructive/50' : 'border-success/50'}
        />
      </div>

      {/* Pending Expenses List */}
      <PendingExpensesList />

      {/* Real Balance Card */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className={realBalance >= 0 ? 'border-success/50 bg-success/5' : 'border-destructive/50 bg-destructive/5'}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${realBalance >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
                <Wallet className={`w-6 h-6 ${realBalance >= 0 ? 'text-success' : 'text-destructive'}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo Real</p>
                <p className={`text-2xl font-bold ${realBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(realBalance)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Receitas recebidas ({formatCurrency(receivedIncomesTotal)}) - Despesas pagas ({formatCurrency(paidExpensesTotal)})
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={projectedBalance >= 0 ? 'border-primary/50 bg-primary/5' : 'border-warning/50 bg-warning/5'}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${projectedBalance >= 0 ? 'bg-primary/10' : 'bg-warning/10'}`}>
                <TrendingUp className={`w-6 h-6 ${projectedBalance >= 0 ? 'text-primary' : 'text-warning'}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo Previsto (Final do Mês)</p>
                <p className={`text-2xl font-bold ${projectedBalance >= 0 ? 'text-primary' : 'text-warning'}`}>
                  {formatCurrency(projectedBalance)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Todas receitas ({formatCurrency(currentIncomeTotal)}) - Todas despesas ({formatCurrency(currentExpenseTotal)})
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <IncomeExpenseChart income={currentIncomeTotal} expense={currentExpenseTotal} />
        <CategoryChart data={categoryTotals} total={currentExpenseTotal} />
      </div>

      {/* Recent Expenses */}
      <RecentExpenses expenses={monthlyExpenses} />

      {/* Expense Form */}
      <ExpenseForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
