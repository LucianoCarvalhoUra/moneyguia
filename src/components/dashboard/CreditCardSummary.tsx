import { useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CreditCard, Wallet } from 'lucide-react';

export default function CreditCardSummary() {
  const { cards, getMonthlyExpenses } = useFinance();
  
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const monthlyExpenses = getMonthlyExpenses(currentYear, currentMonth);

  const cardSummaries = useMemo(() => {
    return cards.map(card => {
      // Filtra despesas deste cartão no mês atual
      const cardExpenses = monthlyExpenses.filter(e => 
        e.cardId === card.id && e.paymentMethod === 'credit_card'
      );
      
      const currentInvoice = cardExpenses.reduce((acc, curr) => acc + curr.amount, 0);
      // Assume que o limite pode vir do objeto card (adicionado via Accounts) ou padrão 0
      const limit = (card as any).limit || 0;
      const available = Math.max(0, limit - currentInvoice);
      const percentage = limit > 0 ? (currentInvoice / limit) * 100 : 0;

      return {
        ...card,
        currentInvoice,
        limit,
        available,
        percentage
      };
    });
  }, [cards, monthlyExpenses]);

  if (cards.length === 0) return null;

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CreditCard className="w-5 h-5 text-primary" />
          Resumo de Cartões
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {cardSummaries.map(card => (
          <div key={card.id} className="space-y-2">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Wallet className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{card.brand} •••• {card.lastFourDigits}</p>
                  <p className="text-xs text-muted-foreground">Limite: {formatCurrency(card.limit)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm text-red-600">{formatCurrency(card.currentInvoice)}</p>
                <p className="text-xs text-green-600 font-medium">Disp: {formatCurrency(card.available)}</p>
              </div>
            </div>
            <div className="space-y-1">
              <Progress value={Math.min(card.percentage, 100)} className="h-2" />
              <p className="text-[10px] text-right text-muted-foreground">{card.percentage.toFixed(1)}% utilizado</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}