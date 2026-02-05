import { useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useIncome } from '@/contexts/IncomeContext';
import { startOfDay, addDays, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';

export const useFinancialSummary = (selectedDate: Date = new Date()) => {
  const { expenses, categories } = useFinance();
  const { incomes } = useIncome();

  const summary = useMemo(() => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);

    // Filtrar receitas e despesas pelo mês selecionado
    const monthlyIncomes = incomes.filter(i => isWithinInterval(new Date(i.receiveDate), { start: monthStart, end: monthEnd }));
    const monthlyExpenses = expenses.filter(e => isWithinInterval(new Date(e.dueDate), { start: monthStart, end: monthEnd }));

    // 1. Calcular totais (Receitas, Despesas e Saldo)
    const totalIncome = monthlyIncomes.reduce((acc, income) => acc + Number(income.amount), 0);
    const totalExpenses = monthlyExpenses.reduce((acc, expense) => acc + Number(expense.amount), 0);
    const balance = totalIncome - totalExpenses;

    // 2. Lista de categorias com seus respectivos gastos
    const categorySpendingMap = monthlyExpenses.reduce((acc, expense) => {
      const category = categories.find(c => c.id === expense.categoryId);
      const categoryName = category?.name || 'Sem Categoria';
      
      acc[categoryName] = (acc[categoryName] || 0) + Number(expense.amount);
      return acc;
    }, {} as Record<string, number>);

    const categorySpending = Object.entries(categorySpendingMap)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount); // Ordenar do maior gasto para o menor

    // 3. Lista de contas próximas ao vencimento (próximos 30 dias)
    const today = startOfDay(new Date());
    const next30Days = addDays(today, 30);

    const upcomingBills = expenses
      .filter(expense => {
        if (expense.isPaid) return false;
        const dueDate = new Date(expense.dueDate);
        // Verifica se a data de vencimento está entre hoje e 30 dias à frente
        return isWithinInterval(dueDate, { start: today, end: next30Days });
      })
      .map(expense => ({
        id: expense.id,
        description: expense.description,
        amount: Number(expense.amount),
        dueDate: expense.dueDate,
        category: categories.find(c => c.id === expense.categoryId)?.name || 'Sem Categoria'
      }))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    return {
      totalIncome,
      totalExpenses,
      balance,
      categorySpending,
      upcomingBills
    };
  }, [expenses, incomes, categories]);

  return summary;
};