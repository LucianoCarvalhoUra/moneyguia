import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DailyCashFlowChartProps {
  data: Array<{ date: string; income: number; expense: number }>;
}

export default function DailyCashFlowChart({ data }: DailyCashFlowChartProps) {
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">Fluxo de Caixa Diário</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(val) => format(new Date(val), 'dd')} 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                fontSize={12}
                tickFormatter={(val) => `R$${val/1000}k`}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label) => format(new Date(label), "dd 'de' MMMM", { locale: ptBR })}
                cursor={{ fill: 'transparent' }}
              />
              <Bar dataKey="income" name="Entradas" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} stackId="a" />
              <Bar dataKey="expense" name="Saídas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}