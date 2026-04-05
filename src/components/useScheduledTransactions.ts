import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useScheduledTransactions() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const processScheduled = async () => {
      // Busca o perfil do usuário para verificar a preferência de liquidação automática
      const { data: profile } = (await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()) as any;

      const today = new Date().toISOString().split('T')[0];

      // Buscar despesas agendadas pendentes (hoje ou passadas)
      const { data: expenses } = await (supabase.from('expenses') as any)
        .select('id, description')
        .eq('user_id', user.id)
        .eq('is_scheduled', true)
        .eq('is_paid', false)
        .lte('scheduled_date', today);

      // Buscar receitas agendadas pendentes (hoje ou passadas)
      const { data: incomes } = await (supabase.from('incomes') as any)
        .select('id, title')
        .eq('user_id', user.id)
        .eq('is_scheduled', true)
        .eq('is_received', false)
        .lte('scheduled_date', today);

      const totalPending = (expenses?.length || 0) + (incomes?.length || 0);
      if (totalPending === 0) return;

      if (profile?.auto_liquidation) {
        // Baixa Automática
        let success = true;
        
        if (expenses?.length) {
          const { error } = await (supabase.from('expenses') as any)
            .update({ is_paid: true })
            .in('id', expenses.map(e => e.id));
          if (error) success = false;
        }

        if (incomes?.length) {
          const { error } = await (supabase.from('incomes') as any)
            .update({ is_received: true })
            .in('id', incomes.map(i => i.id));
          if (error) success = false;
        }

        if (success) {
          toast.success(`${totalPending} transações agendadas foram baixadas automaticamente.`, {
            icon: '✅'
          });
        }
      } else {
        // Notificação para Baixa Manual
        toast.info(`Você possui ${totalPending} agendamentos pendentes para hoje.`, {
          description: 'Deseja efetuar a baixa manual agora?',
          duration: 8000,
          action: {
            label: 'Ver Agendamentos',
            onClick: () => {
              // Navegação para tela de transações pendentes
              window.location.hash = '#transacoes-pendentes';
            }
          }
        });
      }
    };

    processScheduled();
  }, [user]);
}