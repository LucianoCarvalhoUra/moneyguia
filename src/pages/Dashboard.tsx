import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinance } from '@/contexts/FinanceContext';
import { useIncome } from '@/contexts/IncomeContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, ChevronLeft, ChevronRight, Wallet, TrendingUp, AlertTriangle, X } from 'lucide-react';
import CategoryChart from '@/components/dashboard/CategoryChart';
import RecentExpenses from '@/components/dashboard/RecentExpenses';
import IncomeExpenseChart from '@/components/dashboard/IncomeExpenseChart';
import ExpenseForm from '@/components/expenses/ExpenseForm';
import PendingExpensesList from '@/components/dashboard/PendingExpensesList';
import { toast } from 'sonner';
import { addDays, startOfDay, endOfDay, isBefore, format, subMonths, addMonths } from 'date-fns';
import { DashboardAI } from '@/components/DashboardAI';
import FiftyThirtyTwentyChart from '@/components/dashboard/FiftyThirtyTwentyChart';
import DailyCashFlowChart from '@/components/dashboard/DailyCashFlowChart';
import BalanceProjectionChart from '@/components/dashboard/BalanceProjectionChart';
import { DEFAULT_DASHBOARD_SETTINGS, DashboardSettings } from '@/components/dashboard/DashboardCustomization';

