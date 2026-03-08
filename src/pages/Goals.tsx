import { useState, useMemo } from 'react';
import { useGoals } from '@/contexts/GoalsContext';
import { useFinance } from '@/contexts/FinanceContext';
import { useIncome } from '@/contexts/IncomeContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus, Target, Calendar, TrendingUp, AlertTriangle, Pencil, Trash2,
  RefreshCw, Wallet, Trophy, Pause, Play, Calculator, Clock, History, X,
  Sparkles, Award, Star,
} from 'lucide-react';
import { CategoryIcon } from '@/components/CategoryIcon';
import { cn } from '@/lib/utils';
import { format, differenceInMonths, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GoalForm } from '../components/goals/GoalForm';
import { GoalSimulator } from '../components/goals/GoalSimulator';
import { Goal, GoalCategory, GOAL_CATEGORIES } from '@/types/goals';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function Goals() {
  const { goals, removeGoal, updateGoal, refreshGoals, isLoading, addContribution, removeContribution, getContributionsByGoal } = useGoals();
  const { getMonthlyTotal } = useFinance();
  const { getMonthlyIncomeTotal } = useIncome();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<GoalCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'completed' | 'paused' | 'all'>('active');

  // Add Funds
  const [isAddFundsOpen, setIsAddFundsOpen] = useState(false);
  const [goalToAddFunds, setGoalToAddFunds] = useState<Goal | null>(null);
  const [amountToAdd, setAmountToAdd] = useState('');
  const [contributionNote, setContributionNote] = useState('');
  const [contributionDate, setContributionDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // History
  const [historyGoal, setHistoryGoal] = useState<Goal | null>(null);

  // Simulator
  const [simulatorGoal, setSimulatorGoal] = useState<Goal | null>(null);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatCurrencyInput = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    const floatValue = Number(numericValue) / 100;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(floatValue);
  };

  // Average savings
  const averageSavings = useMemo(() => {
    const today = new Date();
    let totalSavings = 0;
    for (let i = 1; i <= 3; i++) {
      const month = today.getMonth() - i;
      const year = today.getFullYear() + (month < 0 ? -1 : 0);
      const m = month < 0 ? month + 12 : month;
      totalSavings += (getMonthlyIncomeTotal(year, m) - getMonthlyTotal(year, m));
    }
    return totalSavings / 3;
  }, [getMonthlyTotal, getMonthlyIncomeTotal]);

  // Filtered goals
  const filteredGoals = useMemo(() => {
    return goals.filter(g => {
      if (categoryFilter !== 'all' && g.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && g.status !== statusFilter) return false;
      return true;
    });
  }, [goals, categoryFilter, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    const active = goals.filter(g => g.status === 'active');
    const completed = goals.filter(g => g.status === 'completed');
    const totalTarget = active.reduce((s, g) => s + g.targetAmount, 0);
    const totalCurrent = active.reduce((s, g) => s + g.currentAmount, 0);
    return { active: active.length, completed: completed.length, totalTarget, totalCurrent };
  }, [goals]);

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este objetivo?')) {
      await removeGoal(id);
      toast.success('Objetivo removido');
    }
  };

  const handleToggleStatus = async (goal: Goal) => {
    const newStatus = goal.status === 'active' ? 'paused' : 'active';
    await updateGoal(goal.id, { status: newStatus });
    toast.success(newStatus === 'paused' ? 'Objetivo pausado' : 'Objetivo reativado');
  };

  const handleAddFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalToAddFunds || !amountToAdd) return;

    const value = parseFloat(amountToAdd.replace(/[^\d,]/g, '').replace(',', '.'));
    if (isNaN(value) || value <= 0) {
      toast.error('Valor inválido');
      return;
    }

    try {
      await addContribution(goalToAddFunds.id, value, contributionNote || undefined, contributionDate);
      const newTotal = goalToAddFunds.currentAmount + value;
      if (newTotal >= goalToAddFunds.targetAmount) {
        toast.success('🎉 Parabéns! Meta atingida!', { duration: 5000 });
      } else {
        toast.success('Aporte registrado!');
      }
      setIsAddFundsOpen(false);
      setAmountToAdd('');
      setContributionNote('');
      setGoalToAddFunds(null);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao adicionar aporte');
    }
  };

  const handleRemoveContribution = async (contribId: string, goalId: string, amount: number) => {
    if (!confirm('Remover este aporte?')) return;
    try {
      await removeContribution(contribId, goalId, amount);
      toast.success('Aporte removido');
    } catch {
      toast.error('Erro ao remover');
    }
  };

  const getProgressBadge = (progress: number) => {
    if (progress >= 100) return { icon: Trophy, label: 'Concluído!', color: 'text-green-600 bg-green-50 border-green-200' };
    if (progress >= 75) return { icon: Star, label: '75%', color: 'text-amber-600 bg-amber-50 border-amber-200' };
    if (progress >= 50) return { icon: Award, label: '50%', color: 'text-blue-600 bg-blue-50 border-blue-200' };
    return null;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-xs">Concluído</Badge>;
      case 'paused': return <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 text-xs">Pausado</Badge>;
      default: return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 text-xs">Ativo</Badge>;
    }
  };

  const getCategoryInfo = (cat: GoalCategory) => GOAL_CATEGORIES.find(c => c.value === cat);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Target className="w-6 h-6 text-primary" />
            Objetivos
          </h1>
          <p className="text-muted-foreground">Planeje, acompanhe e conquiste seus sonhos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refreshGoals()} disabled={isLoading} title="Atualizar">
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>
          <Button onClick={() => { setEditingGoal(null); setIsFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Novo Objetivo
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Ativos</p>
            <p className="text-2xl font-bold text-primary">{stats.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Concluídos</p>
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Guardado</p>
            <p className="text-lg font-bold text-foreground">{formatCurrency(stats.totalCurrent)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Meta Total</p>
            <p className="text-lg font-bold text-muted-foreground">{formatCurrency(stats.totalTarget)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)} className="w-full">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="active">Ativos</TabsTrigger>
            <TabsTrigger value="paused">Pausados</TabsTrigger>
            <TabsTrigger value="completed">Concluídos</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="overflow-x-auto pb-1 -mx-1 px-1">
          <div className="flex gap-2 min-w-max">
            <Button variant={categoryFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setCategoryFilter('all')}>
              Todas
            </Button>
            {GOAL_CATEGORIES.map(cat => (
              <Button
                key={cat.value}
                variant={categoryFilter === cat.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategoryFilter(cat.value)}
                className="gap-1 whitespace-nowrap"
              >
                <CategoryIcon iconName={cat.icon} className="w-3 h-3" />
                {cat.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Goals Grid */}
      {filteredGoals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum objetivo encontrado.</p>
            <Button variant="link" onClick={() => { setCategoryFilter('all'); setStatusFilter('all'); }}>
              Limpar filtros
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredGoals.map((goal) => {
            const progress = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
            const deadlineDate = parseISO(goal.deadline);
            const monthsLeft = Math.max(1, differenceInMonths(deadlineDate, new Date()));
            const daysLeft = differenceInDays(deadlineDate, new Date());
            const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);
            const monthlyNeeded = remainingAmount / monthsLeft;
            const isHard = monthlyNeeded > averageSavings && averageSavings > 0 && remainingAmount > 0;
            const badge = getProgressBadge(progress);
            const catInfo = getCategoryInfo(goal.category);
            const goalContributions = getContributionsByGoal(goal.id);

            return (
              <Card key={goal.id} className={cn(
                "flex flex-col overflow-hidden hover:shadow-md transition-shadow",
                goal.status === 'paused' && "opacity-60",
                goal.status === 'completed' && "border-green-200 bg-green-50/30 dark:bg-green-950/10",
              )}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center relative", `bg-${goal.color}/20`)}>
                        <CategoryIcon iconName={goal.icon} className={cn("w-5 h-5", `text-${goal.color}`)} />
                        {goal.status === 'completed' && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <Trophy className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {goal.name}
                          {badge && (
                            <span className={cn("inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border", badge.color)}>
                              <badge.icon className="w-3 h-3" />
                              {badge.label}
                            </span>
                          )}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-0.5">
                          {catInfo && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <CategoryIcon iconName={catInfo.icon} className={cn("w-3 h-3", `text-${catInfo.color}`)} />
                              {catInfo.label}
                            </span>
                          )}
                          {getStatusBadge(goal.status)}
                          {goal.priority === 'high' && <Badge variant="destructive" className="text-[10px] h-4 px-1">Urgente</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      {goal.status !== 'completed' && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggleStatus(goal)} title={goal.status === 'paused' ? 'Reativar' : 'Pausar'}>
                          {goal.status === 'paused' ? <Play className="w-3.5 h-3.5 text-green-600" /> : <Pause className="w-3.5 h-3.5 text-amber-600" />}
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingGoal(goal); setIsFormOpen(true); }}>
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(goal.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col gap-3">
                  {/* Progress */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-medium">{progress.toFixed(0)}%</span>
                    </div>
                    <Progress value={progress} className={cn("h-2.5 rounded-full", `bg-${goal.color}/20`)} />
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-primary">{formatCurrency(goal.currentAmount)}</span>
                      <span className="text-muted-foreground">/ {formatCurrency(goal.targetAmount)}</span>
                    </div>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-xs flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Prazo
                      </span>
                      <span className={cn("font-medium", daysLeft < 30 && daysLeft > 0 && "text-amber-600")}>
                        {daysLeft > 0 ? `${daysLeft} dias` : daysLeft === 0 ? 'Hoje!' : 'Vencido'}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{format(deadlineDate, 'dd/MM/yyyy')}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-muted-foreground text-xs">Parcela Mensal</span>
                      <span className="font-medium text-primary">{formatCurrency(monthlyNeeded)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  {goal.status === 'active' && remainingAmount > 0 && (
                    <Button
                      className="w-full mt-1 gap-2"
                      onClick={() => { setGoalToAddFunds(goal); setAmountToAdd(''); setContributionNote(''); setContributionDate(format(new Date(), 'yyyy-MM-dd')); setIsAddFundsOpen(true); }}
                    >
                      <Wallet className="w-4 h-4" />
                      Adicionar Aporte
                    </Button>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs" onClick={() => setHistoryGoal(goal)}>
                      <History className="w-3 h-3" /> Histórico ({goalContributions.length})
                    </Button>
                    {goal.status === 'active' && remainingAmount > 0 && (
                      <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs" onClick={() => setSimulatorGoal(goal)}>
                        <Calculator className="w-3 h-3" /> Simular
                      </Button>
                    )}
                  </div>

                  {/* Warning */}
                  {isHard && goal.status === 'active' && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-2 rounded-md flex gap-2 items-start text-xs text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>Economize mais <strong>{formatCurrency(monthlyNeeded - averageSavings)}</strong>/mês além da média.</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Goal Form */}
      <GoalForm
        open={isFormOpen}
        onOpenChange={(open) => { setIsFormOpen(open); if (!open) setEditingGoal(null); }}
        goal={editingGoal}
      />

      {/* Add Funds Dialog */}
      <Dialog open={isAddFundsOpen} onOpenChange={setIsAddFundsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adicionar Aporte</DialogTitle>
            <DialogDescription>
              Para: <strong>{goalToAddFunds?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddFunds} className="space-y-4">
            <div className="space-y-2">
              <Label>Valor</Label>
              <Input
                placeholder="R$ 0,00"
                value={amountToAdd}
                onChange={(e) => setAmountToAdd(formatCurrencyInput(e.target.value))}
                className="text-lg font-bold text-center"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" value={contributionDate} onChange={(e) => setContributionDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Nota (opcional)</Label>
              <Textarea
                placeholder="Ex: Bônus do trabalho"
                value={contributionNote}
                onChange={(e) => setContributionNote(e.target.value)}
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddFundsOpen(false)}>Cancelar</Button>
              <Button type="submit">Confirmar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Contribution History Dialog */}
      <Dialog open={!!historyGoal} onOpenChange={(open) => { if (!open) setHistoryGoal(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Histórico — {historyGoal?.name}
            </DialogTitle>
          </DialogHeader>
          {historyGoal && (() => {
            const contribs = getContributionsByGoal(historyGoal.id);
            if (contribs.length === 0) return <p className="text-center text-muted-foreground py-6">Nenhum aporte registrado.</p>;
            return (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Nota</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contribs.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="text-sm">{format(parseISO(c.contributedAt), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="font-medium text-green-600">{formatCurrency(c.amount)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.note || '-'}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveContribution(c.id, c.goalId, c.amount)}>
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Simulator Dialog */}
      <Dialog open={!!simulatorGoal} onOpenChange={(open) => { if (!open) setSimulatorGoal(null); }}>
        <DialogContent className="max-w-lg">
          {simulatorGoal && <GoalSimulator goal={simulatorGoal} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
