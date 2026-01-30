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
        .from('goals')
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
      toast.error(`Erro: ${(error as any).message || 'Erro desconhecido ao carregar'}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, [user]);

  const addGoal = async (goal: Omit<Goal, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return;
    const { error } = await supabase.from('goals').insert({
      user_id: user.id,
      title: goal.name,
      target_amount: goal.targetAmount,
      current_amount: goal.currentAmount,
      deadline: new Date(goal.deadline).toISOString(),
      icon: goal.icon,
      color: goal.color,
    });

    if (error) {
      toast.error(`Erro: ${error.message}`);
      throw error;
    }
    await fetchGoals();
  };

  const updateGoal = async (id: string, goal: Partial<Goal>) => {
    const { error } = await supabase.from('goals').update({
      title: goal.name,
      target_amount: goal.targetAmount,
      current_amount: goal.currentAmount,
      deadline: goal.deadline ? new Date(goal.deadline).toISOString() : undefined,
      icon: goal.icon,
      color: goal.color,
    }).eq('id', id);

    if (error) {
      toast.error(`Erro: ${error.message}`);
      throw error;
    }
    await fetchGoals();
  };

  const removeGoal = async (id: string) => {
    const { error } = await supabase.from('goals').delete().eq('id', id);
    if (error) {
      toast.error(`Erro: ${error.message}`);
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