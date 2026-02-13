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
    ? ((value - previousValue) / Math.abs(previousValue)) * 100
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
    balance: Wallet
  };

  const Icon = icons[icon];

  const iconColors = {
    expense: 'bg-destructive/10 text-destructive',
    income: 'bg-success/10 text-success', 
    balance: 'bg-primary/10 text-primary',
  };

  // For balance, show green if positive, red if negative
  const getValueColor = (): string => {
    if (icon === 'balance') {
      return value >= 0 ? 'text-success' : 'text-destructive';
    }
    if (icon === 'income') {
      return 'text-green-600';
    }
    return 'text-foreground';
  };

  // For expense card, increase is bad (red), decrease is good (green)
  // For income/balance card, increase is good (green), decrease is bad (red)
  const getChangeColor = (): string => {
    if (icon === 'expense') {
      return isIncrease ? 'text-destructive' : 'text-success';
    }
    return isIncrease ? 'text-green-600' : 'text-destructive';
  };

  const getChangeIcon = () => {
    if (icon === 'expense') {
      return isIncrease ? (
        <TrendingUp className="w-3 h-3 text-destructive" />
      ) : (
        <TrendingDown className="w-3 h-3 text-success" />
      );
    }
    return isIncrease ? (
      <TrendingUp className="w-3 h-3 text-success" />
    ) : (
      <TrendingDown className="w-3 h-3 text-destructive" />
    );
  };

  return (
    <Card className={cn('overflow-hidden', className, icon === 'expense' ? 'border-l-red-500' : 'border-l-green-500')}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn('p-2 rounded-lg', iconColors[icon])}>
          <Icon className="w-4 h-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn('text-2xl font-bold', getValueColor())}>
          {formatCurrency(value)}
        </div>
        {previousValue !== undefined && previousValue !== 0 && (
          <div className="flex items-center gap-1 mt-1">
            {getChangeIcon()}
            <span className={cn('text-xs font-medium', getChangeColor())}>
              {Math.abs(percentChange).toFixed(1)}%
            </span>
            <span className="text-xs text-muted-foreground">vs mês anterior</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
