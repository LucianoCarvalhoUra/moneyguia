import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Income, IncomeCategory, IncomeSubcategory, DEFAULT_INCOME_CATEGORIES } from '@/types/income';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getRecurrenceQuotaStatus } from '@/lib/recurrenceQuota';
import { format, parseISO } from 'date-fns';
import { getNthBusinessDay, adjustToBusinessDay } from '@/lib/businessDays';

interface IncomeContextType {
  incomes: Income[];
  incomeCategories: IncomeCategory[];
  incomeSubcategories: IncomeSubcategory[];
  isLoading: boolean;
  addIncome: (income: Omit<Income, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  updateIncome: (id: string, income: Partial<Income>) => Promise<void>;
  removeIncome: (id: string) => Promise<void>;
  addIncomeCategory: (category: Omit<IncomeCategory, 'id' | 'userId'>) => Promise<IncomeCategory | null>;
  updateIncomeCategory: (id: string, category: Partial<IncomeCategory>) => Promise<void>;
  removeIncomeCategory: (id: string) => Promise<void>;
  addIncomeSubcategory: (subcategory: Omit<IncomeSubcategory, 'id' | 'userId'>) => Promise<IncomeSubcategory | null>;
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

const INCOME_CATEGORY_MAPPING: Record<string, { icon: string; color: string }> = {
  'Salário': { icon: 'Banknote', color: 'green-500' },
  'Trabalho': { icon: 'Briefcase', color: 'slate-500' },
  'Investimentos': { icon: 'TrendingUp', color: 'green-500' },
  'Freelance': { icon: 'Coins', color: 'blue-500' },
  'Aluguel': { icon: 'Building', color: 'emerald-500' },
};

export function IncomeProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, subscriptionPlan } = useAuth();
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>([]);
  const [incomeSubcategories, setIncomeSubcategories] = useState<IncomeSubcategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = useCallback(async (force = false) => {
    if (!user) return;

    if (!force && incomes.length > 0 && incomeCategories.length > 0 && incomeSubcategories.length > 0) {
      return;
    }

    const hasData = incomes.length > 0 || incomeCategories.length > 0;
    if (!hasData || force) {
      setIsLoading(true);
    }

    try {
      const [categoriesRes, subcategoriesRes, incomesRes] = await Promise.all([
        supabase.from('income_categories').select('*').eq('user_id', user.id),
        supabase.from('income_subcategories').select('*').eq('user_id', user.id),
        supabase.from('incomes').select('*').eq('user_id', user.id).order('receive_date', { ascending: false }),
      ]);

      if (categoriesRes.data && categoriesRes.data.length > 0) {
        const loadedCategories = categoriesRes.data.map(c => {
          const mapping = INCOME_CATEGORY_MAPPING[c.name];
          if (mapping && (c.icon !== mapping.icon || c.color !== mapping.color)) {
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
        const defaultCats = DEFAULT_INCOME_CATEGORIES.map(cat => {
          const mapping = INCOME_CATEGORY_MAPPING[cat.name];
          return {
            name: cat.name,
            icon: mapping ? mapping.icon : cat.icon,
            color: mapping ? mapping.color : cat.color,
            is_default: cat.isDefault ?? true,
            user_id: user.id,
          };
        });

        const { data: insertedCats } = await supabase
          .from('income_categories')
          .insert(defaultCats)
          .select();

        if (insertedCats) {
          setIncomeCategories(
            insertedCats
              .map(c => ({
                id: c.id,
                name: c.name,
                icon: c.icon,
                color: c.color,
                userId: c.user_id,
                isDefault: c.is_default,
              }))
              .sort((a, b) => a.name.localeCompare(b.name))
          );
        }
      }

      if (subcategoriesRes.data) {
        setIncomeSubcategories(
          subcategoriesRes.data.map(s => ({
            id: s.id,
            name: s.name,
            categoryId: s.category_id,
            userId: s.user_id,
          }))
        );
      }

      if (incomesRes.data) {
        const rows = incomesRes.data as any[];
        const positionByRow: Record<string, { position: number; total: number }> = {};
        const groups: Record<string, any[]> = {};

        for (const r of rows) {
          const rid = r.recurrence_id;
          if (!rid) continue;
          (groups[rid] ||= []).push(r);
        }

        for (const rid of Object.keys(groups)) {
          const sorted = groups[rid].slice().sort((a, b) => {
            const da = a.receive_date || '';
            const db = b.receive_date || '';
            if (da !== db) return da.localeCompare(db);
            return (a.created_at || '').localeCompare(b.created_at || '');
          });
          const total = sorted.length;
          sorted.forEach((r, idx) => {
            positionByRow[r.id] = { position: idx + 1, total };
          });
        }

        const formattedIncomes: Income[] = rows.map((i: any) => {
          const rawDateStr = String(i.receive_date || '').split('T')[0];
          const [year, month, day] = rawDateStr.split('-').map(Number);
          const receiveDate = new Date(year, month - 1, day);
          const pos = positionByRow[i.id];

          return {
            id: i.id,
            categoryId: i.category_id || '',
            subcategoryId: i.subcategory_id || undefined,
            title: i.title,
            amount: Number(i.amount),
            receiveDate,
            description: i.description || undefined,
            isRecurring: Boolean(i.is_recurring),
            isReceived: Boolean(i.is_received),
            accountId: i.account_id || undefined,
            recurrenceId: i.recurrence_id || undefined,
            excludeFromCalculations: Boolean(i.exclude_from_calculations),
            installments: pos ? pos.total : i.installments || undefined,
            currentInstallment: pos ? pos.position : i.current_installment || undefined,
            userId: i.user_id,
            createdAt: new Date(i.created_at),
            groupId: i.group_id || undefined,
            is_scheduled: Boolean(i.is_scheduled),
            scheduled_date: i.scheduled_date || null,
            recurrenceType: i.recurrence_type || 'fixed_day',
            targetBusinessDay: i.target_business_day ?? null,
            weekendStrategy: i.weekend_strategy || 'next',
          } as any;
        });

        setIncomes(formattedIncomes);
      }
    } catch (error) {
      console.error('Error fetching income data:', error);
      toast.error('Erro ao carregar receitas');
    } finally {
      setIsLoading(false);
    }
  }, [user, incomes.length, incomeCategories.length, incomeSubcategories.length]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchData();
    } else {
      setIncomes([]);
      setIncomeCategories([]);
      setIncomeSubcategories([]);
    }
  }, [isAuthenticated, user, fetchData]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`incomes-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'incomes',
          filter: `user_id=eq.${user.id}`,
        },
        async () => {
          await fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchData]);

  const addIncome = async (income: Omit<Income, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return;

    if (income.isRecurring) {
      const quota = await getRecurrenceQuotaStatus(user.id, subscriptionPlan as string);
      if (quota.exceededByNewRecurring) {
        toast.error('Limite de Recorrências Atingido', {
          description: `Seu plano atual permite apenas ${quota.limit} lançamentos recorrentes. Faça o upgrade para liberar mais!`,
        });
        throw new Error('RECURRENCE_QUOTA_REACHED');
      }
    }

    const recurrenceId = income.isRecurring ? income.recurrenceId || crypto.randomUUID() : null;
    const incomesToInsert: any[] = [];

    const recType = (income as any).recurrenceType || (income as any).recurrence_type || 'fixed_day';
    const targetBusDay = (income as any).targetBusinessDay ?? (income as any).target_business_day ?? '5';
    const wStrategy = (income as any).weekendStrategy || (income as any).weekend_strategy || 'next';

    if (income.isRecurring) {
      const totalInstallments = 12;
      const initialDate = income.receiveDate instanceof Date ? income.receiveDate : parseISO(String(income.receiveDate));

      for (let i = 0; i < totalInstallments; i++) {
        let calcDate: Date;
        const targetMonth = (initialDate.getMonth() + i) % 12;
        const targetYear = initialDate.getFullYear() + Math.floor((initialDate.getMonth() + i) / 12);

        if (recType === 'business_day') {
          calcDate = getNthBusinessDay(targetYear, targetMonth, parseInt(String(targetBusDay)), wStrategy === 'previous' ? 'previous' : 'next');
        } else {
          const rawDate = new Date(targetYear, targetMonth, initialDate.getDate());
          calcDate = adjustToBusinessDay(rawDate, wStrategy);
        }

        incomesToInsert.push({
          user_id: user.id,
          category_id: income.categoryId || null,
          subcategory_id: income.subcategoryId || null,
          title: income.title,
          amount: income.amount,
          receive_date: format(calcDate, 'yyyy-MM-dd'),
          description: income.description || null,
          is_recurring: income.isRecurring,
          is_received: income.isReceived ?? false,
          account_id: income.accountId || null,
          recurrence_id: recurrenceId,
          exclude_from_calculations: income.excludeFromCalculations ?? false,
          current_installment: i + 1,
          installments: totalInstallments,
          recurrence_type: recType,
          target_business_day: recType === 'business_day' ? parseInt(String(targetBusDay)) : null,
          weekend_strategy: wStrategy,
        });
      }
    } else {
      const singleDate = income.receiveDate instanceof Date ? income.receiveDate : parseISO(String(income.receiveDate));
      incomesToInsert.push({
        user_id: user.id,
        category_id: income.categoryId || null,
        subcategory_id: income.subcategoryId || null,
        title: income.title,
        amount: income.amount,
        receive_date: format(singleDate, 'yyyy-MM-dd'),
        description: income.description || null,
        is_recurring: income.isRecurring,
        is_received: income.isReceived ?? false,
        account_id: income.accountId || null,
        recurrence_id: recurrenceId,
        exclude_from_calculations: income.excludeFromCalculations ?? false,
        recurrence_type: recType,
        target_business_day: recType === 'business_day' ? parseInt(String(targetBusDay)) : null,
        weekend_strategy: wStrategy,
      });
    }

    const { data, error } = await supabase.from('incomes').insert(incomesToInsert).select();

    if (error) {
      toast.error('Erro ao adicionar receita');
      console.error(error);
      return;
    }

    if (data) {
      await fetchData(true);
    }
  };

  const updateIncome = async (id: string, incomeUpdate: Partial<Income>) => {
    const updateData: Record<string, unknown> = {};

    if (incomeUpdate.categoryId !== undefined) updateData.category_id = incomeUpdate.categoryId || null;
    if (incomeUpdate.subcategoryId !== undefined) updateData.subcategory_id = incomeUpdate.subcategoryId || null;
    if (incomeUpdate.title !== undefined) updateData.title = incomeUpdate.title;
    if (incomeUpdate.amount !== undefined) updateData.amount = incomeUpdate.amount;
    if (incomeUpdate.receiveDate !== undefined) {
      const d = incomeUpdate.receiveDate instanceof Date ? incomeUpdate.receiveDate : parseISO(String(incomeUpdate.receiveDate));
      updateData.receive_date = format(d, 'yyyy-MM-dd');
    }
    if (incomeUpdate.description !== undefined) updateData.description = incomeUpdate.description || null;
    if (incomeUpdate.isRecurring !== undefined) updateData.is_recurring = incomeUpdate.isRecurring;
    if (incomeUpdate.isReceived !== undefined) updateData.is_received = incomeUpdate.isReceived;
    if (incomeUpdate.excludeFromCalculations !== undefined) updateData.exclude_from_calculations = incomeUpdate.excludeFromCalculations;
    if (incomeUpdate.accountId !== undefined) updateData.account_id = incomeUpdate.accountId || null;

    const recType = (incomeUpdate as any).recurrenceType || (incomeUpdate as any).recurrence_type;
    const busDay = (incomeUpdate as any).targetBusinessDay ?? (incomeUpdate as any).target_business_day;
    const wStrat = (incomeUpdate as any).weekendStrategy || (incomeUpdate as any).weekend_strategy;

    if (recType !== undefined) updateData.recurrence_type = recType;
    if (busDay !== undefined) updateData.target_business_day = busDay ? parseInt(String(busDay)) : null;
    if (wStrat !== undefined) updateData.weekend_strategy = wStrat;

    const { error } = await supabase.from('incomes').update(updateData).eq('id', id);

    if (error) {
      toast.error('Erro ao atualizar receita');
      console.error(error);
      return;
    }

    setIncomes(prev => prev.map(i => (i.id === id ? { ...i, ...incomeUpdate } : i)));
  };

  const removeIncome = async (id: string) => {
    const { error } = await supabase.from('incomes').delete().eq('id', id);

    if (error) {
      toast.error('Erro ao remover receita');
      console.error(error);
      return;
    }

    setIncomes(prev => prev.filter(i => i.id !== id));
  };

  const addIncomeCategory = async (category: Omit<IncomeCategory, 'id' | 'userId'>): Promise<IncomeCategory | null> => {
    if (!user) return null;

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
      return null;
    }

    if (data) {
      const createdCategory: IncomeCategory = {
        id: data.id,
        name: data.name,
        icon: data.icon,
        color: data.color,
        userId: data.user_id,
        isDefault: data.is_default,
      };
      setIncomeCategories(prev => [...prev, createdCategory].sort((a, b) => a.name.localeCompare(b.name)));
      return createdCategory;
    }
    return null;
  };

  const updateIncomeCategory = async (id: string, categoryUpdate: Partial<IncomeCategory>) => {
    const updateData: Record<string, unknown> = {};

    if (categoryUpdate.name !== undefined) updateData.name = categoryUpdate.name;
    if (categoryUpdate.icon !== undefined) updateData.icon = categoryUpdate.icon;
    if (categoryUpdate.color !== undefined) updateData.color = categoryUpdate.color;
    if (categoryUpdate.isDefault !== undefined) updateData.is_default = categoryUpdate.isDefault;

    const { error } = await supabase.from('income_categories').update(updateData).eq('id', id);

    if (error) {
      toast.error('Erro ao atualizar categoria de receita');
      console.error(error);
      return;
    }

    setIncomeCategories(prev =>
      prev.map(c => (c.id === id ? { ...c, ...categoryUpdate } : c)).sort((a, b) => a.name.localeCompare(b.name))
    );
  };

  const removeIncomeCategory = async (id: string) => {
    const { error } = await supabase.from('income_categories').delete().eq('id', id);

    if (error) {
      toast.error('Erro ao remover categoria de receita');
      console.error(error);
      return;
    }

    setIncomeCategories(prev => prev.filter(c => c.id !== id));
    setIncomeSubcategories(prev => prev.filter(s => s.categoryId !== id));
  };

  const addIncomeSubcategory = async (subcategory: Omit<IncomeSubcategory, 'id' | 'userId'>): Promise<IncomeSubcategory | null> => {
    if (!user) return null;

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
      return null;
    }

    if (data) {
      const createdSubcategory: IncomeSubcategory = {
        id: data.id,
        name: data.name,
        categoryId: data.category_id,
        userId: data.user_id,
      };
      setIncomeSubcategories(prev => [...prev, createdSubcategory]);
      return createdSubcategory;
    }
    return null;
  };

  const updateIncomeSubcategory = async (id: string, subcategoryUpdate: Partial<IncomeSubcategory>) => {
    const updateData: Record<string, unknown> = {};

    if (subcategoryUpdate.name !== undefined) updateData.name = subcategoryUpdate.name;
    if (subcategoryUpdate.categoryId !== undefined) updateData.category_id = subcategoryUpdate.categoryId;

    const { error } = await supabase.from('income_subcategories').update(updateData).eq('id', id);

    if (error) {
      toast.error('Erro ao atualizar subcategoria de receita');
      console.error(error);
      return;
    }

    setIncomeSubcategories(prev => prev.map(s => (s.id === id ? { ...s, ...subcategoryUpdate } : s)));
  };

  const removeIncomeSubcategory = async (id: string) => {
    const { error } = await supabase.from('income_subcategories').delete().eq('id', id);

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
    return incomes.filter(i => {
      const date = new Date(i.receiveDate);
      return date.getFullYear() === year && date.getMonth() === month;
    });
  };

  const getMonthlyIncomeTotal = (year: number, month: number) => {
    const monthlyIncomes = getMonthlyIncomes(year, month);
    return monthlyIncomes.filter(i => !i.excludeFromCalculations).reduce((acc, income) => acc + income.amount, 0);
  };

  const getIncomeTotalByCategory = (year: number, month: number) => {
    const monthlyIncomes = getMonthlyIncomes(year, month);
    return monthlyIncomes
      .filter(i => !i.excludeFromCalculations)
      .reduce((acc, income) => {
        acc[income.categoryId] = (acc[income.categoryId] || 0) + income.amount;
        return acc;
      }, {} as Record<string, number>);
  };

  const getIncomeCategoryById = (id: string) => {
    return incomeCategories.find(c => c.id === id);
  };

  const getIncomeSubcategoryById = (id: string) => {
    return incomeSubcategories.find(s => s.id === id);
  };

  const refreshData = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

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
