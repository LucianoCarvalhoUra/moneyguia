import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Income, IncomeCategory, IncomeSubcategory, DEFAULT_INCOME_CATEGORIES } from '@/types/income';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface IncomeContextType {
  incomes: Income[];
  incomeCategories: IncomeCategory[];
  incomeSubcategories: IncomeSubcategory[];
  isLoading: boolean;
  addIncome: (income: Omit<Income, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  updateIncome: (id: string, income: Partial<Income>) => Promise<void>;
  removeIncome: (id: string) => Promise<void>;
  addIncomeCategory: (category: Omit<IncomeCategory, 'id' | 'userId'>) => Promise<void>;
  updateIncomeCategory: (id: string, category: Partial<IncomeCategory>) => Promise<void>;
  removeIncomeCategory: (id: string) => Promise<void>;
  addIncomeSubcategory: (subcategory: Omit<IncomeSubcategory, 'id' | 'userId'>) => Promise<void>;
  updateIncomeSubcategory: (id: string, subcategory: Partial<IncomeSubcategory>) => Promise<void>;
  removeIncomeSubcategory: (id: string) => Promise<void>;
  getIncomeSubcategoriesByCategory: (categoryId: string) => IncomeSubcategory[];
  getMonthlyIncomes: (year: number, month: number) => Income[];
  getMonthlyIncomeTotal: (year: number, month: number) => number;
  getIncomeTotalByCategory: (year: number, month: number) => Record<string, number>;
  getIncomeCategoryById: (id: string) => IncomeCategory | undefined;
  getIncomeSubcategoryById: (id: string) => IncomeSubcategory | undefined;
  refreshData: () => Promise<void>;
}

const IncomeContext = createContext<IncomeContextType | undefined>(undefined);

// Mapping for migrating old/default income categories
const INCOME_CATEGORY_MAPPING: Record<string, { icon: string, color: string }> = {
  'Salário': { icon: 'Banknote', color: 'green-500' },
  'Trabalho': { icon: 'Briefcase', color: 'slate-500' },
  'Investimentos': { icon: 'TrendingUp', color: 'green-500' },
  'Freelance': { icon: 'Coins', color: 'blue-500' },
  'Aluguel': { icon: 'Building', color: 'emerald-500' },
};

export function IncomeProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>([]);
  const [incomeSubcategories, setIncomeSubcategories] = useState<IncomeSubcategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const [categoriesRes, subcategoriesRes, incomesRes] = await Promise.all([
        supabase.from('income_categories').select('*').eq('user_id', user.id),
        supabase.from('income_subcategories').select('*').eq('user_id', user.id),
        supabase.from('incomes').select('*').eq('user_id', user.id).order('receive_date', { ascending: false }),
      ]);

      if (categoriesRes.data && categoriesRes.data.length > 0) {
        const loadedCategories = categoriesRes.data.map(c => {
          // Check if this category needs migration
          const mapping = INCOME_CATEGORY_MAPPING[c.name];
          if (mapping && (c.icon !== mapping.icon || c.color !== mapping.color)) {
             // Update in background
             supabase.from('income_categories').update({ icon: mapping.icon, color: mapping.color }).eq('id', c.id).then();
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
        setIncomeCategories(loadedCategories.sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        // Initialize with default income categories
        const defaultCats = DEFAULT_INCOME_CATEGORIES.map(cat => {
          const mapping = INCOME_CATEGORY_MAPPING[cat.name];
          return {
          ...cat,
          icon: mapping ? mapping.icon : cat.icon,
          color: mapping ? mapping.color : cat.color,
          user_id: user.id,
        }});
        
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
          })).sort((a, b) => a.name.localeCompare(b.name)));
        }
      }

      if (subcategoriesRes.data) {
        setIncomeSubcategories(subcategoriesRes.data.map(s => ({
          id: s.id,
          name: s.name,
          categoryId: s.category_id,
          userId: s.user_id,
        })));
      }

      if (incomesRes.data) {
        setIncomes(incomesRes.data.map(i => {
          // Parse date string as local date to avoid timezone issues
          const [year, month, day] = i.receive_date.split('-').map(Number);
          const receiveDate = new Date(year, month - 1, day);
          
          return {
            id: i.id,
            categoryId: i.category_id || '',
            subcategoryId: i.subcategory_id || undefined,
            title: i.title,
            amount: Number(i.amount),
            receiveDate,
            description: i.description || undefined,
            isRecurring: i.is_recurring,
            isReceived: i.is_received ?? false,
            accountId: i.account_id || undefined,
            userId: i.user_id,
            createdAt: new Date(i.created_at),
          };
        }));
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
      setIncomeSubcategories([]);
    }
  }, [isAuthenticated, user, fetchData]);

  const addIncome = async (income: Omit<Income, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return;
    
    const incomesToInsert: Array<{
      user_id: string;
      category_id: string | null;
      subcategory_id: string | null;
      title: string;
      amount: number;
      receive_date: string;
      description: string | null;
      is_recurring: boolean;
      is_received: boolean;
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
          subcategory_id: income.subcategoryId || null,
          title: income.title,
          amount: income.amount,
          receive_date: receiveDate.toISOString().split('T')[0],
          description: income.description || null,
          is_recurring: income.isRecurring,
          is_received: income.isReceived ?? false,
          account_id: income.accountId || null,
        });
      }
    } else {
      incomesToInsert.push({
        user_id: user.id,
        category_id: income.categoryId || null,
        subcategory_id: income.subcategoryId || null,
        title: income.title,
        amount: income.amount,
        receive_date: income.receiveDate.toISOString().split('T')[0],
        description: income.description || null,
        is_recurring: income.isRecurring,
        is_received: income.isReceived ?? false,
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
      const newIncomes = data.map(i => {
        // Parse date string as local date to avoid timezone issues
        const [year, month, day] = i.receive_date.split('-').map(Number);
        const receiveDate = new Date(year, month - 1, day);
        
        return {
          id: i.id,
          categoryId: i.category_id || '',
          subcategoryId: i.subcategory_id || undefined,
          title: i.title,
          amount: Number(i.amount),
          receiveDate,
          description: i.description || undefined,
          isRecurring: i.is_recurring,
          isReceived: i.is_received ?? false,
          accountId: i.account_id || undefined,
          userId: i.user_id,
          createdAt: new Date(i.created_at),
        };
      });
      setIncomes(prev => [...newIncomes, ...prev]);
    }
  };

  const updateIncome = async (id: string, incomeUpdate: Partial<Income>) => {
    const updateData: Record<string, unknown> = {};
    
    if (incomeUpdate.categoryId !== undefined) updateData.category_id = incomeUpdate.categoryId || null;
    if (incomeUpdate.subcategoryId !== undefined) updateData.subcategory_id = incomeUpdate.subcategoryId || null;
    if (incomeUpdate.title !== undefined) updateData.title = incomeUpdate.title;
    if (incomeUpdate.amount !== undefined) updateData.amount = incomeUpdate.amount;
    if (incomeUpdate.receiveDate !== undefined) updateData.receive_date = incomeUpdate.receiveDate.toISOString().split('T')[0];
    if (incomeUpdate.description !== undefined) updateData.description = incomeUpdate.description || null;
    if (incomeUpdate.isRecurring !== undefined) updateData.is_recurring = incomeUpdate.isRecurring;
    if (incomeUpdate.isReceived !== undefined) updateData.is_received = incomeUpdate.isReceived;
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
      }].sort((a, b) => a.name.localeCompare(b.name)));
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
    ).sort((a, b) => a.name.localeCompare(b.name)));
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
    // Also remove associated subcategories from state
    setIncomeSubcategories(prev => prev.filter(s => s.categoryId !== id));
  };

  const addIncomeSubcategory = async (subcategory: Omit<IncomeSubcategory, 'id' | 'userId'>) => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('income_subcategories')
      .insert({
        user_id: user.id,
        name: subcategory.name,
        category_id: subcategory.categoryId,
      })
      .select()
      .single();
    
    if (error) {
      toast.error('Erro ao adicionar subcategoria de receita');
      console.error(error);
      return;
    }
    
    if (data) {
      setIncomeSubcategories(prev => [...prev, {
        id: data.id,
        name: data.name,
        categoryId: data.category_id,
        userId: data.user_id,
      }]);
    }
  };

  const updateIncomeSubcategory = async (id: string, subcategoryUpdate: Partial<IncomeSubcategory>) => {
    const updateData: Record<string, unknown> = {};
    
    if (subcategoryUpdate.name !== undefined) updateData.name = subcategoryUpdate.name;
    if (subcategoryUpdate.categoryId !== undefined) updateData.category_id = subcategoryUpdate.categoryId;

    const { error } = await supabase
      .from('income_subcategories')
      .update(updateData)
      .eq('id', id);
    
    if (error) {
      toast.error('Erro ao atualizar subcategoria de receita');
      console.error(error);
      return;
    }
    
    setIncomeSubcategories(prev => prev.map(s => 
      s.id === id ? { ...s, ...subcategoryUpdate } : s
    ));
  };

  const removeIncomeSubcategory = async (id: string) => {
    const { error } = await supabase
      .from('income_subcategories')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Erro ao remover subcategoria de receita');
      console.error(error);
      return;
    }
    
    setIncomeSubcategories(prev => prev.filter(s => s.id !== id));
  };

  const getIncomeSubcategoriesByCategory = (categoryId: string) => {
    return incomeSubcategories.filter(s => s.categoryId === categoryId);
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

  const getIncomeSubcategoryById = (id: string) => {
    return incomeSubcategories.find((s) => s.id === id);
  };

  const refreshData = async () => {
    await fetchData();
  };

  return (
    <IncomeContext.Provider
      value={{
        incomes,
        incomeCategories,
        incomeSubcategories,
        isLoading,
        addIncome,
        updateIncome,
        removeIncome,
        addIncomeCategory,
        updateIncomeCategory,
        removeIncomeCategory,
        addIncomeSubcategory,
        updateIncomeSubcategory,
        removeIncomeSubcategory,
        getIncomeSubcategoriesByCategory,
        getMonthlyIncomes,
        getMonthlyIncomeTotal,
        getIncomeTotalByCategory,
        getIncomeCategoryById,
        getIncomeSubcategoryById,
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
