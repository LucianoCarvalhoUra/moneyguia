import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';

interface BalanceProjectionChartProps {
  data: Array<{ name: string; Saldo: number; isProjected: boolean }>;
}

export default function BalanceProjectionChart({ data }: BalanceProjectionChartProps) {
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">Projeção de Saldo (3 Meses)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickFormatter={(val) => `R$${val/1000}k`} tickLine={false} axisLine={false} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              
              {/* Historical Line */}
              <Line 
                type="monotone" 
                dataKey="Saldo" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2} 
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              
              {/* Dashed line for projection logic would ideally be a separate line or segment, 
                  but for simplicity we use one line. In a real advanced chart, we'd split data. 
                  Here we assume the user understands the future dates. */}
              <ReferenceLine x={data[data.length - 4]?.name} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" label="Hoje" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}