import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFinance } from '@/contexts/FinanceContext';
import { cn } from '@/lib/utils';

interface CategoryChartProps {
  data: Record<string, number>;
  total: number;
}

export default function CategoryChart({ data, total }: CategoryChartProps) {
  const { getCategoryById } = useFinance();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const sortedCategories = Object.entries(data)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  if (sortedCategories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Gastos por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <p>Nenhuma despesa registrada</p>
            <p className="text-sm">Cadastre sua primeira despesa</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Gastos por Categoria</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedCategories.map(([categoryId, amount]) => {
          const percentage = total > 0 ? (amount / total) * 100 : 0;
          const category = getCategoryById(categoryId);
          
          return (
            <div key={categoryId} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{category?.icon || '📦'}</span>
                  <span className="text-sm font-medium text-foreground">
                    {category?.name || 'Sem categoria'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-foreground">
                    {formatCurrency(amount)}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({percentage.toFixed(0)}%)
                  </span>
                </div>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    category?.color ? `bg-${category.color}` : 'bg-primary'
                  )}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
