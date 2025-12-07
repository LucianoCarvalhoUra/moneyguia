import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CATEGORY_LABELS, CATEGORY_ICONS, ExpenseCategory } from '@/types/finance';
import { cn } from '@/lib/utils';

interface CategoryChartProps {
  data: Record<string, number>;
  total: number;
}

const categoryColors: Record<ExpenseCategory, string> = {
  food: 'bg-category-food',
  transport: 'bg-category-transport',
  entertainment: 'bg-category-entertainment',
  health: 'bg-category-health',
  shopping: 'bg-category-shopping',
  bills: 'bg-category-bills',
  education: 'bg-category-education',
  other: 'bg-category-other',
};

export default function CategoryChart({ data, total }: CategoryChartProps) {
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
        {sortedCategories.map(([category, amount]) => {
          const percentage = total > 0 ? (amount / total) * 100 : 0;
          const cat = category as ExpenseCategory;
          
          return (
            <div key={category} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{CATEGORY_ICONS[cat]}</span>
                  <span className="text-sm font-medium text-foreground">
                    {CATEGORY_LABELS[cat]}
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
                  className={cn('h-full rounded-full transition-all duration-500', categoryColors[cat])}
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
