import { useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useIncome } from '@/contexts/IncomeContext';

export interface FinancialAnalysis {
  totalIncomes: number;
  totalExpenses: number;
  balance: number;
  topCategory: string;
  pendingBillsCount: number;
}

export const useFinancialAnalysis = (): FinancialAnalysis => {
  const { expenses, categories } = useFinance();
  const { incomes } = useIncome();

  return useMemo(() => {
    // Cálculos de totais
    const totalIncomes = incomes.reduce((acc, inc) => acc + Number(inc.amount), 0);
    const totalExpenses = expenses.reduce((acc, exp) => acc + Number(exp.amount), 0);
    const balance = totalIncomes - totalExpenses;

    // Contagem de contas pendentes
    const pendingBillsCount = expenses.filter(e => !e.isPaid).length;

    // Identificar categoria com maior gasto
    const categoryTotals: Record<string, number> = {};
    expenses.forEach(exp => {
      if (exp.categoryId) {
        categoryTotals[exp.categoryId] = (categoryTotals[exp.categoryId] || 0) + Number(exp.amount);
      }
    });

    let topCategoryId = '';
    let maxAmount = 0;

    Object.entries(categoryTotals).forEach(([id, amount]) => {
      if (amount > maxAmount) {
        maxAmount = amount;
        topCategoryId = id;
      }
    });

    const topCategoryName = categories.find(c => c.id === topCategoryId)?.name || 'Nenhuma';

    return { totalIncomes, totalExpenses, balance, topCategory: topCategoryName, pendingBillsCount };
  }, [expenses, incomes, categories]);
};