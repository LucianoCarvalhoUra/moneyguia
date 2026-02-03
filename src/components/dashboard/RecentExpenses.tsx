import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Expense, PAYMENT_METHOD_LABELS } from '@/types/finance';
import { useFinance } from '@/contexts/FinanceContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { CategoryIcon } from '@/components/CategoryIcon';

interface RecentExpensesProps {
  expenses: Expense[];
}

export default function RecentExpenses({ expenses }: RecentExpensesProps) {
  const { getCategoryById } = useFinance();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const recentExpenses = [...expenses]
    .sort((a, b) => {
      // Check for both camelCase and snake_case properties for robustness
      const dateAStr = (a as any).updated_at || (a as any).updatedAt || (a as any).created_at || a.createdAt;
      const dateBStr = (b as any).updated_at || (b as any).updatedAt || (b as any).created_at || b.createdAt;
      
      const dateA = new Date(dateAStr).getTime();
      const dateB = new Date(dateBStr).getTime();
      
      // Handle invalid dates by treating them as older (0)
      const timeA = isNaN(dateA) ? 0 : dateA;
      const timeB = isNaN(dateB) ? 0 : dateB;
      
      return timeB - timeA;
    })
    .slice(0, 5);

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
        {recentExpenses.length === 0 ? (
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
                      {expense.description || category?.name || 'Sem categoria'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {PAYMENT_METHOD_LABELS[expense.paymentMethod]} •{' '}
                      {format(new Date(expense.dueDate), "dd 'de' MMM", { locale: ptBR })}
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
