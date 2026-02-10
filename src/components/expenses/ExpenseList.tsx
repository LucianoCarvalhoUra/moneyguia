import { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ChevronLeft, ChevronRight, Pencil, Trash2, Check, Clock } from 'lucide-react';
import { Expense, PAYMENT_METHOD_LABELS } from '@/types/finance';
import ExpenseForm from './ExpenseForm';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { CategoryIcon } from '@/components/CategoryIcon';
import { toast } from 'sonner';

export default function ExpenseList() {
  const { getMonthlyExpenses, getMonthlyTotal, removeExpense, updateExpense, getCategoryById, getSubcategoryById } = useFinance();
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const expenses = getMonthlyExpenses(selectedYear, selectedMonth);
  const total = getMonthlyTotal(selectedYear, selectedMonth);

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const handlePreviousMonth = () => {
    const prev = new Date(selectedYear, selectedMonth - 1, 1);
    setSelectedMonth(prev.getMonth());
    setSelectedYear(prev.getFullYear());
  };

  const handleNextMonth = () => {
    const next = new Date(selectedYear, selectedMonth + 1, 1);
    setSelectedMonth(next.getMonth());
    setSelectedYear(next.getFullYear());
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir?')) {
      await removeExpense(id);
      toast.success('Despesa removida');
    }
  };

  const handleTogglePaid = async (expense: Expense) => {
    await updateExpense(expense.id, { isPaid: !expense.isPaid });
    toast.success(expense.isPaid ? 'Marcado como pendente' : 'Marcado como pago');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Despesas</h1>
          <p className="text-muted-foreground">Gerencie suas despesas mensais</p>
        </div>
        <Button onClick={() => { setEditingExpense(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Nova Despesa
        </Button>
      </div>

      {/* Seletor de Mês */}
      <Card>
        <CardContent className="py-4 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={handlePreviousMonth}><ChevronLeft className="w-5 h-5" /></Button>
          <div className="flex items-center gap-3">
            <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>{months.map((m, i) => <SelectItem key={i} value={i.toString()}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>{years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button variant="ghost" size="icon" onClick={handleNextMonth}><ChevronRight className="w-5 h-5" /></Button>
        </CardContent>
      </Card>

      {/* Resumo */}
      <Card className="bg-primary text-primary-foreground border-0">
        <CardContent className="py-6 text-center">
          <p className="text-sm opacity-80">Total em {months[selectedMonth]}</p>
          <p className="text-3xl font-bold mt-1">{formatCurrency(total)}</p>
        </CardContent>
      </Card>

      {/* Lista */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Lista de Despesas</CardTitle></CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Nenhuma despesa neste mês.</div>
          ) : (
            <div className="space-y-3">
              {expenses.map((expense) => {
                const category = getCategoryById(expense.categoryId);
                const subcategory = expense.subcategoryId ? getSubcategoryById(expense.subcategoryId) : null;

                return (
                  <div key={expense.id} className={cn("flex items-center gap-4 p-4 rounded-xl hover:bg-muted transition-colors group", expense.isPaid ? "opacity-75" : "")}>
                    <div className={cn('w-12 h-12 rounded-full flex items-center justify-center', category?.color ? `bg-${category.color}/15` : 'bg-muted/50')}>
                      <CategoryIcon iconName={category?.icon || 'Package'} className={cn("w-6 h-6", category?.color ? `text-${category.color}` : "text-muted-foreground")} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className={cn("font-medium truncate", expense.isPaid && "line-through text-muted-foreground")}>{expense.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {category?.name} {subcategory && `→ ${subcategory.name}`} • {PAYMENT_METHOD_LABELS[expense.paymentMethod]}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-lg">{formatCurrency(expense.amount)}</p>
                    </div>

                    <div className="min-w-[100px] flex justify-center">
                      {expense.isPaid ? 
                        <Badge variant="outline" className="text-green-600 border-green-200"><Check className="w-3 h-3 mr-1" />Pago</Badge> : 
                        <Badge variant="outline" className="text-yellow-600 border-yellow-200"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>
                      }
                    </div>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => handleTogglePaid(expense)}><Check className={cn("w-4 h-4", expense.isPaid ? "text-green-600" : "text-muted-foreground")} /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(expense)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(expense.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ExpenseForm open={formOpen} onOpenChange={setFormOpen} expense={editingExpense} />
    </div>
  );
}