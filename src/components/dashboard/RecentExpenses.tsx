import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Expense, PAYMENT_METHOD_LABELS } from '@/types/finance';
import { useFinance } from '@/contexts/FinanceContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { CategoryIcon } from '@/components/CategoryIcon';
import { supabase } from '@/integrations/supabase/client';

export default function RecentExpenses() {
  const { getCategoryById } = useFinance();
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const { data, error } = await supabase
          .from('expenses')
          .select('*')
          .order('updated_at', { ascending: false }) // Garante ordenação por atualização
          .limit(5);

        if (error) throw error;

        if (data) {
          const mapped: Expense[] = data.map((item: any) => ({
            id: item.id,
            userId: item.user_id,
            description: item.description,
            amount: item.amount,
            expenseDate: item.expense_date,
            dueDate: item.due_date,
            categoryId: item.category_id,
            subcategoryId: item.subcategory_id,
            paymentMethod: item.payment_method,
            installments: item.installments,
            isRecurring: item.is_recurring,
            isPaid: item.is_paid,
            recurrenceId: item.recurrence_id,
            createdAt: item.created_at,
            updatedAt: item.updated_at,
            observation: item.observation,
            cardId: item.card_id,
            accountId: item.account_id
          }));
          setRecentExpenses(mapped);
        }
      } catch (err) {
        console.error('Error fetching recent expenses:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecent();

    const channel = supabase
      .channel('recent_expenses_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses' },
        () => fetchRecent()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Despesas Recentes</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/expenses" className="flex items-center gap-1">
            Ver todas
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : recentExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <p>Nenhuma despesa registrada</p>
            <Button variant="link" asChild className="mt-2">
              <Link to="/expenses">Cadastrar primeira despesa</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {recentExpenses.map((expense) => {
              const category = getCategoryById(expense.categoryId);
              
              return (
                <div
                  key={expense.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center text-lg',
                      category?.color ? `bg-${category.color}/10` : 'bg-muted'
                    )}
                  >
                    <CategoryIcon iconName={category?.icon || 'Package'} className={cn("w-5 h-5", category?.color ? `text-${category.color}` : "text-muted-foreground")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {category?.name || 'Sem categoria'} - {expense.description || 'Sem descrição'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">
                      {formatCurrency(expense.amount)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
