import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BankAccount, CreditCard, Expense } from '@/types/finance';
import { useAuth } from './AuthContext';

interface FinanceContextType {
  accounts: BankAccount[];
  cards: CreditCard[];
  expenses: Expense[];
  addAccount: (account: Omit<BankAccount, 'id' | 'userId'>) => void;
  removeAccount: (id: string) => void;
  addCard: (card: Omit<CreditCard, 'id' | 'userId'>) => void;
  removeCard: (id: string) => void;
  addExpense: (expense: Omit<Expense, 'id' | 'userId' | 'createdAt'>) => void;
  updateExpense: (id: string, expense: Partial<Expense>) => void;
  removeExpense: (id: string) => void;
  getMonthlyExpenses: (year: number, month: number) => Expense[];
  getTotalByCategory: (year: number, month: number) => Record<string, number>;
  getMonthlyTotal: (year: number, month: number) => number;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const ACCOUNTS_KEY = 'budget_accounts';
const CARDS_KEY = 'budget_cards';
const EXPENSES_KEY = 'budget_expenses';

export function FinanceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    if (user) {
      const savedAccounts = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]');
      const savedCards = JSON.parse(localStorage.getItem(CARDS_KEY) || '[]');
      const savedExpenses = JSON.parse(localStorage.getItem(EXPENSES_KEY) || '[]');

      setAccounts(savedAccounts.filter((a: BankAccount) => a.userId === user.id));
      setCards(savedCards.filter((c: CreditCard) => c.userId === user.id));
      setExpenses(
        savedExpenses
          .filter((e: Expense) => e.userId === user.id)
          .map((e: any) => ({
            ...e,
            expenseDate: new Date(e.expenseDate),
            dueDate: new Date(e.dueDate),
            createdAt: new Date(e.createdAt),
          }))
      );
    } else {
      setAccounts([]);
      setCards([]);
      setExpenses([]);
    }
  }, [user]);

  const saveAccounts = (newAccounts: BankAccount[]) => {
    const allAccounts = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]');
    const otherAccounts = allAccounts.filter((a: BankAccount) => a.userId !== user?.id);
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([...otherAccounts, ...newAccounts]));
  };

  const saveCards = (newCards: CreditCard[]) => {
    const allCards = JSON.parse(localStorage.getItem(CARDS_KEY) || '[]');
    const otherCards = allCards.filter((c: CreditCard) => c.userId !== user?.id);
    localStorage.setItem(CARDS_KEY, JSON.stringify([...otherCards, ...newCards]));
  };

  const saveExpenses = (newExpenses: Expense[]) => {
    const allExpenses = JSON.parse(localStorage.getItem(EXPENSES_KEY) || '[]');
    const otherExpenses = allExpenses.filter((e: Expense) => e.userId !== user?.id);
    localStorage.setItem(EXPENSES_KEY, JSON.stringify([...otherExpenses, ...newExpenses]));
  };

  const addAccount = (account: Omit<BankAccount, 'id' | 'userId'>) => {
    if (!user) return;
    const newAccount: BankAccount = {
      ...account,
      id: crypto.randomUUID(),
      userId: user.id,
    };
    const newAccounts = [...accounts, newAccount];
    setAccounts(newAccounts);
    saveAccounts(newAccounts);
  };

  const removeAccount = (id: string) => {
    const newAccounts = accounts.filter((a) => a.id !== id);
    setAccounts(newAccounts);
    saveAccounts(newAccounts);
  };

  const addCard = (card: Omit<CreditCard, 'id' | 'userId'>) => {
    if (!user) return;
    const newCard: CreditCard = {
      ...card,
      id: crypto.randomUUID(),
      userId: user.id,
    };
    const newCards = [...cards, newCard];
    setCards(newCards);
    saveCards(newCards);
  };

  const removeCard = (id: string) => {
    const newCards = cards.filter((c) => c.id !== id);
    setCards(newCards);
    saveCards(newCards);
  };

  const addExpense = (expense: Omit<Expense, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return;
    
    const expensesToAdd: Expense[] = [];
    
    if (expense.isRecurring && expense.installments && expense.installments > 1) {
      // Create installments
      for (let i = 0; i < expense.installments; i++) {
        const dueDate = new Date(expense.dueDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        
        expensesToAdd.push({
          ...expense,
          id: crypto.randomUUID(),
          userId: user.id,
          createdAt: new Date(),
          dueDate,
          currentInstallment: i + 1,
          description: `${expense.description} (${i + 1}/${expense.installments})`,
        });
      }
    } else {
      expensesToAdd.push({
        ...expense,
        id: crypto.randomUUID(),
        userId: user.id,
        createdAt: new Date(),
      });
    }

    const newExpenses = [...expenses, ...expensesToAdd];
    setExpenses(newExpenses);
    saveExpenses(newExpenses);
  };

  const updateExpense = (id: string, expenseUpdate: Partial<Expense>) => {
    const newExpenses = expenses.map((e) =>
      e.id === id ? { ...e, ...expenseUpdate } : e
    );
    setExpenses(newExpenses);
    saveExpenses(newExpenses);
  };

  const removeExpense = (id: string) => {
    const newExpenses = expenses.filter((e) => e.id !== id);
    setExpenses(newExpenses);
    saveExpenses(newExpenses);
  };

  const getMonthlyExpenses = (year: number, month: number) => {
    return expenses.filter((e) => {
      const date = new Date(e.dueDate);
      return date.getFullYear() === year && date.getMonth() === month;
    });
  };

  const getTotalByCategory = (year: number, month: number) => {
    const monthlyExpenses = getMonthlyExpenses(year, month);
    return monthlyExpenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);
  };

  const getMonthlyTotal = (year: number, month: number) => {
    const monthlyExpenses = getMonthlyExpenses(year, month);
    return monthlyExpenses.reduce((acc, expense) => acc + expense.amount, 0);
  };

  return (
    <FinanceContext.Provider
      value={{
        accounts,
        cards,
        expenses,
        addAccount,
        removeAccount,
        addCard,
        removeCard,
        addExpense,
        updateExpense,
        removeExpense,
        getMonthlyExpenses,
        getTotalByCategory,
        getMonthlyTotal,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (context === undefined) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
}
