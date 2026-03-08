import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategoryComparison {
  name: string;
  current: number;
  previous: number;
  diff: number;
  diffPercent: number;
}

interface MonthlyComparisonChartProps {
  currentMonthLabel: string;
  previousMonthLabel: string;
  data: CategoryComparison[];
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as CategoryComparison;
  if (!d) return null;

  return (
    <div className="bg-card border rounded-lg shadow-lg p-3 text-xs space-y-1">
      <p className="font-semibold text-sm">{d.name}</p>
      <p className="text-muted-foreground">Mês atual: <span className="font-medium text-foreground">{formatCurrency(d.current)}</span></p>
      <p className="text-muted-foreground">Mês anterior: <span className="font-medium text-foreground">{formatCurrency(d.previous)}</span></p>
      <p className={cn("font-semibold", d.diff > 0 ? "text-red-500" : d.diff < 0 ? "text-emerald-500" : "text-muted-foreground")}>
        {d.diff > 0 ? '▲' : d.diff < 0 ? '▼' : '='} {formatCurrency(Math.abs(d.diff))} ({d.diffPercent > 0 ? '+' : ''}{d.diffPercent.toFixed(0)}%)
      </p>
    </div>
  );
};

export default function MonthlyComparisonChart({ currentMonthLabel, previousMonthLabel, data }: MonthlyComparisonChartProps) {
  // Sort by absolute diff descending, take top categories with actual changes
  const sorted = [...data]
    .filter(d => d.current > 0 || d.previous > 0)
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    .slice(0, 8);

  const totalCurrent = data.reduce((s, d) => s + d.current, 0);
  const totalPrevious = data.reduce((s, d) => s + d.previous, 0);
  const totalDiff = totalCurrent - totalPrevious;
  const totalDiffPercent = totalPrevious > 0 ? ((totalDiff / totalPrevious) * 100) : 0;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <ArrowUpDown className="w-5 h-5 text-muted-foreground" />
          Comparativo Mensal
        </CardTitle>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{currentMonthLabel} vs {previousMonthLabel}</span>
          <span className={cn(
            "font-semibold",
            totalDiff > 0 ? "text-red-500" : totalDiff < 0 ? "text-emerald-500" : "text-muted-foreground"
          )}>
            {totalDiff > 0 ? '▲' : totalDiff < 0 ? '▼' : '='} {formatCurrency(Math.abs(totalDiff))}
            {totalPrevious > 0 && ` (${totalDiffPercent > 0 ? '+' : ''}${totalDiffPercent.toFixed(0)}%)`}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[220px] text-muted-foreground text-sm">
            <ArrowUpDown className="w-10 h-10 mb-2 opacity-30" />
            Sem dados para comparar
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((item) => {
              const maxVal = Math.max(...sorted.map(d => Math.max(d.current, d.previous)), 1);
              const currentWidth = (item.current / maxVal) * 100;
              const previousWidth = (item.previous / maxVal) * 100;

              return (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium truncate max-w-[50%]">{item.name}</span>
                    <span className={cn(
                      "text-xs font-semibold",
                      item.diff > 0 ? "text-red-500" : item.diff < 0 ? "text-emerald-500" : "text-muted-foreground"
                    )}>
                      {item.diff > 0 ? '+' : ''}{formatCurrency(item.diff)}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-muted-foreground w-12 text-right">Atual</span>
                      <div className="flex-1 h-3 bg-muted/30 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${currentWidth}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground w-20 text-right">{formatCurrency(item.current)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-muted-foreground w-12 text-right">Anterior</span>
                      <div className="flex-1 h-3 bg-muted/30 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-muted-foreground/25 rounded-full transition-all duration-500"
                          style={{ width: `${previousWidth}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground w-20 text-right">{formatCurrency(item.previous)}</span>
                    </div>
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
