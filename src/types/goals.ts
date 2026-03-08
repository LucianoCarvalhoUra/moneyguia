export type GoalStatus = 'active' | 'paused' | 'completed';
export type GoalCategory = 'emergencia' | 'viagem' | 'investimento' | 'compra' | 'educacao' | 'outros';
export type GoalPriority = 'low' | 'medium' | 'high';

export interface Goal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  icon: string;
  color: string;
  status: GoalStatus;
  category: GoalCategory;
  priority: GoalPriority;
  completedAt?: string;
  createdAt: string;
}

export interface GoalContribution {
  id: string;
  goalId: string;
  userId: string;
  amount: number;
  note?: string;
  contributedAt: string;
  createdAt: string;
}

export const GOAL_CATEGORIES: { value: GoalCategory; label: string; icon: string; color: string }[] = [
  { value: 'emergencia', label: 'Emergência', icon: 'ShieldCheck', color: 'red-500' },
  { value: 'viagem', label: 'Viagem', icon: 'Plane', color: 'sky-500' },
  { value: 'investimento', label: 'Investimento', icon: 'TrendingUp', color: 'green-500' },
  { value: 'compra', label: 'Compra', icon: 'ShoppingBag', color: 'violet-500' },
  { value: 'educacao', label: 'Educação', icon: 'BookOpenCheck', color: 'indigo-500' },
  { value: 'outros', label: 'Outros', icon: 'Target', color: 'slate-500' },
];
