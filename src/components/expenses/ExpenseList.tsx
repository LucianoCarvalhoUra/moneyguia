import { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ChevronLeft, ChevronRight, Pencil, Trash2, Copy, Check, Clock } from 'lucide-react';
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
  const [initialData, setInitialData] = useState<Partial<Expense> | null>(null);

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
    const dt = new Date(selectedYear, selectedMonth - 1, 1);
    setSelectedMonth(dt.getMonth());
    setSelectedYear(dt.getFullYear());
  };

  const handleNextMonth = () => {
    const dt = new Date(selectedYear, selectedMonth + 1, 1);
    setSelectedMonth(dt.getMonth());
    setSelectedYear(dt.getFullYear());
  };

  const handleEdit = (expense: Expense) => {
    console.log('Editando despesa:', expense);
    setEditingExpense(expense);
    setInitialData(null);
    setFormOpen(true);
  };

  const handleCopy = (expense: Expense) => {
    const { id, ...rest } = expense;
    setEditingExpense(null);
    setInitialData(rest);
    setFormOpen(true);
  };

  const handleTogglePaid = async (expense: Expense) => {
    await updateExpense(expense.id, { isPaid: !expense.isPaid });
    toast.success(expense.isPaid ? 'Marcado como pendente' : 'Marcado como pago');
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir?')) {
      await removeExpense(id);
      toast.success('Despesa removida');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Despesas</h1>
          <p className="text-muted-foreground">Gerencie suas despesas mensais</p>
        </div>
        <Button onClick={() => { setEditingExpense(null); setInitialData(null); setFormOpen(true); }}>
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
        <CardContent className="p-0">
          {expenses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Nenhuma despesa neste mês.</div>
          ) : (
            <div className="min-w-[1000px]">
              <div className="grid grid-cols-[1.5fr_1.5fr_120px_1fr_100px_120px] gap-4 px-6 py-3 border-b bg-muted/30 text-sm font-medium text-muted-foreground">
                <div className="font-semibold">Categoria</div>
                <div className="font-semibold">Subcategoria</div>
                <div className="font-semibold">Vencimento</div>
                <div className="font-semibold">Valor</div>
                <div className="text-center font-semibold">Status</div>
                <div className="text-right font-semibold">Ações</div>
              </div>

              <div className="divide-y">
              {expenses.map((expense) => {
                const category = getCategoryById(expense.categoryId);
                const subcategory = expense.subcategoryId ? getSubcategoryById(expense.subcategoryId) : null;

                return (
                  <div key={expense.id} className={cn("grid grid-cols-[1.5fr_1.5fr_120px_1fr_100px_120px] gap-4 items-center px-6 py-4 hover:bg-muted/50 transition-colors group", expense.isPaid ? "opacity-75" : "")}>
                    {/* Categoria */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', category?.color ? `bg-${category.color}/15` : 'bg-muted/50')}>
                        <CategoryIcon iconName={category?.icon || 'Package'} className={cn("w-4 h-4", category?.color ? `text-${category.color}` : "text-muted-foreground")} />
                      </div>
                      <span className="font-medium truncate">{category?.name}</span>
                    </div>
                    
                    {/* Subcategoria */}
                    <div className="text-sm text-muted-foreground truncate">
                      {subcategory?.name || '-'}
                    </div>

                    {/* Vencimento */}
                    <div className="text-sm">
                      {expense.dueDate ? expense.dueDate.toLocaleDateString('pt-BR') : '-'}
                    </div>

                    {/* Valor */}
                    <div className="font-bold text-sm">
                      {formatCurrency(expense.amount)}
                    </div>

                    {/* Status */}
                    <div className="flex justify-center">
                      {expense.isPaid ? 
                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Pago</Badge> : 
                        <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">Pendente</Badge>
                      }
                    </div>

                    {/* Ações */}
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity w-[120px]">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopy(expense)} title="Copiar">
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(expense)} title="Editar">
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(expense.id)} title="Excluir">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ExpenseForm open={formOpen} onOpenChange={setFormOpen} expense={editingExpense} initialData={initialData} />
    </div>
  );
}