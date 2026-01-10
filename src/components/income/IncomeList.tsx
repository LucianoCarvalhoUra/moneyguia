import { useState } from 'react';
import { useIncome } from '@/contexts/IncomeContext';
import { useFinance } from '@/contexts/FinanceContext';
import { Income } from '@/types/income';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Pencil, Trash2, RefreshCw } from 'lucide-react';
import IncomeForm from './IncomeForm';
import { cn } from '@/lib/utils';

interface IncomeListProps {
  year: number;
  month: number;
}

export default function IncomeList({ year, month }: IncomeListProps) {
  const { getMonthlyIncomes, removeIncome, getIncomeCategoryById } = useIncome();
  const { accounts } = useFinance();
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [deletingIncomeId, setDeletingIncomeId] = useState<string | null>(null);

  const monthlyIncomes = getMonthlyIncomes(year, month);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const handleDelete = () => {
    if (deletingIncomeId) {
      removeIncome(deletingIncomeId);
      setDeletingIncomeId(null);
    }
  };

  const getAccountName = (accountId?: string) => {
    if (!accountId) return null;
    const account = accounts.find(a => a.id === accountId);
    return account ? `${account.bankName}` : null;
  };

  if (monthlyIncomes.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground text-center">
            Nenhuma receita registrada neste mês
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Receitas do Mês</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {monthlyIncomes.map((income) => {
            const category = getIncomeCategoryById(income.categoryId);
            const accountName = getAccountName(income.accountId);

            return (
              <div
                key={income.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center text-lg">
                    {category?.icon || '💰'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{income.title}</p>
                      {income.isRecurring && (
                        <RefreshCw className="w-3 h-3 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{category?.name || 'Sem categoria'}</span>
                      {accountName && (
                        <>
                          <span>•</span>
                          <span>{accountName}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{format(new Date(income.receiveDate), 'dd/MM/yyyy', { locale: ptBR })}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="font-semibold text-success">
                    +{formatCurrency(income.amount)}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingIncome(income)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingIncomeId(income.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Edit Form */}
      <IncomeForm
        open={!!editingIncome}
        onOpenChange={(open) => !open && setEditingIncome(null)}
        income={editingIncome || undefined}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingIncomeId} onOpenChange={(open) => !open && setDeletingIncomeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta receita? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
