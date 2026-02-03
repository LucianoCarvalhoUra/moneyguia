import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface FiftyThirtyTwentyChartProps {
  income: number;
  needs: number; // 50%
  wants: number; // 30%
  savings: number; // 20%
}

export default function FiftyThirtyTwentyChart({ income, needs, wants, savings }: FiftyThirtyTwentyChartProps) {
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Calculate percentages of income
  const needsPct = income > 0 ? (needs / income) * 100 : 0;
  const wantsPct = income > 0 ? (wants / income) * 100 : 0;
  const savingsPct = income > 0 ? (savings / income) * 100 : 0;

  const renderBar = (label: string, current: number, target: number, color: string, description: string) => {
    const isOver = current > target;
    return (
      <div className="space-y-1.5">
        <div className="flex justify-between text-sm">
          <div className="flex items-center gap-1.5">
            <span className="font-medium">{label}</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger><Info className="w-3 h-3 text-muted-foreground" /></TooltipTrigger>
                <TooltipContent><p>{description}</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <span className="text-muted-foreground text-xs">
            {current.toFixed(1)}% / {target}%
          </span>
        </div>
        <div className={`h-2.5 w-full overflow-hidden rounded-full ${isOver ? 'bg-red-100' : 'bg-secondary'}`}>
          <div
            className={`h-full flex-1 transition-all ${isOver ? 'bg-red-500' : color}`}
            style={{ width: `${Math.min(current, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Gasto: {formatCurrency((current / 100) * income)}</span>
          <span>Meta: {formatCurrency((target / 100) * income)}</span>
        </div>
      </div>
    );
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          Regra 50/30/20
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-4">
        {renderBar('Necessidades (Essenciais)', needsPct, 50, 'bg-blue-500', 'Gastos essenciais como moradia, alimentação básica e saúde.')}
        {renderBar('Desejos (Supérfluos)', wantsPct, 30, 'bg-purple-500', 'Gastos com lazer, hobbies e compras não essenciais.')}
        {renderBar('Poupança/Dívidas', savingsPct, 20, 'bg-green-500', 'Dinheiro guardado, investimentos ou pagamento de dívidas.')}
        
        <div className="pt-2 border-t text-xs text-center text-muted-foreground">
          Baseado na renda mensal de {formatCurrency(income)}
        </div>
      </CardContent>
    </Card>
  );
}