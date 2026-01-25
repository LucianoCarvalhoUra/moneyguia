import { useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useIncome } from '@/contexts/IncomeContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface FinancialContextType {
  totalBalance: number;
  categorySummary: Record<string, number>;
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
    const totalIncome = incomes.reduce((acc, inc) => acc + Number(inc.amount), 0);
    const totalExpense = expenses.reduce((acc, exp) => acc + Number(exp.amount), 0);
    const totalBalance = totalIncome - totalExpense;

    const categorySummary = expenses.reduce((acc, exp) => {
      const catName = categories.find(c => c.id === exp.categoryId)?.name || 'Outros';
      acc[catName] = (acc[catName] || 0) + Number(exp.amount);
      return acc;
    }, {} as Record<string, number>);

    // Format string for AI
    const currentMonth = new Date();
    const currentMonthExpenses = expenses.filter(e => {
      const d = new Date(e.dueDate);
      return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
    });

    const currentMonthTotal = currentMonthExpenses.reduce((acc, e) => acc + Number(e.amount), 0);
    
    const aiContextString = `
      Resumo Financeiro Atual:
      - Saldo Total: R$ ${totalBalance.toFixed(2)}
      - Receitas Totais: R$ ${totalIncome.toFixed(2)}
      - Despesas Totais: R$ ${totalExpense.toFixed(2)}
      - Gastos deste mês (${format(currentMonth, 'MMMM', { locale: ptBR })}): R$ ${currentMonthTotal.toFixed(2)}
    `.trim();

    return {
      totalBalance,
      categorySummary,
      aiContextString,
      isLoading: false,
      error: null
    };
  }, [expenses, incomes, categories]);

  return financialContext;
};