import { useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useIncome } from '@/contexts/IncomeContext';
import { startOfDay, addDays, isWithinInterval, startOfMonth, endOfMonth, parseISO } from 'date-fns';

// Função de Renderização 'Raw'
const renderDateString = (value: any) => {
  if (!value) return "-";
  // Se for objeto Date, converte para ISO; se for string, usa direto.
  const str = typeof value === 'string' ? value : value.toISOString();
  // Pega apenas a parte 'YYYY-MM-DD', ignora horas/Z/T
  const dateOnly = str.split('T')[0];
  const [year, month, day] = dateOnly.split('-');
  return `${day}/${month}/${year}`;
};

export const useFinancialSummary = (selectedDate: Date = new Date()) => {
  const { expenses, categories } = useFinance();
  const { incomes } = useIncome();

  const summary = useMemo(() => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);

    // Filtrar receitas e despesas pelo mês selecionado
    const monthlyIncomes = incomes.filter(i => isWithinInterval(parseISO(i.receiveDate as unknown as string), { start: monthStart, end: monthEnd }));
    const monthlyExpenses = expenses.filter(e => isWithinInterval(parseISO(e.dueDate as unknown as string), { start: monthStart, end: monthEnd }));

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
    const processedIds = new Set<string>(); // Fix: Evitar duplicidades

    const upcomingBills = expenses
      .filter(expense => {
        if (expense.isPaid) return false;
        if (processedIds.has(expense.id)) return false; // Fix: Group by ID
        
        const dueDate = parseISO(expense.dueDate as unknown as string);
        // Verifica se a data de vencimento está entre hoje e 30 dias à frente
        const isUpcoming = isWithinInterval(dueDate, { start: today, end: next30Days });
        if (isUpcoming) processedIds.add(expense.id);
        return isUpcoming;
      })
      .sort((a, b) => parseISO(a.dueDate as unknown as string).getTime() - parseISO(b.dueDate as unknown as string).getTime())
      .slice(0, 5)
      .map(expense => ({
        id: expense.id,
        description: expense.description,
        amount: Number(expense.amount),
        dueDate: renderDateString(expense.dueDate), // Usa formatação segura para exibição
        category: categories.find(c => c.id === expense.categoryId)?.name || 'Sem Categoria'
      }));

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