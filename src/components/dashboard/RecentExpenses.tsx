import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Expense, PAYMENT_METHOD_LABELS } from '@/types/finance';
import { useFinance } from '@/contexts/FinanceContext';
import { useIncome } from '@/contexts/IncomeContext';
import { format, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowRight, Loader2, ArrowUpCircle, ArrowDownCircle, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

interface ActivityItem {
  id: string;
  type: 'income' | 'expense';
  description: string;
  amount: number;
  date: string;
  updatedAt: string;
  categoryId: string;
  subcategoryId?: string;
  isPaid: boolean; // isReceived for income
}

export default function RecentExpenses() {
  const { getCategoryById, getSubcategoryById } = useFinance();
  const { getIncomeCategoryById, getIncomeSubcategoryById } = useIncome();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
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
        // Fetch Expenses
        const { data: expensesData, error: expensesError } = await supabase
          .from('expenses')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(5);

        if (expensesError) throw expensesError;

        // Fetch Incomes
        const { data: incomesData, error: incomesError } = await supabase
          .from('incomes')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(5);

        if (incomesError) throw incomesError;

        const mappedExpenses: ActivityItem[] = (expensesData || []).map((item: any) => ({
            id: item.id,
            type: 'expense',
            description: item.description,
            amount: item.amount,
            date: item.due_date,
            updatedAt: item.updated_at,
            categoryId: item.category_id,
            subcategoryId: item.subcategory_id,
            isPaid: item.is_paid
        }));

        const mappedIncomes: ActivityItem[] = (incomesData || []).map((item: any) => ({
            id: item.id,
            type: 'income',
            description: item.title,
            amount: item.amount,
            date: item.receive_date,
            updatedAt: item.updated_at,
            categoryId: item.category_id,
            subcategoryId: item.subcategory_id,
            isPaid: item.is_received
        }));

        // Merge and Sort
        const combined = [...mappedExpenses, ...mappedIncomes].sort((a, b) => 
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        ).slice(0, 5);

        setActivities(combined);
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
        { event: '*', schema: 'public' }, // Listen to all changes in public schema (expenses & incomes)
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
        <CardTitle className="text-lg">Atividade Recente</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/expenses" className="flex items-center gap-1 text-xs">
            Ver tudo
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <p>Nenhuma atividade registrada</p>
            <Button variant="link" asChild className="mt-2">
              <Link to="/expenses">Cadastrar primeira despesa</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((item) => {
              const isExpense = item.type === 'expense';
              const category = isExpense 
                ? getCategoryById(item.categoryId) 
                : getIncomeCategoryById(item.categoryId);
              const subcategory = isExpense 
                ? (item.subcategoryId ? getSubcategoryById(item.subcategoryId) : null)
                : (item.subcategoryId ? getIncomeSubcategoryById(item.subcategoryId) : null);
              
              const itemDate = new Date(item.date);
              const isOverdue = isExpense && !item.isPaid && isBefore(startOfDay(itemDate), startOfDay(new Date()));
              
              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                      isExpense ? "bg-red-100 text-red-600 dark:bg-red-900/20" : "bg-green-100 text-green-600 dark:bg-green-900/20"
                    )}>
                      {isExpense ? <ArrowDownCircle className="w-5 h-5" /> : <ArrowUpCircle className="w-5 h-5" />}
                    </div>
                    
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {category?.name || 'Sem categoria'}
                        </span>
                        {subcategory && (
                          <span className="text-[10px] text-muted-foreground truncate hidden sm:inline-block">
                            • {subcategory.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{format(itemDate, "dd 'de' MMM", { locale: ptBR })}</span>
                        {isOverdue && (
                          <Badge variant="destructive" className="h-4 px-1 text-[10px]">Atrasado</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={cn(
                      "font-bold text-sm",
                      isOverdue ? "text-red-600 dark:text-red-400" : "text-foreground"
                    )}>
                      {isExpense ? '-' : '+'} {formatCurrency(item.amount)}
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
