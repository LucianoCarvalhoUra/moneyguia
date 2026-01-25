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
      totalVariable: number;
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
    variableAnalysis: {
      variableExpenses: { description: string; amount: number; category: string }[];
      totalVariable: number;
    };
    projections: {
      projectedBalance: number;
      projectedExpenses: number;
      daysRemaining: number;
    };
    anomalies: { description: string; amount: number; date: string; category: string }[];
    detailedBreakdown: {
      topExpenses: { description: string; amount: number; date: string; category: string }[];
      categoryVariations: { category: string; variation: number; current: number; average: number }[];
    };
    previousMonth: {
      totalIncome: number;
      totalExpenses: number;
      balance: number;
      topExpenseName: string;
      topExpenseAmount: number;
    };
    transactionsHistory: {
      incomes: { description: string; amount: number; date: string; category: string }[];
      expenses: { description: string; amount: number; date: string; category: string }[];
    };
  };
  aiContextString: string;
  isLoading: boolean;
  error: string | null;
}

export const useFinancialData = (): FinancialContextType => {
  const { expenses, categories } = useFinance();
  const { incomes, incomeCategories } = useIncome();

  // Note: Assuming contexts handle loading internally and return empty arrays initially.
  // If contexts exposed loading states, we would use them here.
  const isLoading = !expenses || !incomes; 

  const financialContext = useMemo(() => {
    // Safety check for initial render
    if (!expenses || !incomes) {
      return {
        aiConsultantContext: {
          financialProfile: { totalBalance: 0, totalIncome: 0, totalExpenses: 0, savingsRate: 0, totalVariable: 0 },
          recurrenceAnalysis: { recurringExpenses: [], totalRecurring: 0 },
          criticalCategories: [],
          variableAnalysis: { variableExpenses: [], totalVariable: 0 },
          projections: { projectedBalance: 0, projectedExpenses: 0, daysRemaining: 0 },
          anomalies: [],
          detailedBreakdown: { topExpenses: [], categoryVariations: [] },
          previousMonth: { totalIncome: 0, totalExpenses: 0, balance: 0, topExpenseName: '', topExpenseAmount: 0 },
          transactionsHistory: { incomes: [], expenses: [] }
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

    // 3. Variable Expenses Analysis (Non-Recurring)
    const variableExpensesList = currentMonthExpenses
      .filter(e => !e.isRecurring)
      .map(e => ({
        description: e.description,
        amount: Number(e.amount),
        category: categories.find(c => c.id === e.categoryId)?.name || 'Outros'
      }))
      .sort((a, b) => b.amount - a.amount);
    const totalVariable = variableExpensesList.reduce((acc, item) => acc + item.amount, 0);

    // 4. Top 3 Critical Categories (vs 3-month average)
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

    // 5. Projection (Realistic: Scheduled Balance)
    const daysInMonth = getDaysInMonth(now);
    const currentDay = getDate(now);
    const daysRemaining = daysInMonth - currentDay;
    // Projection based on scheduled items (Realized + Pending)
    const projectedExpenses = totalExpenses; 
    const projectedBalance = totalIncome - projectedExpenses;

    // 6. Anomalies (Expenses > 30% of total income or > 2x category average)
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

    // 7. Detailed Breakdown (Top 20 Expenses & Category Variations)
    const topExpenses = currentMonthExpenses
        .sort((a, b) => Number(b.amount) - Number(a.amount))
        .slice(0, 20)
        .map(e => ({
            description: e.description,
            amount: Number(e.amount),
            date: format(new Date(e.dueDate), 'dd/MM/yyyy'),
            category: categories.find(c => c.id === e.categoryId)?.name || 'Outros'
        }));

    const categoryVariations = Object.entries(categoryStats)
        .map(([category, stats]) => {
            const avg = stats.history.reduce((a, b) => a + b, 0) / 3;
            const variation = avg > 0 ? ((stats.current - avg) / avg) * 100 : 0;
            return { category, variation, current: stats.current, average: avg };
        })
        .sort((a, b) => b.variation - a.variation)
        .slice(0, 5);

    // 8. Transaction History (Last 3 Months for RAG)
    const threeMonthsAgo = subMonths(now, 3);
    const recentIncomes = incomes
      .filter(i => new Date(i.receiveDate) >= threeMonthsAgo)
      .map(i => ({
        description: i.description || i.title,
        amount: Number(i.amount),
        date: format(new Date(i.receiveDate), 'yyyy-MM-dd'),
        category: incomeCategories?.find(c => c.id === i.categoryId)?.name || 'Outros'
      }));
    const recentExpenses = expenses
      .filter(e => new Date(e.dueDate) >= threeMonthsAgo)
      .map(e => ({
        description: e.description,
        amount: Number(e.amount),
        date: format(new Date(e.dueDate), 'yyyy-MM-dd'),
        category: categories.find(c => c.id === e.categoryId)?.name || 'Outros'
      }));

    // 9. Previous Month Context (Memory)
    const lastMonth = subMonths(now, 1);
    const lastMonthIncomes = incomes.filter(i => isSameMonth(new Date(i.receiveDate), lastMonth));
    const lastMonthExpenses = expenses.filter(e => isSameMonth(new Date(e.dueDate), lastMonth));
    
    const lastMonthTotalIncome = lastMonthIncomes.reduce((acc, i) => acc + Number(i.amount), 0);
    const lastMonthTotalExpenses = lastMonthExpenses.reduce((acc, e) => acc + Number(e.amount), 0);
    const lastMonthBalance = lastMonthTotalIncome - lastMonthTotalExpenses;
    const lastMonthTopExpense = lastMonthExpenses.sort((a, b) => Number(b.amount) - Number(a.amount))[0];

    const aiConsultantContext = {
        financialProfile: { totalBalance, totalIncome, totalExpenses, savingsRate, totalVariable },
        recurrenceAnalysis: { recurringExpenses: recurringExpensesList, totalRecurring },
        criticalCategories: criticalCategories as { category: string; currentAmount: number; average3Months: number; trend: 'Crescente' | 'Decrescente' | 'Estável' }[],
        variableAnalysis: { variableExpenses: variableExpensesList, totalVariable },
        projections: { projectedBalance, projectedExpenses, daysRemaining },
        anomalies,
        detailedBreakdown: { topExpenses, categoryVariations },
        previousMonth: {
            totalIncome: lastMonthTotalIncome,
            totalExpenses: lastMonthTotalExpenses,
            balance: lastMonthBalance,
            topExpenseName: lastMonthTopExpense?.description || 'Nenhum',
            topExpenseAmount: Number(lastMonthTopExpense?.amount || 0)
        },
        transactionsHistory: { incomes: recentIncomes, expenses: recentExpenses }
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

      6. DETALHAMENTO PROFUNDO:
      - Top Gastos: ${topExpenses.map(e => `${e.description} (${e.amount})`).join(', ')}
      - Variações: ${categoryVariations.map(c => `${c.category} (${c.variation.toFixed(1)}%)`).join(', ')}
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