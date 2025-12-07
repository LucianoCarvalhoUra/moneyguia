import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExpenseSummaryCardProps {
  title: string;
  value: number;
  previousValue?: number;
  icon?: 'expense' | 'income' | 'balance';
  className?: string;
}

export default function ExpenseSummaryCard({
  title,
  value,
  previousValue,
  icon = 'expense',
  className,
}: ExpenseSummaryCardProps) {
  const percentChange = previousValue
    ? ((value - previousValue) / previousValue) * 100
    : 0;
  const isIncrease = percentChange > 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const icons = {
    expense: TrendingDown,
    income: TrendingUp,
    balance: Wallet,
  };

  const Icon = icons[icon];

  const iconColors = {
    expense: 'bg-destructive/10 text-destructive',
    income: 'bg-success/10 text-success',
    balance: 'bg-primary/10 text-primary',
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn('p-2 rounded-lg', iconColors[icon])}>
          <Icon className="w-4 h-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">
          {formatCurrency(value)}
        </div>
        {previousValue !== undefined && previousValue !== 0 && (
          <div className="flex items-center gap-1 mt-1">
            {isIncrease ? (
              <TrendingUp className="w-3 h-3 text-destructive" />
            ) : (
              <TrendingDown className="w-3 h-3 text-success" />
            )}
            <span
              className={cn(
                'text-xs font-medium',
                isIncrease ? 'text-destructive' : 'text-success'
              )}
            >
              {Math.abs(percentChange).toFixed(1)}%
            </span>
            <span className="text-xs text-muted-foreground">vs mês anterior</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
