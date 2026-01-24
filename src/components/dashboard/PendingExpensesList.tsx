import { useFinance } from '@/contexts/FinanceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Check, Calendar, AlertCircle } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function PendingExpensesList() {
  const { expenses, updateExpense } = useFinance();

  // Filtra despesas não pagas e ordena por data de vencimento
  const pendingExpenses = expenses
    .filter(expense => !expense.isPaid)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const handlePay = async (id: string) => {
    try {
      await updateExpense(id, { isPaid: true });
      toast.success('Despesa marcada como paga!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao atualizar despesa');
    }
  };

  if (pendingExpenses.length === 0) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Card className="border-l-4 border-l-amber-500 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg text-amber-700 dark:text-amber-500">
          <AlertTriangle className="w-5 h-5" />
          Despesas Pendentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingExpenses.map((expense) => {
                const dueDate = new Date(expense.dueDate);
                const isOverdue = isPast(dueDate) && !isToday(dueDate);
                
                return (
                  <TableRow key={expense.id} className={cn(isOverdue ? "bg-red-50/50 dark:bg-red-900/10" : "")}>
                    <TableCell className="font-medium">
                      {expense.description}
                      {isOverdue && (
                        <span className="flex items-center text-xs text-red-600 dark:text-red-400 mt-1">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Vencida
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className={cn("flex items-center gap-2", isOverdue ? "text-red-600 dark:text-red-400 font-medium" : "text-muted-foreground")}>
                        <Calendar className="w-4 h-4" />
                        {format(dueDate, "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(expense.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white shadow-sm"
                        onClick={() => handlePay(expense.id)}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Pagar
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}