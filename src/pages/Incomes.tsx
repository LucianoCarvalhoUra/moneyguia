import { useState } from 'react';
import { useIncome } from '@/contexts/IncomeContext';
import { Button } from '@/components/ui/button';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import IncomeForm from '@/components/income/IncomeForm';
import IncomeList from '@/components/income/IncomeList';
import ExpenseSummaryCard from '@/components/dashboard/ExpenseSummaryCard';
import IncomeCategoryChart from '@/components/dashboard/IncomeCategoryChart';
import IncomeExpenseChart from '@/components/dashboard/IncomeExpenseChart';
import { useFinance } from '@/contexts/FinanceContext';

export default function Incomes() {
  const { getMonthlyIncomeTotal, getMonthlyIncomes, getIncomeTotalByCategory } = useIncome();
  const { getMonthlyTotal } = useFinance();
  const [formOpen, setFormOpen] = useState(false);
  
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  const currentTotal = getMonthlyIncomeTotal(selectedYear, selectedMonth);
  const currentExpenseTotal = getMonthlyTotal(selectedYear, selectedMonth);
  const previousMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
  const previousYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
  const previousTotal = getMonthlyIncomeTotal(previousYear, previousMonth);
  const monthlyIncomes = getMonthlyIncomes(selectedYear, selectedMonth);
  const incomeCategoryTotals = getIncomeTotalByCategory(selectedYear, selectedMonth);

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
          <h1 className="text-2xl font-bold text-foreground">Receitas</h1>
          <p className="text-muted-foreground">Gerencie seus ganhos e rendimentos</p>
        </div>
        <Button variant="hero" onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Receita
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
      <div className="grid gap-4 md:grid-cols-2">
        <ExpenseSummaryCard
          title="Total de Receitas"
          value={currentTotal}
          previousValue={previousTotal}
          icon="income"
        />
        <ExpenseSummaryCard
          title="Número de Receitas"
          value={monthlyIncomes.length}
          icon="balance"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <IncomeCategoryChart data={incomeCategoryTotals} total={currentTotal} />
        <IncomeExpenseChart income={currentTotal} expense={currentExpenseTotal} />
      </div>

      {/* Income List */}
      <IncomeList year={selectedYear} month={selectedMonth} />

      {/* Income Form */}
      <IncomeForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
