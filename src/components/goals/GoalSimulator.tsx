import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Calculator, TrendingUp } from 'lucide-react';
import { Goal } from '@/types/goals';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface GoalSimulatorProps {
  goal: Goal;
}

export function GoalSimulator({ goal }: GoalSimulatorProps) {
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  const defaultMonthly = remaining > 0 ? Math.ceil(remaining / 12) : 0;
  const [monthlyAmount, setMonthlyAmount] = useState(defaultMonthly);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const projection = useMemo(() => {
    if (monthlyAmount <= 0 || remaining <= 0) return { months: 0, data: [] };

    const months = Math.ceil(remaining / monthlyAmount);
    const data = [];
    let accumulated = goal.currentAmount;

    for (let i = 0; i <= Math.min(months, 60); i++) {
      data.push({
        month: i === 0 ? 'Hoje' : `${i}m`,
        valor: Math.min(accumulated, goal.targetAmount),
        meta: goal.targetAmount,
      });
      accumulated += monthlyAmount;
    }

    return { months, data };
  }, [monthlyAmount, remaining, goal.currentAmount, goal.targetAmount]);

  const maxSlider = Math.max(defaultMonthly * 3, 1000);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="w-4 h-4 text-primary" />
          Simulador — {goal.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Aporte mensal</Label>
          <div className="flex items-center gap-3">
            <Slider
              value={[monthlyAmount]}
              onValueChange={([v]) => setMonthlyAmount(v)}
              min={50}
              max={maxSlider}
              step={50}
              className="flex-1"
            />
            <Input
              value={formatCurrency(monthlyAmount)}
              onChange={(e) => {
                const v = parseFloat(e.target.value.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
                setMonthlyAmount(v);
              }}
              className="w-32 text-right font-medium text-sm"
            />
          </div>
        </div>

        {projection.months > 0 && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-primary/5 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Tempo estimado</p>
                <p className="text-lg font-bold text-primary">
                  {projection.months > 12
                    ? `${Math.floor(projection.months / 12)}a ${projection.months % 12}m`
                    : `${projection.months} meses`}
                </p>
              </div>
              <div className="bg-primary/5 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Total investido</p>
                <p className="text-lg font-bold text-primary">
                  {formatCurrency(monthlyAmount * projection.months)}
                </p>
              </div>
            </div>

            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projection.data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} className="text-muted-foreground" />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Acumulado']}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Area type="monotone" dataKey="meta" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" fill="none" />
                  <Area type="monotone" dataKey="valor" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {remaining <= 0 && (
          <div className="text-center py-4 text-sm text-green-600 font-medium flex items-center justify-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Meta já atingida! 🎉
          </div>
        )}
      </CardContent>
    </Card>
  );
}
