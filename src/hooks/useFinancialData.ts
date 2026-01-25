import { useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useIncome } from '@/contexts/IncomeContext';
import { format, subMonths, startOfMonth, endOfMonth, getDaysInMonth, getDate, isSameMonth, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface FinancialContextType {
  aiConsultantContext: {
    financialProfile: {
      totalBalance: number;
      totalIncome: number;
      totalExpenses: number;
      savingsRate: number; // % of income saved
    };
    recurrenceAnalysis: {
      recurringExpenses: { description: string; amount: number; category: string }[];
      totalRecurring: number;
    };
    criticalCategories: {
      category: string;
      currentAmount: number;
      average3Months: number;
      trend: 'Crescente' | 'Decrescente' | 'Estável';
    }[];
    projections: {
      projectedBalance: number;
      projectedExpenses: number;
      daysRemaining: number;
    };
    anomalies: { description: string; amount: number; date: string; category: string }[];
  };
  aiContextString: string;
  isLoading: boolean;
  error: string | null;
}

export const useFinancialData = (): FinancialContextType => {
  const { expenses, categories } = useFinance();
  const { incomes } = useIncome();

  // Note: Assuming contexts handle loading internally and return empty arrays initially.
  // If contexts exposed loading states, we would use them here.
  const isLoading = !expenses || !incomes; 

  const financialContext = useMemo(() => {
    // Safety check for initial render
    if (!expenses || !incomes) {
      return {
        aiConsultantContext: {
          financialProfile: { totalBalance: 0, totalIncome: 0, totalExpenses: 0, savingsRate: 0 },
          recurrenceAnalysis: { recurringExpenses: [], totalRecurring: 0 },
          criticalCategories: [],
          projections: { projectedBalance: 0, projectedExpenses: 0, daysRemaining: 0 },
          anomalies: []
        },
        aiContextString: '',
        isLoading: true,
        error: null
      };
    }

    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);

    // 1. Basic Totals (Current Month)
    const currentMonthIncomes = incomes.filter(i => isSameMonth(new Date(i.receiveDate), now));
    const currentMonthExpenses = expenses.filter(e => isSameMonth(new Date(e.dueDate), now));

    const totalIncome = currentMonthIncomes.reduce((acc, inc) => acc + Number(inc.amount), 0);
    const totalExpenses = currentMonthExpenses.reduce((acc, exp) => acc + Number(exp.amount), 0);
    const totalBalance = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

    // 2. Recurrence Analysis
    const recurringExpensesList = expenses
      .filter(e => e.isRecurring && isSameMonth(new Date(e.dueDate), now))
      .map(e => ({
        description: e.description,
        amount: Number(e.amount),
        category: categories.find(c => c.id === e.categoryId)?.name || 'Outros'
      }));
    const totalRecurring = recurringExpensesList.reduce((acc, item) => acc + item.amount, 0);

    // 3. Top 3 Critical Categories (vs 3-month average)
    const last3MonthsStart = startOfMonth(subMonths(now, 3));
    const previousExpenses = expenses.filter(e => {
        const d = new Date(e.dueDate);
        return d >= last3MonthsStart && d < currentMonthStart;
    });

    const categoryStats: Record<string, { current: number; history: number[] }> = {};

    // Initialize with current month data
    currentMonthExpenses.forEach(e => {
        const catName = categories.find(c => c.id === e.categoryId)?.name || 'Outros';
        if (!categoryStats[catName]) categoryStats[catName] = { current: 0, history: [0, 0, 0] };
        categoryStats[catName].current += Number(e.amount);
    });

    // Fill history
    previousExpenses.forEach(e => {
        const catName = categories.find(c => c.id === e.categoryId)?.name || 'Outros';
        const d = new Date(e.dueDate);
        const monthDiff = (now.getMonth() - d.getMonth() + 12) % 12; // 1, 2, or 3
        if (monthDiff >= 1 && monthDiff <= 3) {
             if (!categoryStats[catName]) categoryStats[catName] = { current: 0, history: [0, 0, 0] };
             categoryStats[catName].history[monthDiff - 1] += Number(e.amount);
        }
    });

    const criticalCategories = Object.entries(categoryStats)
        .map(([category, stats]) => {
            const avg = stats.history.reduce((a, b) => a + b, 0) / 3;
            const trend = stats.current > avg ? 'Crescente' : (stats.current < avg ? 'Decrescente' : 'Estável');
            return { category, currentAmount: stats.current, average3Months: avg, trend };
        })
        .filter(c => c.currentAmount > c.average3Months && c.currentAmount > 0) // Only those exceeding average
        .sort((a, b) => (b.currentAmount - b.average3Months) - (a.currentAmount - a.average3Months)) // Sort by deviation
        .slice(0, 3);

    // 4. Projection
    const daysInMonth = getDaysInMonth(now);
    const currentDay = getDate(now);
    const daysRemaining = daysInMonth - currentDay;
    // Simple linear projection: (spent / daysPassed) * totalDays
    const effectiveDays = Math.max(currentDay, 1);
    const projectedExpenses = (totalExpenses / effectiveDays) * daysInMonth;
    const projectedBalance = totalIncome - projectedExpenses;

    // 5. Anomalies (Expenses > 30% of total income or > 2x category average)
    const anomalies = currentMonthExpenses
        .filter(e => {
            const amount = Number(e.amount);
            const catName = categories.find(c => c.id === e.categoryId)?.name || 'Outros';
            const stats = categoryStats[catName];
            const catAvg = stats ? stats.history.reduce((a, b) => a + b, 0) / 3 : 0;
            // Logic: Expense is > 30% of income OR (if avg exists, > 2x avg)
            const isHighValue = totalIncome > 0 && amount > (totalIncome * 0.3);
            const isSpike = catAvg > 0 && amount > (catAvg * 2);
            return isHighValue || isSpike;
        })
        .map(e => ({
            description: e.description,
            amount: Number(e.amount),
            date: format(new Date(e.dueDate), 'dd/MM/yyyy'),
            category: categories.find(c => c.id === e.categoryId)?.name || 'Outros'
        }));

    const aiConsultantContext = {
        financialProfile: { totalBalance, totalIncome, totalExpenses, savingsRate },
        recurrenceAnalysis: { recurringExpenses: recurringExpensesList, totalRecurring },
        criticalCategories: criticalCategories as { category: string; currentAmount: number; average3Months: number; trend: 'Crescente' | 'Decrescente' | 'Estável' }[],
        projections: { projectedBalance, projectedExpenses, daysRemaining },
        anomalies
    };

    const aiContextString = `
      CONTEXTO FINANCEIRO ATUAL (${format(now, 'MMMM/yyyy', { locale: ptBR })}):
      
      1. PERFIL GERAL:
      - Receita: R$ ${totalIncome.toFixed(2)}
      - Despesas: R$ ${totalExpenses.toFixed(2)}
      - Saldo Total: R$ ${totalBalance.toFixed(2)}
      - Taxa de Poupança: ${savingsRate.toFixed(1)}%
      
      2. PROJEÇÃO (Fim do Mês):
      - Se continuar assim, gastará R$ ${projectedExpenses.toFixed(2)}.
      - Saldo projetado: R$ ${projectedBalance.toFixed(2)}.
      
      3. ANÁLISE DE RECORRÊNCIA (Custos Fixos):
      - Total Fixo: R$ ${totalRecurring.toFixed(2)}
      - Itens: ${recurringExpensesList.map(r => `${r.description} (${r.amount})`).join(', ')}
      
      4. CATEGORIAS CRÍTICAS (Acima da média de 3 meses):
      ${criticalCategories.map(c => `- ${c.category}: R$ ${c.currentAmount.toFixed(2)} (Média: R$ ${c.average3Months.toFixed(2)}) -> Tendência ${c.trend}`).join('\n')}
      
      5. ANOMALIAS DETECTADAS:
      ${anomalies.map(a => `- ${a.description}: R$ ${a.amount.toFixed(2)} (${a.category})`).join('\n')}
    `.trim();

    return {
      aiConsultantContext,
      aiContextString,
      isLoading: false,
      error: null
    };
  }, [expenses, incomes, categories]);

  return financialContext;
};