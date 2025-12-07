import { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import ExpenseSummaryCard from '@/components/dashboard/ExpenseSummaryCard';
import CategoryChart from '@/components/dashboard/CategoryChart';
import RecentExpenses from '@/components/dashboard/RecentExpenses';
import ExpenseForm from '@/components/expenses/ExpenseForm';

export default function Dashboard() {
  const { expenses, getMonthlyTotal, getTotalByCategory, getMonthlyExpenses } = useFinance();
  const [formOpen, setFormOpen] = useState(false);
  
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  const currentTotal = getMonthlyTotal(selectedYear, selectedMonth);
  const previousMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
  const previousYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
  const previousTotal = getMonthlyTotal(previousYear, previousMonth);
  
  const categoryTotals = getTotalByCategory(selectedYear, selectedMonth);
  const monthlyExpenses = getMonthlyExpenses(selectedYear, selectedMonth);

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
        <Button variant="hero" onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Despesa
        </Button>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-center gap-4 py-2">
        <Button variant="ghost" size="icon" onClick={handlePreviousMonth}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="text-lg font-semibold text-foreground min-w-[180px] text-center">
          {months[selectedMonth]} {selectedYear}
        </div>
        <Button variant="ghost" size="icon" onClick={handleNextMonth}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <ExpenseSummaryCard
          title="Total de Despesas"
          value={currentTotal}
          previousValue={previousTotal}
          icon="expense"
        />
        <ExpenseSummaryCard
          title="Maior Gasto"
          value={Math.max(...Object.values(categoryTotals), 0)}
          icon="balance"
        />
        <ExpenseSummaryCard
          title="Número de Despesas"
          value={monthlyExpenses.length}
          icon="balance"
        />
      </div>

      {/* Charts and Recent */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CategoryChart data={categoryTotals} total={currentTotal} />
        <RecentExpenses expenses={monthlyExpenses} />
      </div>

      {/* Expense Form */}
      <ExpenseForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
