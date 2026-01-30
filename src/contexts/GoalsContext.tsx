import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Goal } from '@/types/goals';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GoalsContextType {
  goals: Goal[];
  isLoading: boolean;
  addGoal: (goal: Omit<Goal, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  updateGoal: (id: string, goal: Partial<Goal>) => Promise<void>;
  removeGoal: (id: string) => Promise<void>;
  refreshGoals: () => Promise<void>;
}

const GoalsContext = createContext<GoalsContextType | undefined>(undefined);

export function GoalsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchGoals = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('goals' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('deadline', { ascending: true });

      if (error) throw error;

      if (data) {
        setGoals(data.map((g: any) => ({
          id: g.id,
          userId: g.user_id,
          name: g.title,
          targetAmount: Number(g.target_amount),
          currentAmount: Number(g.current_amount),
          deadline: g.deadline,
          icon: g.icon,
          color: g.color,
          createdAt: g.created_at,
        })));
      }
    } catch (error) {
      console.error('Error fetching goals:', error);
      console.log('DEBUG: Erro detalhado ao buscar objetivos:', error);
      toast.error('Erro ao carregar objetivos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, [user]);

  const addGoal = async (goal: Omit<Goal, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return;
    const { error } = await supabase.from('goals' as any).insert({
      user_id: user.id,
      title: goal.name,
      target_amount: goal.targetAmount,
      current_amount: goal.currentAmount,
      deadline: goal.deadline,
      icon: goal.icon,
      color: goal.color,
    });

    if (error) {
      toast.error('Erro ao criar objetivo');
      throw error;
    }
    await fetchGoals();
  };

  const updateGoal = async (id: string, goal: Partial<Goal>) => {
    const { error } = await supabase.from('goals' as any).update({
      title: goal.name,
      target_amount: goal.targetAmount,
      current_amount: goal.currentAmount,
      deadline: goal.deadline,
      icon: goal.icon,
      color: goal.color,
    }).eq('id', id);

    if (error) {
      toast.error('Erro ao atualizar objetivo');
      throw error;
    }
    await fetchGoals();
  };

  const removeGoal = async (id: string) => {
    const { error } = await supabase.from('goals' as any).delete().eq('id', id);
    if (error) {
      toast.error('Erro ao remover objetivo');
      throw error;
    }
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  return (
    <GoalsContext.Provider value={{ goals, isLoading, addGoal, updateGoal, removeGoal, refreshGoals: fetchGoals }}>
      {children}
    </GoalsContext.Provider>
  );
}

export function useGoals() {
  const context = useContext(GoalsContext);
  if (context === undefined) {
    throw new Error('useGoals must be used within a GoalsProvider');
  }
  return context;
}