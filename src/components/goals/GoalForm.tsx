// Componente de formulário para objetivos
import { useState, useEffect, useMemo } from 'react';
import { useGoals } from '@/contexts/GoalsContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CategoryIcon, iconMap } from '@/components/CategoryIcon';
import { cn } from '@/lib/utils';
import { Goal } from '@/types/goals';
import { Loader2, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { differenceInMonths } from 'date-fns';

const AVAILABLE_COLORS = [
  'slate-500', 'red-500', 'orange-500', 'amber-500', 'yellow-500', 'lime-500',
  'green-500', 'emerald-500', 'teal-500', 'cyan-500', 'sky-500', 'blue-500', 'blue-600',
  'indigo-500', 'violet-500', 'purple-500', 'fuchsia-500', 'pink-500', 'rose-500'
];

const AVAILABLE_ICONS = Object.keys(iconMap);

interface GoalFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: Goal | null;
}

export const GoalForm = ({ open, onOpenChange, goal }: GoalFormProps) => {
  const { addGoal, updateGoal } = useGoals();
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [icon, setIcon] = useState('Target');
  const [color, setColor] = useState('blue-500');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate monthly savings needed
  const monthlyProjection = useMemo(() => {
    if (!targetAmount || !deadline) return 0;
    
    const target = parseFloat(targetAmount.replace(',', '.')) || 0;
    const current = parseFloat(currentAmount.replace(',', '.')) || 0;
    const remaining = Math.max(0, target - current);
    
    const today = new Date();
    const targetDate = new Date(deadline);
    const months = differenceInMonths(targetDate, today);
    
    if (months <= 0) return remaining; // If due now or past, need full amount
    return remaining / months;
  }, [targetAmount, currentAmount, deadline]);

  useEffect(() => {
    if (goal) {
      setName(goal.name);
      setTargetAmount(goal.targetAmount.toString());
      setCurrentAmount(goal.currentAmount.toString());
      setDeadline(goal.deadline);
      setIcon(goal.icon);
      setColor(goal.color);
    } else {
      resetForm();
    }
  }, [goal, open]);

  const resetForm = () => {
    setName('');
    setTargetAmount('');
    setCurrentAmount('');
    setDeadline('');
    setIcon('Target');
    setColor('blue-500');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !targetAmount || !deadline) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);
    try {
      const goalData = {
        name,
        targetAmount: parseFloat(targetAmount.replace(',', '.')),
        currentAmount: parseFloat(currentAmount.replace(',', '.')) || 0,
        deadline,
        icon,
        color,
      };

      if (goal) {
        await updateGoal(goal.id, goalData);
        toast.success('Objetivo atualizado!');
      } else {
        await addGoal(goalData);
        toast.success('Objetivo criado!');
      }
      onOpenChange(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{goal ? 'Editar Objetivo' : 'Novo Objetivo'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do Objetivo</Label>
            <Input placeholder="Ex: Casa Própria" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor Alvo</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                <Input type="number" step="0.01" className="pl-9" placeholder="0,00" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Valor Inicial</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                <Input type="number" step="0.01" className="pl-9" placeholder="0,00" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Data Limite</Label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>

          {/* Calculation Feedback */}
          {monthlyProjection > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Calculator className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-primary">Planejamento Mensal</p>
                <p className="text-xs text-muted-foreground">
                  Para atingir sua meta até a data limite, você precisa guardar aproximadamente <span className="font-bold text-foreground">{formatCurrency(monthlyProjection)}</span> por mês.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Ícone</Label>
            <div className="grid grid-cols-6 gap-2 max-h-[150px] overflow-y-auto p-1 border rounded-md">
              {AVAILABLE_ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center transition-all',
                    icon === ic 
                      ? `bg-${color}/20 text-${color} ring-2 ring-${color} ring-offset-1` 
                      : 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  <CategoryIcon iconName={ic} className="w-5 h-5" />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="grid grid-cols-6 gap-2">
              {AVAILABLE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-10 h-10 rounded-lg border-2 transition-all',
                    `bg-${c}`,
                    color === c ? 'border-foreground ring-2 ring-offset-2 ring-foreground/20 scale-110' : 'border-transparent hover:scale-105'
                  )}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
