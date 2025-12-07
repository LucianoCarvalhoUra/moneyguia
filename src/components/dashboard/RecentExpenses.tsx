import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Expense, CATEGORY_LABELS, CATEGORY_ICONS, PAYMENT_METHOD_LABELS } from '@/types/finance';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface RecentExpensesProps {
  expenses: Expense[];
}

const categoryBgColors: Record<string, string> = {
  food: 'bg-category-food/10',
  transport: 'bg-category-transport/10',
  entertainment: 'bg-category-entertainment/10',
  health: 'bg-category-health/10',
  shopping: 'bg-category-shopping/10',
  bills: 'bg-category-bills/10',
  education: 'bg-category-education/10',
  other: 'bg-category-other/10',
};

export default function RecentExpenses({ expenses }: RecentExpensesProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const recentExpenses = expenses
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
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
            {recentExpenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center text-lg',
                    categoryBgColors[expense.category]
                  )}
                >
                  {CATEGORY_ICONS[expense.category]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {expense.description || CATEGORY_LABELS[expense.category]}
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
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
