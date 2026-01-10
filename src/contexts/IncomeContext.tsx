import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Income, IncomeCategory, DEFAULT_INCOME_CATEGORIES } from '@/types/income';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface IncomeContextType {
  incomes: Income[];
  incomeCategories: IncomeCategory[];
  isLoading: boolean;
  addIncome: (income: Omit<Income, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  updateIncome: (id: string, income: Partial<Income>) => Promise<void>;
  removeIncome: (id: string) => Promise<void>;
  addIncomeCategory: (category: Omit<IncomeCategory, 'id' | 'userId'>) => Promise<void>;
  updateIncomeCategory: (id: string, category: Partial<IncomeCategory>) => Promise<void>;
  removeIncomeCategory: (id: string) => Promise<void>;
  getMonthlyIncomes: (year: number, month: number) => Income[];
  getMonthlyIncomeTotal: (year: number, month: number) => number;
  getIncomeTotalByCategory: (year: number, month: number) => Record<string, number>;
  getIncomeCategoryById: (id: string) => IncomeCategory | undefined;
  refreshData: () => Promise<void>;
}

const IncomeContext = createContext<IncomeContextType | undefined>(undefined);

export function IncomeProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const [categoriesRes, incomesRes] = await Promise.all([
        supabase.from('income_categories').select('*').eq('user_id', user.id),
        supabase.from('incomes').select('*').eq('user_id', user.id).order('receive_date', { ascending: false }),
      ]);

      if (categoriesRes.data && categoriesRes.data.length > 0) {
        setIncomeCategories(categoriesRes.data.map(c => ({
          id: c.id,
          name: c.name,
          icon: c.icon,
          color: c.color,
          userId: c.user_id,
          isDefault: c.is_default,
        })));
      } else {
        // Initialize with default income categories
        const defaultCats = DEFAULT_INCOME_CATEGORIES.map(cat => ({
          ...cat,
          user_id: user.id,
        }));
        
        const { data: insertedCats } = await supabase
          .from('income_categories')
          .insert(defaultCats)
          .select();
        
        if (insertedCats) {
          setIncomeCategories(insertedCats.map(c => ({
            id: c.id,
            name: c.name,
            icon: c.icon,
            color: c.color,
            userId: c.user_id,
            isDefault: c.is_default,
          })));
        }
      }

      if (incomesRes.data) {
        setIncomes(incomesRes.data.map(i => ({
          id: i.id,
          categoryId: i.category_id || '',
          title: i.title,
          amount: Number(i.amount),
          receiveDate: new Date(i.receive_date),
          description: i.description || undefined,
          isRecurring: i.is_recurring,
          accountId: i.account_id || undefined,
          userId: i.user_id,
          createdAt: new Date(i.created_at),
        })));
      }
    } catch (error) {
      console.error('Error fetching income data:', error);
      toast.error('Erro ao carregar receitas');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchData();
    } else {
      setIncomes([]);
      setIncomeCategories([]);
    }
  }, [isAuthenticated, user, fetchData]);

  const addIncome = async (income: Omit<Income, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return;
    
    const incomesToInsert: Array<{
      user_id: string;
      category_id: string | null;
      title: string;
      amount: number;
      receive_date: string;
      description: string | null;
      is_recurring: boolean;
      account_id: string | null;
    }> = [];

    // If recurring, create 12 months of income
    if (income.isRecurring) {
      for (let i = 0; i < 12; i++) {
        const receiveDate = new Date(income.receiveDate);
        receiveDate.setMonth(receiveDate.getMonth() + i);
        
        incomesToInsert.push({
          user_id: user.id,
          category_id: income.categoryId || null,
          title: income.title,
          amount: income.amount,
          receive_date: receiveDate.toISOString().split('T')[0],
          description: income.description || null,
          is_recurring: income.isRecurring,
          account_id: income.accountId || null,
        });
      }
    } else {
      incomesToInsert.push({
        user_id: user.id,
        category_id: income.categoryId || null,
        title: income.title,
        amount: income.amount,
        receive_date: income.receiveDate.toISOString().split('T')[0],
        description: income.description || null,
        is_recurring: income.isRecurring,
        account_id: income.accountId || null,
      });
    }

    const { data, error } = await supabase
      .from('incomes')
      .insert(incomesToInsert)
      .select();
    
    if (error) {
      toast.error('Erro ao adicionar receita');
      console.error(error);
      return;
    }
    
    if (data) {
      const newIncomes = data.map(i => ({
        id: i.id,
        categoryId: i.category_id || '',
        title: i.title,
        amount: Number(i.amount),
        receiveDate: new Date(i.receive_date),
        description: i.description || undefined,
        isRecurring: i.is_recurring,
        accountId: i.account_id || undefined,
        userId: i.user_id,
        createdAt: new Date(i.created_at),
      }));
      setIncomes(prev => [...newIncomes, ...prev]);
    }
  };

  const updateIncome = async (id: string, incomeUpdate: Partial<Income>) => {
    const updateData: Record<string, unknown> = {};
    
    if (incomeUpdate.categoryId !== undefined) updateData.category_id = incomeUpdate.categoryId || null;
    if (incomeUpdate.title !== undefined) updateData.title = incomeUpdate.title;
    if (incomeUpdate.amount !== undefined) updateData.amount = incomeUpdate.amount;
    if (incomeUpdate.receiveDate !== undefined) updateData.receive_date = incomeUpdate.receiveDate.toISOString().split('T')[0];
    if (incomeUpdate.description !== undefined) updateData.description = incomeUpdate.description || null;
    if (incomeUpdate.isRecurring !== undefined) updateData.is_recurring = incomeUpdate.isRecurring;
    if (incomeUpdate.accountId !== undefined) updateData.account_id = incomeUpdate.accountId || null;

    const { error } = await supabase
      .from('incomes')
      .update(updateData)
      .eq('id', id);
    
    if (error) {
      toast.error('Erro ao atualizar receita');
      console.error(error);
      return;
    }
    
    setIncomes(prev => prev.map(i => 
      i.id === id ? { ...i, ...incomeUpdate } : i
    ));
  };

  const removeIncome = async (id: string) => {
    const { error } = await supabase
      .from('incomes')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Erro ao remover receita');
      console.error(error);
      return;
    }
    
    setIncomes(prev => prev.filter(i => i.id !== id));
  };

  const addIncomeCategory = async (category: Omit<IncomeCategory, 'id' | 'userId'>) => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('income_categories')
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
      toast.error('Erro ao adicionar categoria de receita');
      console.error(error);
      return;
    }
    
    if (data) {
      setIncomeCategories(prev => [...prev, {
        id: data.id,
        name: data.name,
        icon: data.icon,
        color: data.color,
        userId: data.user_id,
        isDefault: data.is_default,
      }]);
    }
  };

  const updateIncomeCategory = async (id: string, categoryUpdate: Partial<IncomeCategory>) => {
    const updateData: Record<string, unknown> = {};
    
    if (categoryUpdate.name !== undefined) updateData.name = categoryUpdate.name;
    if (categoryUpdate.icon !== undefined) updateData.icon = categoryUpdate.icon;
    if (categoryUpdate.color !== undefined) updateData.color = categoryUpdate.color;
    if (categoryUpdate.isDefault !== undefined) updateData.is_default = categoryUpdate.isDefault;

    const { error } = await supabase
      .from('income_categories')
      .update(updateData)
      .eq('id', id);
    
    if (error) {
      toast.error('Erro ao atualizar categoria de receita');
      console.error(error);
      return;
    }
    
    setIncomeCategories(prev => prev.map(c => 
      c.id === id ? { ...c, ...categoryUpdate } : c
    ));
  };

  const removeIncomeCategory = async (id: string) => {
    const { error } = await supabase
      .from('income_categories')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Erro ao remover categoria de receita');
      console.error(error);
      return;
    }
    
    setIncomeCategories(prev => prev.filter(c => c.id !== id));
  };

  const getMonthlyIncomes = (year: number, month: number) => {
    return incomes.filter((i) => {
      const date = new Date(i.receiveDate);
      return date.getFullYear() === year && date.getMonth() === month;
    });
  };

  const getMonthlyIncomeTotal = (year: number, month: number) => {
    const monthlyIncomes = getMonthlyIncomes(year, month);
    return monthlyIncomes.reduce((acc, income) => acc + income.amount, 0);
  };

  const getIncomeTotalByCategory = (year: number, month: number) => {
    const monthlyIncomes = getMonthlyIncomes(year, month);
    return monthlyIncomes.reduce((acc, income) => {
      acc[income.categoryId] = (acc[income.categoryId] || 0) + income.amount;
      return acc;
    }, {} as Record<string, number>);
  };

  const getIncomeCategoryById = (id: string) => {
    return incomeCategories.find((c) => c.id === id);
  };

  const refreshData = async () => {
    await fetchData();
  };

  return (
    <IncomeContext.Provider
      value={{
        incomes,
        incomeCategories,
        isLoading,
        addIncome,
        updateIncome,
        removeIncome,
        addIncomeCategory,
        updateIncomeCategory,
        removeIncomeCategory,
        getMonthlyIncomes,
        getMonthlyIncomeTotal,
        getIncomeTotalByCategory,
        getIncomeCategoryById,
        refreshData,
      }}
    >
      {children}
    </IncomeContext.Provider>
  );
}

export function useIncome() {
  const context = useContext(IncomeContext);
  if (context === undefined) {
    throw new Error('useIncome must be used within an IncomeProvider');
  }
  return context;
}
