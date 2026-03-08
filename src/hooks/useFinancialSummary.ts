import { useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useIncome } from '@/contexts/IncomeContext';
import { startOfDay, addDays, isWithinInterval, startOfMonth, endOfMonth, parseISO, format } from 'date-fns';

// Função de renderização segura para datas
const renderDateString = (value: any) => {
  // LOG DE DEBUG

  if (!value) return "-";

  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [_, year, month, day] = match;
      return `${day}/${month}/${year}`;
    }
  }

  const date = value instanceof Date ? value : new Date(value);
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

export const useFinancialSummary = (selectedDate: Date = new Date()) => {
  const { expenses, categories } = useFinance();
  const { incomes } = useIncome();

  const summary = useMemo(() => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);

    const safeParseDate = (d: any): Date => {
      if (d instanceof Date) return d;
      if (typeof d === 'string') return parseISO(d);
      return new Date(d);
    };

    // Filtrar receitas e despesas pelo mês selecionado
    const monthlyIncomes = incomes.filter(i => {
      try { return isWithinInterval(safeParseDate(i.receiveDate), { start: monthStart, end: monthEnd }); } catch { return false; }
    });
    const monthlyExpenses = expenses.filter(e => {
      try { return isWithinInterval(safeParseDate(e.dueDate), { start: monthStart, end: monthEnd }); } catch { return false; }
    });

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
        
        const dueDate = expense.dueDate instanceof Date ? expense.dueDate : parseISO(expense.dueDate as unknown as string);
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
