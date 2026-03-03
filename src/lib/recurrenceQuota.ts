import { supabase } from '@/integrations/supabase/client';

type PlanLimit = {
  limit: number | null;
  label: string;
};

export function getPlanLimit(plan: string | null | undefined): PlanLimit {
  const normalized = (plan || 'free').toLowerCase();

  if (normalized === 'free') {
    return { limit: 2, label: 'Plano Essencial (Gratuito)' };
  }
  if (normalized === 'pro') {
    return { limit: 10, label: 'Plano Pro' };
  }
  if (normalized === 'premium' || normalized === 'total') {
    return { limit: null, label: 'Plano Controle Total (Premium)' };
  }

  return { limit: 2, label: 'Plano Essencial (Gratuito)' };
}

export async function getRecurringUsageCount(userId: string): Promise<number> {
  const [expensesRes, incomesRes] = await Promise.all([
    supabase
      .from('expenses')
      .select('id, recurrence_id')
      .eq('user_id', userId)
      .eq('is_recurring', true),
    supabase
      .from('incomes')
      .select('id, recurrence_id')
      .eq('user_id', userId)
      .eq('is_recurring', true),
  ]);

  if (expensesRes.error) throw expensesRes.error;
  if (incomesRes.error) throw incomesRes.error;

  const recurrenceKeys = new Set<string>();

  for (const row of expensesRes.data || []) {
    recurrenceKeys.add(row.recurrence_id || `expense:${row.id}`);
  }
  for (const row of incomesRes.data || []) {
    recurrenceKeys.add(row.recurrence_id || `income:${row.id}`);
  }

  return recurrenceKeys.size;
}

export async function getRecurrenceQuotaStatus(userId: string, plan: string | null | undefined) {
  const { limit, label } = getPlanLimit(plan);
  const used = await getRecurringUsageCount(userId);

  return {
    used,
    limit,
    planLabel: label,
    exceededByNewRecurring: limit !== null ? used + 1 > limit : false,
  };
}
