import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Goal, GoalContribution } from '@/types/goals';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GoalsContextType {
  goals: Goal[];
  contributions: GoalContribution[];
  isLoading: boolean;
  addGoal: (goal: Omit<Goal, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  updateGoal: (id: string, goal: Partial<Goal>) => Promise<void>;
  removeGoal: (id: string) => Promise<void>;
  addContribution: (goalId: string, amount: number, note?: string, date?: string) => Promise<void>;
  removeContribution: (contributionId: string, goalId: string, amount: number) => Promise<void>;
  getContributionsByGoal: (goalId: string) => GoalContribution[];
  refreshGoals: () => Promise<void>;
}

const GoalsContext = createContext<GoalsContextType | undefined>(undefined);

export function GoalsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [contributions, setContributions] = useState<GoalContribution[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchGoals = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [goalsRes, contribRes] = await Promise.all([
        supabase
          .from('goals')
          .select('*')
          .eq('user_id', user.id)
          .order('deadline', { ascending: true }),
        supabase
          .from('goal_contributions' as any)
          .select('*')
          .eq('user_id', user.id)
          .order('contributed_at', { ascending: false }),
      ]);

      if (goalsRes.error) throw goalsRes.error;

      if (goalsRes.data) {
        setGoals(goalsRes.data.map((g: any) => ({
          id: g.id,
          userId: g.user_id,
          name: g.title,
          targetAmount: Number(g.target_amount),
          currentAmount: Number(g.current_amount),
          deadline: g.deadline,
          icon: g.icon || 'Target',
          color: g.color || 'blue-500',
          status: g.status || 'active',
          category: g.category || 'outros',
          priority: g.priority || 'medium',
          completedAt: g.completed_at,
          createdAt: g.created_at,
        })));
      }

      if (contribRes.data) {
        setContributions((contribRes.data as any[]).map((c: any) => ({
          id: c.id,
          goalId: c.goal_id,
          userId: c.user_id,
          amount: Number(c.amount),
          note: c.note,
          contributedAt: c.contributed_at,
          createdAt: c.created_at,
        })));
      }
    } catch (error) {
      console.error('Error fetching goals:', error);
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
      deadline: goal.deadline,
      icon: goal.icon,
      color: goal.color,
      status: goal.status || 'active',
      category: goal.category || 'outros',
      priority: goal.priority || 'medium',
    });

    if (error) {
      toast.error(`Erro: ${error.message}`);
      throw error;
    }
    await fetchGoals();
  };

  const updateGoal = async (id: string, goal: Partial<Goal>) => {
    const updateData: Record<string, any> = {};
    if (goal.name !== undefined) updateData.title = goal.name;
    if (goal.targetAmount !== undefined) updateData.target_amount = goal.targetAmount;
    if (goal.currentAmount !== undefined) updateData.current_amount = goal.currentAmount;
    if (goal.deadline !== undefined) updateData.deadline = goal.deadline;
    if (goal.icon !== undefined) updateData.icon = goal.icon;
    if (goal.color !== undefined) updateData.color = goal.color;
    if (goal.status !== undefined) updateData.status = goal.status;
    if (goal.category !== undefined) updateData.category = goal.category;
    if (goal.priority !== undefined) updateData.priority = goal.priority;
    if (goal.completedAt !== undefined) updateData.completed_at = goal.completedAt;

    const { error } = await supabase.from('goals').update(updateData).eq('id', id);

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
    setContributions(prev => prev.filter(c => c.goalId !== id));
  };

  const addContribution = async (goalId: string, amount: number, note?: string, date?: string) => {
    if (!user) return;

    const { error: contribError } = await (supabase.from('goal_contributions' as any) as any).insert({
      goal_id: goalId,
      user_id: user.id,
      amount,
      note: note || null,
      contributed_at: date || new Date().toISOString().split('T')[0],
    });

    if (contribError) {
      toast.error(`Erro: ${contribError.message}`);
      throw contribError;
    }

    // Update goal current_amount
    const goal = goals.find(g => g.id === goalId);
    if (goal) {
      const newAmount = goal.currentAmount + amount;
      const isComplete = newAmount >= goal.targetAmount;
      await supabase.from('goals').update({
        current_amount: newAmount,
        ...(isComplete ? { status: 'completed', completed_at: new Date().toISOString() } : {}),
      }).eq('id', goalId);
    }

    await fetchGoals();
  };

  const removeContribution = async (contributionId: string, goalId: string, amount: number) => {
    const { error } = await (supabase.from('goal_contributions' as any) as any).delete().eq('id', contributionId);
    if (error) {
      toast.error(`Erro: ${error.message}`);
      throw error;
    }

    // Update goal current_amount
    const goal = goals.find(g => g.id === goalId);
    if (goal) {
      await supabase.from('goals').update({
        current_amount: Math.max(0, goal.currentAmount - amount),
        status: 'active',
        completed_at: null,
      }).eq('id', goalId);
    }

    await fetchGoals();
  };

  const getContributionsByGoal = (goalId: string) => {
    return contributions.filter(c => c.goalId === goalId);
  };

  return (
    <GoalsContext.Provider value={{ 
      goals, contributions, isLoading, addGoal, updateGoal, removeGoal, 
      addContribution, removeContribution, getContributionsByGoal, refreshGoals: fetchGoals 
    }}>
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
