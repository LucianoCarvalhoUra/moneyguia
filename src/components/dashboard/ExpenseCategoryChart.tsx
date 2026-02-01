import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useFinance } from '@/contexts/FinanceContext';
import { CategoryIcon } from '@/components/CategoryIcon';

interface ExpenseCategoryChartProps {
  data: Record<string, number>;
  total: number;
}

export default function ExpenseCategoryChart({ data, total }: ExpenseCategoryChartProps) {
  const { getCategoryById } = useFinance();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const chartData = Object.entries(data)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([categoryId, amount]) => {
      const category = getCategoryById(categoryId);
      return {
        name: category?.name || 'Sem categoria',
        value: amount,
        icon: category?.icon || 'Package',
        percentage: total > 0 ? ((amount / total) * 100).toFixed(1) : '0',
      };
    });

  const COLORS = [
    'hsl(var(--primary))',
    'hsl(var(--destructive))',
    'hsl(var(--warning))',
    'hsl(var(--success))',
    'hsl(142, 76%, 36%)',
    'hsl(262, 83%, 58%)',
    'hsl(24, 100%, 50%)',
    'hsl(199, 89%, 48%)',
  ];

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; name: string; payload: { percentage: string; icon: string } }> }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <CategoryIcon iconName={payload[0].payload.icon} className="w-5 h-5" />
            <p className="font-medium text-foreground">{payload[0].name}</p>
          </div>
          <p className="text-primary font-semibold">{formatCurrency(payload[0].value)}</p>
          <p className="text-sm text-muted-foreground">{payload[0].payload.percentage}%</p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLegend = () => {
    return (
      <div className="flex flex-wrap gap-3 justify-center mt-4">
        {chartData.map((entry, index) => (
          <div key={entry.name} className="flex items-center gap-1.5">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <div className="flex items-center gap-1">
              <CategoryIcon iconName={entry.icon} className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{entry.name}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (chartData.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg">Despesas por Categoria</CardTitle>
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
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">Despesas por Categoria</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
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
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]}
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {renderCustomLegend()}
      </CardContent>
    </Card>
  );
}
