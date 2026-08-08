import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFinance } from '@/contexts/FinanceContext';
import { useIncome } from '@/contexts/IncomeContext';
import { toast } from 'sonner';

/**
 * Motor de baixa automática: verifica transações agendadas cuja data
 * já chegou e, se o usuário habilitou "baixa automática", marca como
 * paga/recebida automaticamente.
 */
export function useScheduledTransactions() {
  const { user } = useAuth();
  const finance = useFinance();
  const income = useIncome();
  const ranFor = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const runKey = `${user.id}:${todayStr}`;
    if (ranFor.current === runKey) return;
    ranFor.current = runKey;

    const processScheduled = async () => {
      const { data: profile } = await (supabase.from('profiles') as any)
        .select('auto_liquidation')
        .eq('user_id', user.id)
        .maybeSingle();

      const { data: expenses } = await (supabase.from('expenses') as any)
        .select('id')
        .eq('user_id', user.id)
        .eq('is_scheduled', true)
        .eq('is_paid', false)
        .not('scheduled_date', 'is', null)
        .lte('scheduled_date', todayStr);

      const { data: incomes } = await (supabase.from('incomes') as any)
        .select('id')
        .eq('user_id', user.id)
        .eq('is_scheduled', true)
        .eq('is_received', false)
        .not('scheduled_date', 'is', null)
        .lte('scheduled_date', todayStr);

      const totalPending = (expenses?.length || 0) + (incomes?.length || 0);
      if (totalPending === 0) return;

      if (!profile?.auto_liquidation) {
        toast.info(`Você possui ${totalPending} agendamento(s) vencido(s) aguardando baixa.`, {
          description: 'Ative a baixa automática em Configurações ou dê baixa manualmente.',
          duration: 8000,
        });
        return;
      }

      let changed = false;

      if (expenses?.length) {
        const { error } = await (supabase.from('expenses') as any)
          .update({ is_paid: true })
          .in('id', expenses.map((e: any) => e.id));
        if (!error) changed = true;
      }

      if (incomes?.length) {
        const { error } = await (supabase.from('incomes') as any)
          .update({ is_received: true })
          .in('id', incomes.map((i: any) => i.id));
        if (!error) changed = true;
      }

      if (changed) {
        await Promise.all([finance.refreshData(), income.refreshData()]);
        toast.success(`${totalPending} transação(ões) agendada(s) baixada(s) automaticamente.`);
      }
    };

    processScheduled();
  }, [user?.id, finance, income]);
}
