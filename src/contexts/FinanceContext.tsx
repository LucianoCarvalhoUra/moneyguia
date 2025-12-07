import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BankAccount, CreditCard, Expense, Category, Subcategory, DEFAULT_CATEGORIES } from '@/types/finance';
import { useAuth } from './AuthContext';

interface FinanceContextType {
  accounts: BankAccount[];
  cards: CreditCard[];
  expenses: Expense[];
  categories: Category[];
  subcategories: Subcategory[];
  addAccount: (account: Omit<BankAccount, 'id' | 'userId'>) => void;
  removeAccount: (id: string) => void;
  addCard: (card: Omit<CreditCard, 'id' | 'userId'>) => void;
  removeCard: (id: string) => void;
  addExpense: (expense: Omit<Expense, 'id' | 'userId' | 'createdAt'>) => void;
  updateExpense: (id: string, expense: Partial<Expense>) => void;
  removeExpense: (id: string) => void;
  addCategory: (category: Omit<Category, 'id' | 'userId'>) => void;
  updateCategory: (id: string, category: Partial<Category>) => void;
  removeCategory: (id: string) => void;
  addSubcategory: (subcategory: Omit<Subcategory, 'id' | 'userId'>) => void;
  updateSubcategory: (id: string, subcategory: Partial<Subcategory>) => void;
  removeSubcategory: (id: string) => void;
  getMonthlyExpenses: (year: number, month: number) => Expense[];
  getTotalByCategory: (year: number, month: number) => Record<string, number>;
  getMonthlyTotal: (year: number, month: number) => number;
  getCategoryById: (id: string) => Category | undefined;
  getSubcategoriesByCategory: (categoryId: string) => Subcategory[];
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const ACCOUNTS_KEY = 'budget_accounts';
const CARDS_KEY = 'budget_cards';
const EXPENSES_KEY = 'budget_expenses';
const CATEGORIES_KEY = 'budget_categories';
const SUBCATEGORIES_KEY = 'budget_subcategories';

export function FinanceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

  useEffect(() => {
    if (user) {
      const savedAccounts = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]');
      const savedCards = JSON.parse(localStorage.getItem(CARDS_KEY) || '[]');
      const savedExpenses = JSON.parse(localStorage.getItem(EXPENSES_KEY) || '[]');
      const savedCategories = JSON.parse(localStorage.getItem(CATEGORIES_KEY) || '[]');
      const savedSubcategories = JSON.parse(localStorage.getItem(SUBCATEGORIES_KEY) || '[]');

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

      // Load categories or initialize with defaults
      const userCategories = savedCategories.filter((c: Category) => c.userId === user.id);
      if (userCategories.length === 0) {
        const defaultCats = DEFAULT_CATEGORIES.map(cat => ({ ...cat, userId: user.id }));
        setCategories(defaultCats);
        saveCategories(defaultCats);
      } else {
        setCategories(userCategories);
      }

      setSubcategories(savedSubcategories.filter((s: Subcategory) => s.userId === user.id));
    } else {
      setAccounts([]);
      setCards([]);
      setExpenses([]);
      setCategories([]);
      setSubcategories([]);
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

  const saveCategories = (newCategories: Category[]) => {
    const allCategories = JSON.parse(localStorage.getItem(CATEGORIES_KEY) || '[]');
    const otherCategories = allCategories.filter((c: Category) => c.userId !== user?.id);
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify([...otherCategories, ...newCategories]));
  };

  const saveSubcategories = (newSubcategories: Subcategory[]) => {
    const allSubcategories = JSON.parse(localStorage.getItem(SUBCATEGORIES_KEY) || '[]');
    const otherSubcategories = allSubcategories.filter((s: Subcategory) => s.userId !== user?.id);
    localStorage.setItem(SUBCATEGORIES_KEY, JSON.stringify([...otherSubcategories, ...newSubcategories]));
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

  const addCategory = (category: Omit<Category, 'id' | 'userId'>) => {
    if (!user) return;
    const newCategory: Category = {
      ...category,
      id: crypto.randomUUID(),
      userId: user.id,
    };
    const newCategories = [...categories, newCategory];
    setCategories(newCategories);
    saveCategories(newCategories);
  };

  const updateCategory = (id: string, categoryUpdate: Partial<Category>) => {
    const newCategories = categories.map((c) =>
      c.id === id ? { ...c, ...categoryUpdate } : c
    );
    setCategories(newCategories);
    saveCategories(newCategories);
  };

  const removeCategory = (id: string) => {
    const newCategories = categories.filter((c) => c.id !== id);
    setCategories(newCategories);
    saveCategories(newCategories);
    // Also remove associated subcategories
    const newSubcategories = subcategories.filter((s) => s.categoryId !== id);
    setSubcategories(newSubcategories);
    saveSubcategories(newSubcategories);
  };

  const addSubcategory = (subcategory: Omit<Subcategory, 'id' | 'userId'>) => {
    if (!user) return;
    const newSubcategory: Subcategory = {
      ...subcategory,
      id: crypto.randomUUID(),
      userId: user.id,
    };
    const newSubcategories = [...subcategories, newSubcategory];
    setSubcategories(newSubcategories);
    saveSubcategories(newSubcategories);
  };

  const updateSubcategory = (id: string, subcategoryUpdate: Partial<Subcategory>) => {
    const newSubcategories = subcategories.map((s) =>
      s.id === id ? { ...s, ...subcategoryUpdate } : s
    );
    setSubcategories(newSubcategories);
    saveSubcategories(newSubcategories);
  };

  const removeSubcategory = (id: string) => {
    const newSubcategories = subcategories.filter((s) => s.id !== id);
    setSubcategories(newSubcategories);
    saveSubcategories(newSubcategories);
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
      acc[expense.categoryId] = (acc[expense.categoryId] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);
  };

  const getMonthlyTotal = (year: number, month: number) => {
    const monthlyExpenses = getMonthlyExpenses(year, month);
    return monthlyExpenses.reduce((acc, expense) => acc + expense.amount, 0);
  };

  const getCategoryById = (id: string) => {
    return categories.find((c) => c.id === id);
  };

  const getSubcategoriesByCategory = (categoryId: string) => {
    return subcategories.filter((s) => s.categoryId === categoryId);
  };

  return (
    <FinanceContext.Provider
      value={{
        accounts,
        cards,
        expenses,
        categories,
        subcategories,
        addAccount,
        removeAccount,
        addCard,
        removeCard,
        addExpense,
        updateExpense,
        removeExpense,
        addCategory,
        updateCategory,
        removeCategory,
        addSubcategory,
        updateSubcategory,
        removeSubcategory,
        getMonthlyExpenses,
        getTotalByCategory,
        getMonthlyTotal,
        getCategoryById,
        getSubcategoriesByCategory,
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
