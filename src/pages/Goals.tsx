import { useState, useMemo } from 'react';
import { useGoals } from '@/contexts/GoalsContext';
import { useFinance } from '@/contexts/FinanceContext';
import { useIncome } from '@/contexts/IncomeContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Plus, Target, Calendar, TrendingUp, AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import { CategoryIcon } from '@/components/CategoryIcon';
import { cn } from '@/lib/utils';
import { format, differenceInMonths, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GoalForm } from '@/components/goals/GoalForm';
import { Goal } from '@/types/goals';
import { toast } from 'sonner';

export default function Goals() {
  const { goals, removeGoal } = useGoals();
  const { getMonthlyTotal, getMonthlyExpenses } = useFinance();
  const { getMonthlyIncomeTotal } = useIncome();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Calculate average savings (last 3 months)
  const averageSavings = useMemo(() => {
    const today = new Date();
    let totalSavings = 0;
    for (let i = 1; i <= 3; i++) {
      const month = today.getMonth() - i;
      const year = today.getFullYear() + (month < 0 ? -1 : 0);
      const m = month < 0 ? month + 12 : month;
      const income = getMonthlyIncomeTotal(year, m);
      const expense = getMonthlyTotal(year, m);
      totalSavings += (income - expense);
    }
    return totalSavings / 3;
  }, [getMonthlyTotal, getMonthlyIncomeTotal]);

  // Calculate current total balance (simplified for this context as sum of incomes - sum of expenses for current month, or use a global balance if available)
  // Using the same logic as Dashboard for "Real Balance" approximation or just sum of goal currents
  const currentTotalBalance = useMemo(() => {
    // This is a placeholder. Ideally, fetch real account balances.
    // For now, we use the sum of "currentAmount" in goals to show allocated funds, 
    // OR we could use the FinanceContext to get real account balances if available.
    // Let's use the average savings as a proxy for "capacity" and goal.currentAmount as "saved".
    return goals.reduce((acc, g) => acc + g.currentAmount, 0);
  }, [goals]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este objetivo?')) {
      await removeGoal(id);
      toast.success('Objetivo removido');
    }
  };

  const nearestGoal = useMemo(() => {
    if (goals.length === 0) return null;
    return [...goals].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())[0];
  }, [goals]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Target className="w-6 h-6 text-primary" />
            Objetivos
          </h1>
          <p className="text-muted-foreground">Planeje e realize seus sonhos</p>
        </div>
        <Button className="bg-primary text-primary-foreground shadow hover:bg-primary/90" onClick={() => { setEditingGoal(null); setIsFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Objetivo
        </Button>
      </div>

      {/* Summary Card */}
      {nearestGoal && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-100 dark:border-blue-900">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-full">
              <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Resumo de Progresso</p>
              <p className="text-lg text-foreground">
                Você já guardou <span className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(currentTotalBalance)}</span>. 
                Isso representa <span className="font-bold">
                  {((currentTotalBalance / nearestGoal.targetAmount) * 100).toFixed(1)}%
                </span> do seu objetivo mais próximo: <strong>{nearestGoal.name}</strong>.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {goals.map((goal) => {
          const progress = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
          const deadlineDate = parseISO(goal.deadline);
          const monthsLeft = Math.max(1, differenceInMonths(deadlineDate, new Date()));
          const daysLeft = differenceInDays(deadlineDate, new Date());
          const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);
          const monthlyNeeded = remainingAmount / monthsLeft;
          const isHard = monthlyNeeded > averageSavings && averageSavings > 0;

          return (
            <Card key={goal.id} className="flex flex-col overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", `bg-${goal.color}/10`)}>
                      <CategoryIcon iconName={goal.icon} className={cn("w-5 h-5", `text-${goal.color}`)} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{goal.name}</CardTitle>
                      <CardDescription>{formatCurrency(goal.targetAmount)}</CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingGoal(goal); setIsFormOpen(true); }}>
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(goal.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="font-medium">{progress.toFixed(0)}%</span>
                  </div>
                  <Progress value={progress} className={cn("h-2", `bg-${goal.color}/20`)} />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatCurrency(goal.currentAmount)}</span>
                    <span>Faltam {formatCurrency(remainingAmount)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm mt-auto pt-4 border-t">
                  <div className="flex flex-col">
                    <span className="text-muted-foreground text-xs flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Prazo
                    </span>
                    <span className="font-medium">{daysLeft} dias</span>
                    <span className="text-[10px] text-muted-foreground">{format(deadlineDate, 'dd/MM/yyyy')}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-muted-foreground text-xs">Parcela Mensal</span>
                    <span className="font-medium text-primary">{formatCurrency(monthlyNeeded)}</span>
                  </div>
                </div>

                {isHard && remainingAmount > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 p-2 rounded-md flex gap-2 items-start text-xs text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      Atenção: Você precisa economizar mais <strong>{formatCurrency(monthlyNeeded - averageSavings)}</strong> além da sua média atual para atingir esta meta.
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <GoalForm 
        open={isFormOpen} 
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingGoal(null);
        }} 
        goal={editingGoal} 
      />
    </div>
  );
}