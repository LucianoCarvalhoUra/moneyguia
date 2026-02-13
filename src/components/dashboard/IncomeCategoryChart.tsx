import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useIncome } from '@/contexts/IncomeContext';
import { CategoryIcon } from '@/components/CategoryIcon';

interface IncomeCategoryChartProps {
  data: Record<string, number>;
  total: number;
}

export default function IncomeCategoryChart({ data, total }: IncomeCategoryChartProps) {
  const { getIncomeCategoryById } = useIncome();

  const chartData = Object.entries(data).map(([categoryId, value]) => {
    const category = getIncomeCategoryById(categoryId);
    return {
      name: category?.name || 'Sem categoria',
      value,
      color: category?.color || '#94a3b8',
      icon: category?.icon || 'Wallet',
    };
  }).sort((a, b) => b.value - a.value);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; name: string; payload: { color: string; icon: string } }> }) => {
    if (active && payload && payload.length) {
      const percentage = total > 0 ? ((payload[0].value / total) * 100).toFixed(1) : 0;
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-medium text-foreground flex items-center gap-2">
            <CategoryIcon iconName={payload[0].payload.icon} className="w-4 h-4" />
            {payload[0].name}
          </p>
          <p className="text-primary font-semibold">{formatCurrency(payload[0].value)}</p>
          <p className="text-sm text-muted-foreground">{percentage}% do total</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">Receitas por Categoria</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground"> 
            Sem dados para exibir
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="mt-4 space-y-2">
              {chartData.slice(0, 5).map((entry) => {
                const percentage = total > 0 ? ((entry.value / total) * 100).toFixed(0) : 0;
                return (
                  <div key={entry.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="flex items-center gap-1">
                        <CategoryIcon iconName={entry.icon} className="w-3 h-3" />
                        <span className="text-foreground">{entry.name}</span>
                      </span>
                    </div>
                    <span className="text-muted-foreground">{percentage}%</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
