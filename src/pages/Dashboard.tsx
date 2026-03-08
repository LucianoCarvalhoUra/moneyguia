import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useFinance } from '@/contexts/FinanceContext';
import { useIncome } from '@/contexts/IncomeContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, ChevronLeft, ChevronRight, Wallet, TrendingUp, TrendingDown, AlertTriangle, X, Eye } from 'lucide-react';
import CategoryChart from '@/components/dashboard/CategoryChart';
import RecentExpenses from '@/components/dashboard/RecentExpenses';
import IncomeExpenseChart from '@/components/dashboard/IncomeExpenseChart';
import ExpenseForm from '@/components/expenses/ExpenseForm';
import PendingExpensesList from '@/components/dashboard/PendingExpensesList';
import { toast } from 'sonner';
import { addDays, startOfDay, endOfDay, isBefore, format, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DashboardAI } from '@/components/dashboard/DashboardAI';
import FiftyThirtyTwentyChart from '@/components/dashboard/FiftyThirtyTwentyChart';
import DailyCashFlowChart from '@/components/dashboard/DailyCashFlowChart';
import BalanceProjectionChart from '@/components/dashboard/BalanceProjectionChart';
import { DEFAULT_DASHBOARD_SETTINGS, DashboardSettings } from '@/components/dashboard/DashboardCustomization';

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { getMonthlyTotal, getTotalByCategory, getMonthlyExpenses, expenses } = useFinance();
  const { getMonthlyIncomeTotal, incomes } = useIncome();
  const [formOpen, setFormOpen] = useState(false);
  
  const now = new Date();
  const getInitialPeriod = () => {
    const monthParam = searchParams.get('month');
    const yearParam = searchParams.get('year');

    if (monthParam && yearParam) {
      const parsedMonth = Number.parseInt(monthParam, 10);
      const parsedYear = Number.parseInt(yearParam, 10);
      if (!Number.isNaN(parsedMonth) && !Number.isNaN(parsedYear) && parsedMonth >= 1 && parsedMonth <= 12) {
        return { month: parsedMonth - 1, year: parsedYear };
      }
    }

    const stored = localStorage.getItem('dashboard_period');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { month?: number; year?: number };
        if (typeof parsed.month === 'number' && typeof parsed.year === 'number' && parsed.month >= 0 && parsed.month <= 11) {
          return { month: parsed.month, year: parsed.year };
        }
      } catch {
        // ignore invalid localStorage payload
      }
    }

    return { month: now.getMonth(), year: now.getFullYear() };
  };

  const initialPeriod = getInitialPeriod();
  const [selectedYear, setSelectedYear] = useState(initialPeriod.year);
  const [selectedMonth, setSelectedMonth] = useState(initialPeriod.month);
  const [showOverdueAlert, setShowOverdueAlert] = useState(true);
  const [alertConfig, setAlertConfig] = useState({ enabled: true, days: 2, type: 'expenses' });
  const [settings, setSettings] = useState<DashboardSettings>(DEFAULT_DASHBOARD_SETTINGS);

  useEffect(() => {
    const stored = localStorage.getItem('dashboard_settings');
    if (stored) {
      setSettings(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('dashboard_period', JSON.stringify({ month: selectedMonth, year: selectedYear }));

    const monthValue = String(selectedMonth + 1).padStart(2, '0');
    const yearValue = String(selectedYear);
    const currentMonth = searchParams.get('month');
    const currentYear = searchParams.get('year');

    if (currentMonth !== monthValue || currentYear !== yearValue) {
      const params = new URLSearchParams(searchParams);
      params.set('month', monthValue);
      params.set('year', yearValue);
      setSearchParams(params, { replace: true });
    }
  }, [selectedMonth, selectedYear, searchParams, setSearchParams]);

  // Get monthly data
  const monthlyExpenses = getMonthlyExpenses(selectedYear, selectedMonth);
  const monthlyIncomes = incomes.filter((i) => {
    const date = new Date(i.receiveDate);
    return date.getFullYear() === selectedYear && date.getMonth() === selectedMonth;
  });

  const accountedExpensesTotal = monthlyExpenses
    .filter(e => !e.excludeFromCalculations)
    .reduce((acc, e) => acc + e.amount, 0);
  const accountedIncomesTotal = monthlyIncomes
    .filter(i => !i.excludeFromCalculations)
    .reduce((acc, i) => acc + i.amount, 0);

  // Total expenses/incomes (projected - only contabilized items)
  const currentExpenseTotal = accountedExpensesTotal;
  const currentIncomeTotal = accountedIncomesTotal;
  const projectedBalance = currentIncomeTotal - currentExpenseTotal;
  
  // Real balance (only paid expenses and received incomes)
  const paidExpensesTotal = monthlyExpenses
    .filter(e => e.isPaid && !e.excludeFromCalculations)
    .reduce((acc, e) => acc + e.amount, 0);
  const receivedIncomesTotal = monthlyIncomes
    .filter(i => i.isReceived && !i.excludeFromCalculations)
    .reduce((acc, i) => acc + i.amount, 0);
  const realBalance = receivedIncomesTotal - paidExpensesTotal;

  const visualExpensesTotal = monthlyExpenses
    .filter(e => e.excludeFromCalculations)
    .reduce((acc, e) => acc + e.amount, 0);
  const visualIncomesTotal = monthlyIncomes
    .filter(i => i.excludeFromCalculations)
    .reduce((acc, i) => acc + i.amount, 0);
  const controlExtraTotal = visualExpensesTotal + visualIncomesTotal;
  
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

  const selectedMonthLabelRaw = format(new Date(selectedYear, selectedMonth, 1), 'MMMM', { locale: ptBR });
  const selectedMonthLabel = selectedMonthLabelRaw.charAt(0).toUpperCase() + selectedMonthLabelRaw.slice(1);

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
    const normalizeClassification = (value?: string) => {
      if (!value) return 'variavel';
      if (value === 'essential') return 'essencial';
      if (value === 'superfluous') return 'superfluo';
      if (value === 'long_term') return 'longo_prazo';
      if (value === 'variable') return 'variavel';
      return value;
    };

    const metadata = JSON.parse(localStorage.getItem('category_metadata') || '{}');
    let needs = 0;
    let wants = 0;
    let savings = 0; // Using 'longo_prazo' as savings/debt for now

    monthlyExpenses.filter(e => !(e as any).excludeFromCalculations).forEach(e => {
      // Try to find classification by category name (fallback) or ID if we had it
      // Since we stored by name in UnifiedCategoryManager for this demo:
      
      // Priority 1: Direct classification on the expense (AI or manual)
      let classification = normalizeClassification((e as any).classificationType);

      // Priority 2: Category metadata fallback
      if (!classification || classification === 'variavel') {
        const meta = Object.values(metadata).find((m: any) => m.id === e.categoryId) as any;
        classification = normalizeClassification(meta?.classification);
      }

      // Heuristic fallback if no metadata
      if (classification === 'essencial') needs += e.amount;
      else if (classification === 'superfluo') wants += e.amount;
      else if (classification === 'longo_prazo') savings += e.amount;
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
    <div className="space-y-8">
      {/* Overdue Alert Banner */}
      {showOverdueAlert && totalOverdueCount > 0 && (
        <div 
          className="flex cursor-pointer items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 shadow-sm transition-colors hover:bg-red-100 animate-in slide-in-from-top-2"
          onClick={handleAlertClick}
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-100 p-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="font-bold">Atenção: você possui {totalOverdueCount} itens vencidos.</p>
              <p className="text-xs text-red-600">
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
            className="text-red-600 hover:bg-red-200 hover:text-red-700"
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
        <Button className="bg-[#059669] text-white shadow-sm hover:bg-[#047857]" onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Despesa
        </Button>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-center gap-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <Button variant="ghost" size="icon" onClick={handlePreviousMonth} className="h-9 w-9 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="text-lg font-bold text-foreground min-w-[180px] text-center capitalize">
          {selectedMonthLabel} {selectedYear}
        </div>
        <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-9 w-9 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900">
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
        <Card className={projectedBalance >= 0 ? 'order-2 border-slate-200 bg-white' : 'order-2 border-red-200 bg-white'}>
          <CardContent className="p-7">
            <div className="flex items-center gap-4">
              <div className={`rounded-xl p-3 ${projectedBalance >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo previsto (final do mês)</p>
                <p className={`text-2xl font-bold ${projectedBalance >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  {formatCurrency(projectedBalance)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Receitas - Despesas (Contabilizadas)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={realBalance >= 0 ? 'order-1 border-slate-200 bg-white' : 'order-1 border-red-200 bg-white'}>
          <CardContent className="p-7">
            <div className="flex items-center gap-4">
              <div className={`rounded-xl p-3 ${realBalance >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo Real</p>
                <p className={`text-2xl font-bold ${realBalance >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  {formatCurrency(realBalance)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Receitas - Despesas (Contabilizadas)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Receitas Totais */}
        <Card className="order-3 border-slate-200 bg-white">
          <CardContent className="p-7">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Receitas Totais</p>
                <p className="text-2xl font-bold text-emerald-700">
                  {formatCurrency(currentIncomeTotal)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Total contabilizado
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="order-4 border-slate-200 bg-white">
          <CardContent className="p-7">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-red-50 p-3 text-red-600">
                <TrendingDown className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Despesas Totais</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(currentExpenseTotal)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Apenas despesas contabilizadas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="order-5 border-slate-200 bg-white">
          <CardContent className="p-7">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-slate-100 p-3 text-slate-600">
                <Eye className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Controle Extra</p>
                <p className="text-2xl font-bold text-slate-600">
                  {formatCurrency(controlExtraTotal)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Receitas + despesas visuais
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


