import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { BankAccount, CreditCard, Expense, Category, Subcategory, DEFAULT_CATEGORIES, PaymentMethod } from '@/types/finance';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FinanceContextType {
  accounts: BankAccount[];
  cards: CreditCard[];
  expenses: Expense[];
  categories: Category[];
  subcategories: Subcategory[];
  isLoading: boolean;
  addAccount: (account: Omit<BankAccount, 'id' | 'userId'>) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;
  addCard: (card: Omit<CreditCard, 'id' | 'userId'>) => Promise<void>;
  updateCard: (id: string, card: Partial<CreditCard>) => Promise<void>;
  removeCard: (id: string) => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  updateExpense: (id: string, expense: Partial<Expense>) => Promise<void>;
  removeExpense: (id: string) => Promise<void>;
  addCategory: (category: Omit<Category, 'id' | 'userId'>) => Promise<void>;
  updateCategory: (id: string, category: Partial<Category>) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
  addSubcategory: (subcategory: Omit<Subcategory, 'id' | 'userId'>) => Promise<void>;
  updateSubcategory: (id: string, subcategory: Partial<Subcategory>) => Promise<void>;
  removeSubcategory: (id: string) => Promise<void>;
  getMonthlyExpenses: (year: number, month: number) => Expense[];
  getTotalByCategory: (year: number, month: number) => Record<string, number>;
  getMonthlyTotal: (year: number, month: number) => number;
  getCategoryById: (id: string) => Category | undefined;
  getSubcategoryById: (id: string) => Subcategory | undefined;
  getSubcategoriesByCategory: (categoryId: string) => Subcategory[];
  refreshData: () => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

// Mapping for migrating old/default categories to new icons and colors
const EXPENSE_CATEGORY_MAPPING: Record<string, { icon: string, color: string }> = {
  'Alimentação': { icon: 'UtensilsCrossed', color: 'orange-500' },
  'Transporte': { icon: 'CarFront', color: 'slate-500' },
  'Carro': { icon: 'CarFront', color: 'slate-500' },
  'Lazer': { icon: 'Sparkles', color: 'violet-500' },
  'Saúde': { icon: 'HeartPulse', color: 'red-500' },
  'Educação': { icon: 'BookOpenCheck', color: 'indigo-500' },
  'Doação': { icon: 'Heart', color: 'pink-500' },
  'Doações': { icon: 'Heart', color: 'pink-500' },
  'Moradia': { icon: 'Home', color: 'blue-500' },
  'Casa': { icon: 'Home', color: 'blue-500' },
  'Compras': { icon: 'ShoppingBag', color: 'violet-500' },
  'Cartão': { icon: 'CreditCard', color: 'indigo-500' },
  'Contas Básicas': { icon: 'Zap', color: 'amber-500' },
  'Contas': { icon: 'Zap', color: 'amber-500' },
  'Dependentes': { icon: 'Users', color: 'cyan-500' },
  'Pessoal': { icon: 'User', color: 'violet-500' },
};

export function FinanceProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Fetch all data in parallel
      const [accountsRes, cardsRes, categoriesRes, subcategoriesRes, expensesRes] = await Promise.all([
        supabase.from('bank_accounts').select('*').eq('user_id', user.id),
        supabase.from('credit_cards').select('*').eq('user_id', user.id),
        supabase.from('categories').select('*').eq('user_id', user.id),
        supabase.from('subcategories').select('*').eq('user_id', user.id),
        supabase
          .from('expenses')
          .select('*')
          .eq('user_id', user.id)
          .order('expense_date', { ascending: false }),
      ]);

      if (accountsRes.data) {
        setAccounts(accountsRes.data.map(a => ({
          id: a.id,
          bankName: a.bank_name,
          agency: a.agency,
          accountNumber: a.account_number,
          userId: a.user_id,
        })));
      }

      if (cardsRes.data) {
        setCards(cardsRes.data.map(c => ({
          id: c.id,
          brand: c.brand,
          lastFourDigits: c.last_four_digits,
          userId: c.user_id,
        })));
      }

      if (categoriesRes.data && categoriesRes.data.length > 0) {
        const loadedCategories = categoriesRes.data.map(c => {
          // Check if this category needs migration
          const mapping = EXPENSE_CATEGORY_MAPPING[c.name];
          // Only migrate if it matches a known name and has a different icon/color (or default emoji)
          if (mapping && (c.icon !== mapping.icon || c.color !== mapping.color)) {
             // We'll update it in the background, but use the new values for state immediately
             supabase.from('categories').update({ icon: mapping.icon, color: mapping.color }).eq('id', c.id).then();
             return {
               id: c.id,
               name: c.name,
               icon: mapping.icon,
               color: mapping.color,
               userId: c.user_id,
               isDefault: c.is_default,
             };
          }
          return {
            id: c.id,
            name: c.name,
            icon: c.icon,
            color: c.color,
            userId: c.user_id,
            isDefault: c.is_default,
          };
        });
        setCategories(loadedCategories.sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        // Initialize with default categories
        const defaultCats = DEFAULT_CATEGORIES.map(cat => {
          const mapping = EXPENSE_CATEGORY_MAPPING[cat.name];
          return {
          ...cat,
          icon: mapping ? mapping.icon : cat.icon,
          color: mapping ? mapping.color : cat.color,
          user_id: user.id,
        }});
        
        const { data: insertedCats } = await supabase
          .from('categories')
          .insert(defaultCats)
          .select();
        
        if (insertedCats) {
          setCategories(insertedCats.map(c => ({
            id: c.id,
            name: c.name,
            icon: c.icon,
            color: c.color,
            userId: c.user_id,
            isDefault: c.is_default,
          })).sort((a, b) => a.name.localeCompare(b.name)));
        }
      }

      if (subcategoriesRes.data) {
        setSubcategories(subcategoriesRes.data.map(s => ({
          id: s.id,
          name: s.name,
          categoryId: s.category_id,
          userId: s.user_id,
        })));
      }

      if (expensesRes.data) {
        setExpenses((expensesRes.data as any[]).map(e => {
          const parseLocalDate = (dateStr: string) => {
            const parts = dateStr.split('T')[0].split('-').map(Number);
            return new Date(parts[0], parts[1] - 1, parts[2]);
          };
          return {
            id: e.id,
            categoryId: e.category_id || '',
            subcategoryId: e.subcategory_id || undefined,
            description: e.description,
            amount: Number(e.amount),
            expenseDate: parseLocalDate(e.expense_date),
            dueDate: parseLocalDate(e.due_date),
            paymentMethod: e.payment_method as PaymentMethod,
            accountId: e.account_id || undefined,
            cardId: e.card_id || undefined,
            isRecurring: e.is_recurring,
            installments: e.installments || undefined,
            currentInstallment: e.current_installment || undefined,
            observation: e.observation || undefined,
            isPaid: e.is_paid ?? false,
            recurrenceId: (e as any).recurrence_id || undefined,
            userId: e.user_id,
            excludeFromCalculations: e.exclude_from_calculations ?? false,
            classificationType: (e as any).classification_type || 'variavel',
            recurrenceType: (e as any).recurrence_type || 'variavel',
            createdAt: new Date(e.created_at),
          } as unknown as Expense;
        }));
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchData();
    } else {
      setAccounts([]);
      setCards([]);
      setExpenses([]);
      setCategories([]);
      setSubcategories([]);
    }
  }, [isAuthenticated, user, fetchData]);

  const addAccount = async (account: Omit<BankAccount, 'id' | 'userId'>) => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('bank_accounts')
      .insert({
        user_id: user.id,
        bank_name: account.bankName,
        agency: account.agency,
        account_number: account.accountNumber,
      })
      .select()
      .single();
    
    if (error) {
      toast.error('Erro ao adicionar conta');
      console.error(error);
      return;
    }
    
    if (data) {
      setAccounts(prev => [...prev, {
        id: data.id,
        bankName: data.bank_name,
        agency: data.agency,
        accountNumber: data.account_number,
        userId: data.user_id,
      }]);
    }
  };

  const removeAccount = async (id: string) => {
    const { error } = await supabase
      .from('bank_accounts')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Erro ao remover conta');
      console.error(error);
      return;
    }
    
    setAccounts(prev => prev.filter(a => a.id !== id));
  };

  const addCard = async (card: Omit<CreditCard, 'id' | 'userId'>) => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('credit_cards')
      .insert({
        user_id: user.id,
        brand: card.brand,
        last_four_digits: card.lastFourDigits,
      })
      .select()
      .single();
    
    if (error) {
      toast.error('Erro ao adicionar cartão');
      console.error(error);
      return;
    }
    
    if (data) {
      setCards(prev => [...prev, {
        id: data.id,
        brand: data.brand,
        lastFourDigits: data.last_four_digits,
        userId: data.user_id,
      }]);
    }
  };

  const updateCard = async (id: string, cardUpdate: Partial<CreditCard>) => {
    const updateData: Record<string, unknown> = {};
    
    if (cardUpdate.brand !== undefined) updateData.brand = cardUpdate.brand;
    if (cardUpdate.lastFourDigits !== undefined) updateData.last_four_digits = cardUpdate.lastFourDigits;

    const { error } = await supabase
      .from('credit_cards')
      .update(updateData)
      .eq('id', id);
    
    if (error) {
      toast.error('Erro ao atualizar cartão');
      console.error(error);
      return;
    }
    
    setCards(prev => prev.map(c => 
      c.id === id ? { ...c, ...cardUpdate } : c
    ));
  };

  const removeCard = async (id: string) => {
    const { error } = await supabase
      .from('credit_cards')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Erro ao remover cartão');
      console.error(error);
      return;
    }
    
    setCards(prev => prev.filter(c => c.id !== id));
  };

  const addExpense = async (expense: Omit<Expense, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return;
    
    // Gera recurrence_id se for recorrente
    const recurrenceId = expense.isRecurring ? (expense.recurrenceId || crypto.randomUUID()) : null;
    
    const expensesToInsert: Array<{
      user_id: string;
      category_id: string | null;
      subcategory_id: string | null;
      description: string;
      amount: number;
      expense_date: string;
      due_date: string;
      payment_method: PaymentMethod;
      account_id: string | null;
      card_id: string | null;
      is_recurring: boolean;
      installments: number | null;
      current_installment: number | null;
      observation: string | null;
      recurrence_id: string | null;
      exclude_from_calculations: boolean;
    }> = [];
    
    if (expense.isRecurring && expense.installments && expense.installments > 1) {
      for (let i = 0; i < expense.installments; i++) {
        const expenseDate = new Date(expense.expenseDate);
        expenseDate.setMonth(expenseDate.getMonth() + i);
        
        const dueDate = new Date(expense.dueDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        
        expensesToInsert.push({
          user_id: user.id,
          category_id: expense.categoryId || null,
          subcategory_id: expense.subcategoryId || null,
          description: `${expense.description} (${i + 1}/${expense.installments})`,
          amount: expense.amount,
          expense_date: expenseDate.toISOString().split('T')[0],
          due_date: dueDate.toISOString().split('T')[0],
          payment_method: expense.paymentMethod,
          account_id: expense.accountId || null,
          card_id: expense.cardId || null,
          is_recurring: expense.isRecurring,
          installments: expense.installments || null,
          current_installment: i + 1,
          observation: expense.observation || null,
          recurrence_id: recurrenceId,
          exclude_from_calculations: expense.excludeFromCalculations || false,
        });
      }
    } else {
      expensesToInsert.push({
        user_id: user.id,
        category_id: expense.categoryId || null,
        subcategory_id: expense.subcategoryId || null,
        description: expense.description,
        amount: expense.amount,
        expense_date: expense.expenseDate.toISOString().split('T')[0],
        due_date: expense.dueDate.toISOString().split('T')[0],
        payment_method: expense.paymentMethod,
        account_id: expense.accountId || null,
        card_id: expense.cardId || null,
        is_recurring: expense.isRecurring,
        installments: expense.installments || null,
        current_installment: expense.currentInstallment || null,
        observation: expense.observation || null,
        recurrence_id: recurrenceId,
        exclude_from_calculations: expense.excludeFromCalculations || false,
      });
    }

    const { data, error } = await (supabase
      .from('expenses') as any)
      .insert(expensesToInsert)
      .select('*');
    
    if (error) {
      toast.error('Erro ao adicionar despesa');
      console.error(error);
      return;
    }
    
    if (data) {
      const parseLocalDate = (dateStr: string) => {
        const parts = dateStr.split('T')[0].split('-').map(Number);
        return new Date(parts[0], parts[1] - 1, parts[2]);
      };
      const newExpenses: Expense[] = data.map((e: any) => ({
        id: e.id,
        categoryId: e.category_id || '',
        subcategoryId: e.subcategory_id || undefined,
        description: e.description,
        amount: Number(e.amount),
        expenseDate: parseLocalDate(e.expense_date),
        dueDate: parseLocalDate(e.due_date),
        paymentMethod: e.payment_method as PaymentMethod,
        accountId: e.account_id || undefined,
        cardId: e.card_id || undefined,
        isRecurring: e.is_recurring,
        installments: e.installments || undefined,
        currentInstallment: e.current_installment || undefined,
        observation: e.observation || undefined,
        isPaid: e.is_paid ?? false,
        recurrenceId: e.recurrence_id || undefined,
        userId: e.user_id,
        excludeFromCalculations: e.exclude_from_calculations ?? false,
        createdAt: new Date(e.created_at),
      } as unknown as Expense));
      setExpenses(prev => [...newExpenses, ...prev]);
    }
  };

  const updateExpense = async (id: string, expenseUpdate: Partial<Expense>) => {
    const updateData: Record<string, unknown> = {};
    
    if (expenseUpdate.categoryId !== undefined) updateData.category_id = expenseUpdate.categoryId || null;
    if (expenseUpdate.subcategoryId !== undefined) updateData.subcategory_id = expenseUpdate.subcategoryId || null;
    if (expenseUpdate.description !== undefined) updateData.description = expenseUpdate.description;
    if (expenseUpdate.amount !== undefined) updateData.amount = expenseUpdate.amount;
    if (expenseUpdate.expenseDate !== undefined) {
      const d = expenseUpdate.expenseDate;
      updateData.expense_date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    if (expenseUpdate.dueDate !== undefined) {
      const d = expenseUpdate.dueDate;
      updateData.due_date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    if (expenseUpdate.paymentMethod !== undefined) updateData.payment_method = expenseUpdate.paymentMethod;
    if (expenseUpdate.accountId !== undefined) updateData.account_id = expenseUpdate.accountId || null;
    if (expenseUpdate.cardId !== undefined) updateData.card_id = expenseUpdate.cardId || null;
    if (expenseUpdate.isRecurring !== undefined) updateData.is_recurring = expenseUpdate.isRecurring;
    if (expenseUpdate.installments !== undefined) updateData.installments = expenseUpdate.installments || null;
    if (expenseUpdate.currentInstallment !== undefined) updateData.current_installment = expenseUpdate.currentInstallment || null;
    if (expenseUpdate.observation !== undefined) updateData.observation = expenseUpdate.observation || null;
    if (expenseUpdate.isPaid !== undefined) updateData.is_paid = expenseUpdate.isPaid;
    if (expenseUpdate.excludeFromCalculations !== undefined) updateData.exclude_from_calculations = expenseUpdate.excludeFromCalculations;
    if ((expenseUpdate as any).classificationType !== undefined) updateData.classification_type = (expenseUpdate as any).classificationType;
    if ((expenseUpdate as any).recurrenceType !== undefined) updateData.recurrence_type = (expenseUpdate as any).recurrenceType;

    let { error } = await supabase
      .from('expenses')
      .update(updateData)
      .eq('id', id);

    if ((error as any)?.code === 'PGRST204') {
      const retryResult = await supabase
        .from('expenses')
        .update(updateData)
        .eq('id', id);
      error = retryResult.error;
    }
    
    if (error) {
      toast.error('Erro ao atualizar despesa');
      console.error(error);
      return;
    }
    
    setExpenses(prev => prev.map(e => 
      e.id === id ? { ...e, ...expenseUpdate } : e
    ));
  };

  const removeExpense = async (id: string) => {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Erro ao remover despesa');
      console.error(error);
      return;
    }
    
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const addCategory = async (category: Omit<Category, 'id' | 'userId'>) => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('categories')
      .insert({
        user_id: user.id,
        name: category.name,
        icon: category.icon,
        color: category.color,
        is_default: category.isDefault || false,
      })
      .select()
      .single();
    
    if (error) {
      toast.error('Erro ao adicionar categoria');
      console.error(error);
      return;
    }
    
    if (data) {
      setCategories(prev => [...prev, {
        id: data.id,
        name: data.name,
        icon: data.icon,
        color: data.color,
        userId: data.user_id,
        isDefault: data.is_default,
      }].sort((a, b) => a.name.localeCompare(b.name)));
    }
  };

  const updateCategory = async (id: string, categoryUpdate: Partial<Category>) => {
    const updateData: Record<string, unknown> = {};
    
    if (categoryUpdate.name !== undefined) updateData.name = categoryUpdate.name;
    if (categoryUpdate.icon !== undefined) updateData.icon = categoryUpdate.icon;
    if (categoryUpdate.color !== undefined) updateData.color = categoryUpdate.color;
    if (categoryUpdate.isDefault !== undefined) updateData.is_default = categoryUpdate.isDefault;

    const { error } = await supabase
      .from('categories')
      .update(updateData)
      .eq('id', id);
    
    if (error) {
      toast.error('Erro ao atualizar categoria');
      console.error(error);
      return;
    }
    
    setCategories(prev => prev.map(c => 
      c.id === id ? { ...c, ...categoryUpdate } : c
    ).sort((a, b) => a.name.localeCompare(b.name)));
  };

  const removeCategory = async (id: string) => {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Erro ao remover categoria');
      console.error(error);
      return;
    }
    
    setCategories(prev => prev.filter(c => c.id !== id));
    // Subcategories are deleted by cascade in database
    setSubcategories(prev => prev.filter(s => s.categoryId !== id));
  };

  const addSubcategory = async (subcategory: Omit<Subcategory, 'id' | 'userId'>) => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('subcategories')
      .insert({
        user_id: user.id,
        category_id: subcategory.categoryId,
        name: subcategory.name,
      })
      .select()
      .single();
    
    if (error) {
      toast.error('Erro ao adicionar subcategoria');
      console.error(error);
      return;
    }
    
    if (data) {
      setSubcategories(prev => [...prev, {
        id: data.id,
        name: data.name,
        categoryId: data.category_id,
        userId: data.user_id,
      }]);
    }
  };

  const updateSubcategory = async (id: string, subcategoryUpdate: Partial<Subcategory>) => {
    const updateData: Record<string, unknown> = {};
    
    if (subcategoryUpdate.name !== undefined) updateData.name = subcategoryUpdate.name;
    if (subcategoryUpdate.categoryId !== undefined) updateData.category_id = subcategoryUpdate.categoryId;

    const { error } = await supabase
      .from('subcategories')
      .update(updateData)
      .eq('id', id);
    
    if (error) {
      toast.error('Erro ao atualizar subcategoria');
      console.error(error);
      return;
    }
    
    setSubcategories(prev => prev.map(s => 
      s.id === id ? { ...s, ...subcategoryUpdate } : s
    ));
  };

  const removeSubcategory = async (id: string) => {
    const { error } = await supabase
      .from('subcategories')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Erro ao remover subcategoria');
      console.error(error);
      return;
    }
    
    setSubcategories(prev => prev.filter(s => s.id !== id));
  };

  const getMonthlyExpenses = (year: number, month: number) => {
    return expenses.filter((e) => {
      const date = new Date(e.dueDate);
      return date.getFullYear() === year && date.getMonth() === month;
    });
  };

  const getTotalByCategory = (year: number, month: number) => {
    const monthlyExpenses = getMonthlyExpenses(year, month);
    return monthlyExpenses.filter(e => !e.excludeFromCalculations).reduce((acc, expense) => {
      acc[expense.categoryId] = (acc[expense.categoryId] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);
  };

  const getMonthlyTotal = (year: number, month: number) => {
    const monthlyExpenses = getMonthlyExpenses(year, month);
    return monthlyExpenses.filter(e => !e.excludeFromCalculations).reduce((acc, expense) => acc + expense.amount, 0);
  };

  const getCategoryById = (id: string) => {
    return categories.find((c) => c.id === id);
  };

  const getSubcategoryById = (id: string) => {
    return subcategories.find((s) => s.id === id);
  };

  const getSubcategoriesByCategory = (categoryId: string) => {
    return subcategories.filter((s) => s.categoryId === categoryId);
  };

  const refreshData = async () => {
    await fetchData();
  };

  return (
    <FinanceContext.Provider
      value={{
        accounts,
        cards,
        expenses,
        categories,
        subcategories,
        isLoading,
        addAccount,
        removeAccount,
        addCard,
        updateCard,
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
        getSubcategoryById,
        getSubcategoriesByCategory,
        refreshData,
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