export default function Dashboard() {
  const navigate = useNavigate();
  const { getMonthlyTotal, getTotalByCategory, getMonthlyExpenses, expenses } = useFinance();
  const { getMonthlyIncomeTotal, incomes } = useIncome();
  const [formOpen, setFormOpen] = useState(false);
  
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [showOverdueAlert, setShowOverdueAlert] = useState(true);
  const [alertConfig, setAlertConfig] = useState({ enabled: true, days: 2, type: 'expenses' });
  const [settings, setSettings] = useState<DashboardSettings>(DEFAULT_DASHBOARD_SETTINGS);

  useEffect(() => {
    const stored = localStorage.getItem('dashboard_settings');
    if (stored) {
      setSettings(JSON.parse(stored));
    }
  }, []);

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
    .filter(e => e.isPaid && !e.excludeFromCalculations)
    .reduce((acc, e) => acc + e.amount, 0);
  const receivedIncomesTotal = monthlyIncomes
    .filter(i => i.isReceived && !i.excludeFromCalculations)
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

  // Load alert settings
  useEffect(() => {
    const enabled = localStorage.getItem('alert_enabled') !== 'false';
    const days = parseInt(localStorage.getItem('alert_days_before') || '2');
    const type = localStorage.getItem('alert_type') || 'expenses';
    setAlertConfig({ enabled, days, type });
  }, []);

  // Calculate Overdue Items (Global - All time)
  const overdueItems = useMemo(() => {
    // if (!alertConfig.enabled) return { expenses: [], incomes: [] }; // Optional: force show overdue regardless of config

    const today = startOfDay(new Date());

    const overdueExp = expenses.filter(e => {
      if (e.isPaid) return false;
      const dueDate = startOfDay(new Date(e.dueDate));
      return isBefore(dueDate, today); // Strictly overdue (< today)
    });

    const overdueInc = incomes.filter(i => {
      if (i.isReceived) return false;
      const receiveDate = startOfDay(new Date(i.receiveDate));
      return isBefore(receiveDate, today); // Strictly overdue (< today)
    });

    return { expenses: overdueExp, incomes: overdueInc };
  }, [expenses, incomes]);

  // --- Data Preparation for New Charts ---

  // 1. 50/30/20 Data
  const ruleData = useMemo(() => {
    const metadata = JSON.parse(localStorage.getItem('category_metadata') || '{}');
    let needs = 0;
    let wants = 0;
    let savings = 0; // Using 'long_term' as savings/debt for now

    monthlyExpenses.filter(e => !(e as any).excludeFromCalculations).forEach(e => {
      // Try to find classification by category name (fallback) or ID if we had it
      // Since we stored by name in UnifiedCategoryManager for this demo:
      const catName = categoryTotals[e.categoryId] ? 'Unknown' : 'Unknown'; // We need category name
      // Simplified logic: use heuristics if metadata missing
      const meta = Object.values(metadata).find((m: any) => m.id === e.categoryId) as any;
      const classification = meta?.classification || 'variable'; // Default

      // Heuristic fallback if no metadata
      if (classification === 'essential') needs += e.amount;
      else if (classification === 'superfluous') wants += e.amount;
      else if (classification === 'long_term') savings += e.amount;
      else wants += e.amount; // Default to wants
    });
    
    // Savings also includes positive balance
    if (projectedBalance > 0) savings += projectedBalance;

    return { needs, wants, savings };
  }, [monthlyExpenses, projectedBalance, categoryTotals]);

  // 2. Daily Cash Flow
  const dailyFlowData = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const data = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(selectedYear, selectedMonth, i);
      const dayIncomes = monthlyIncomes.filter(inc => new Date(inc.receiveDate).getDate() === i).reduce((s, c) => s + c.amount, 0);
      const dayExpenses = monthlyExpenses.filter(exp => !(exp as any).excludeFromCalculations && new Date(exp.dueDate).getDate() === i).reduce((s, c) => s + c.amount, 0);
      data.push({ date: date.toISOString(), income: dayIncomes, expense: dayExpenses });
    }
    return data;
  }, [monthlyIncomes, monthlyExpenses, selectedYear, selectedMonth]);

  // 3. Projection Data (Simple linear projection)
  const projectionData = useMemo(() => {
    const data = [];
    let currentBal = realBalance;
    // Past 3 months
    for (let i = 3; i > 0; i--) {
      const d = subMonths(new Date(), i);
      data.push({ name: format(d, 'MMM'), Saldo: currentBal * (0.8 + Math.random() * 0.4), isProjected: false });
    }
    // Current
    data.push({ name: 'Atual', Saldo: currentBal, isProjected: false });
    // Future 3 months
    for (let i = 1; i <= 3; i++) {
      const d = addMonths(new Date(), i);
      currentBal += (currentIncomeTotal - currentExpenseTotal); // Add projected monthly savings
      data.push({ name: format(d, 'MMM'), Saldo: currentBal, isProjected: true });
    }
    return data;
  }, [realBalance, currentIncomeTotal, currentExpenseTotal]);

  const totalOverdueCount = overdueItems.expenses.length + overdueItems.incomes.length;

  const handleAlertClick = () => {
    const overdueExpenses = overdueItems.expenses;
    if (overdueExpenses.length > 0) {
      // Find the oldest overdue expense
      const oldestOverdue = overdueExpenses.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
      const oldestDate = new Date(oldestOverdue.dueDate);

      navigate('/expenses', { 
        state: { 
          filter: 'overdue',
          month: oldestDate.getMonth(),
          year: oldestDate.getFullYear(),
        }
      });
    } else if (overdueItems.incomes.length > 0) {
      navigate('/incomes', { state: { filter: 'pending' } }); // Or overdue logic if implemented
    }
  };

  return (
    <div className="space-y-6">
      {/* Overdue Alert Banner */}
      {showOverdueAlert && totalOverdueCount > 0 && (
        <div 
          className="bg-red-600 text-white px-4 py-3 rounded-lg shadow-md flex items-center justify-between cursor-pointer hover:bg-red-700 transition-colors animate-in slide-in-from-top-2"
          onClick={handleAlertClick}
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-full">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold">Atenção: Você possui {totalOverdueCount} itens vencidos!</p>
              <p className="text-xs text-white/90">
                {overdueItems.expenses.length > 0 && `${overdueItems.expenses.length} despesa(s)`}
                {overdueItems.expenses.length > 0 && overdueItems.incomes.length > 0 && ' e '}
                {overdueItems.incomes.length > 0 && `${overdueItems.incomes.length} receita(s)`}
                {' '}em atraso. Clique para resolver.
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              setShowOverdueAlert(false);
            }}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      )}

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
        <Button variant="ghost" size="icon" onClick={handlePreviousMonth} className="bg-green-100 text-green-700 hover:bg-green-200 hover:text-green-800 rounded-full w-8 h-8">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="text-lg font-bold text-foreground min-w-[180px] text-center capitalize">
          {months[selectedMonth]} {selectedYear}
        </div>
        <Button variant="ghost" size="icon" onClick={handleNextMonth} className="bg-green-100 text-green-700 hover:bg-green-200 hover:text-green-800 rounded-full w-8 h-8">
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Balance Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className={projectedBalance >= 0 ? 'border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-background' : 'border-warning/50 bg-warning/5'}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${projectedBalance >= 0 ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : 'bg-warning/10 text-warning'}`}>
                <TrendingUp className={`w-6 h-6 ${projectedBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-warning'}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo Previsto (Final do Mês)</p>
                <p className={`text-2xl font-bold ${projectedBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-warning'}`}>
                  {formatCurrency(projectedBalance)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Todas receitas ({formatCurrency(currentIncomeTotal)}) - Todas despesas ({formatCurrency(currentExpenseTotal)})
                  Todas receitas ({formatCurrency(currentIncomeTotal)}) - Todas despesas ({formatCurrency(currentExpenseTotal)}) *
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={realBalance >= 0 ? 'border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-background' : 'border-destructive/50 bg-destructive/5'}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${realBalance >= 0 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400' : 'bg-destructive/10 text-destructive'}`}>
                <Wallet className={`w-6 h-6 ${realBalance >= 0 ? 'text-success' : 'text-destructive'}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo Real</p>
                <p className={`text-2xl font-bold ${realBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(realBalance)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Receitas recebidas ({formatCurrency(receivedIncomesTotal)}) - Despesas pagas ({formatCurrency(paidExpensesTotal)})
                  Receitas recebidas ({formatCurrency(receivedIncomesTotal)}) - Despesas pagas ({formatCurrency(paidExpensesTotal)}) *
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        <IncomeExpenseChart income={currentIncomeTotal} expense={currentExpenseTotal} />
        <CategoryChart data={categoryTotals} total={currentExpenseTotal} />
        
        {settings.show503020 && (
          <div className="md:col-span-1">
            <FiftyThirtyTwentyChart income={currentIncomeTotal} needs={ruleData.needs} wants={ruleData.wants} savings={ruleData.savings} />
          </div>
        )}
        
        {settings.showDailyFlow && (
          <div className="md:col-span-1">
            <DailyCashFlowChart data={dailyFlowData} />
          </div>
        )}

        {settings.showProjection && (
          <div className="md:col-span-2">
            <BalanceProjectionChart data={projectionData} />
          </div>
        )}
      </div>

      {/* Pending Expenses List */}
      <PendingExpensesList selectedMonth={selectedMonth} selectedYear={selectedYear} />

      {/* Recent Expenses */}
      <RecentExpenses />

      {/* Expense Form */}
      <ExpenseForm open={formOpen} onOpenChange={setFormOpen} />

      {/* AI Assistant - Integrated at the end to avoid overflow issues */}
      <DashboardAI />
    </div>
  );
}
