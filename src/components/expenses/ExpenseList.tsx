import { useState, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useIncome } from '@/contexts/IncomeContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { format, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, ArrowUpDown, Check, Clock, AlertTriangle } from 'lucide-react';
import { Expense, PAYMENT_METHOD_LABELS } from '@/types/finance';
import ExpenseForm from './ExpenseForm';
import ExpenseCategoryChart from '@/components/dashboard/ExpenseCategoryChart';
import IncomeExpenseChart from '@/components/dashboard/IncomeExpenseChart';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { CategoryIcon } from '@/components/CategoryIcon';

type SortField = 'dueDate' | 'expenseDate' | 'category' | 'subcategory' | 'paymentMethod' | 'amount';
type SortOrder = 'asc' | 'desc';

export default function ExpenseList() {
  const { getMonthlyExpenses, removeExpense, updateExpense, getMonthlyTotal, getCategoryById, getSubcategoryById, getTotalByCategory } = useFinance();
  const { getMonthlyIncomeTotal } = useIncome();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('dueDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const expenses = getMonthlyExpenses(selectedYear, selectedMonth);
  const total = getMonthlyTotal(selectedYear, selectedMonth);
  const incomeTotal = getMonthlyIncomeTotal(selectedYear, selectedMonth);
  const categoryTotals = getTotalByCategory(selectedYear, selectedMonth);

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
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    setExpenseToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (expenseToDelete) {
      removeExpense(expenseToDelete);
      toast.success('Despesa removida com sucesso!');
    }
    setDeleteDialogOpen(false);
    setExpenseToDelete(null);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setEditingExpense(undefined);
    }
  };

  const handleTogglePaid = async (expense: Expense) => {
    await updateExpense(expense.id, { isPaid: !expense.isPaid });
    toast.success(expense.isPaid ? 'Despesa marcada como pendente' : 'Despesa marcada como paga');
  };

  const sortedExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'dueDate':
          comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          break;
        case 'expenseDate':
          comparison = new Date(a.expenseDate).getTime() - new Date(b.expenseDate).getTime();
          break;
        case 'category':
          const catA = getCategoryById(a.categoryId)?.name || '';
          const catB = getCategoryById(b.categoryId)?.name || '';
          comparison = catA.localeCompare(catB);
          break;
        case 'subcategory':
          const subA = a.subcategoryId ? getSubcategoryById(a.subcategoryId)?.name || '' : '';
          const subB = b.subcategoryId ? getSubcategoryById(b.subcategoryId)?.name || '' : '';
          comparison = subA.localeCompare(subB);
          break;
        case 'paymentMethod':
          comparison = (PAYMENT_METHOD_LABELS[a.paymentMethod] || '').localeCompare(PAYMENT_METHOD_LABELS[b.paymentMethod] || '');
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        default:
          comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [expenses, sortField, sortOrder, getCategoryById, getSubcategoryById]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Despesas</h1>
          <p className="text-muted-foreground">Gerencie suas despesas mensais</p>
        </div>
        <Button variant="hero" onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Despesa
        </Button>
      </div>

      {/* Month Selector */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={handlePreviousMonth}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            
            <div className="flex items-center gap-3">
              <Select
                value={selectedMonth.toString()}
                onValueChange={(v) => setSelectedMonth(parseInt(v))}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedYear.toString()}
                onValueChange={(v) => setSelectedYear(parseInt(v))}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button variant="ghost" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="gradient-primary border-0">
        <CardContent className="py-6">
          <div className="text-center text-primary-foreground">
            <p className="text-sm opacity-80">Total em {months[selectedMonth]}</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(total)}</p>
            <p className="text-sm opacity-80 mt-1">{expenses.length} despesa(s)</p>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ExpenseCategoryChart data={categoryTotals} total={total} />
        <IncomeExpenseChart income={incomeTotal} expense={total} />
      </div>

      {/* Expense List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">Lista de Despesas</CardTitle>
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dueDate">Data de Vencimento</SelectItem>
                <SelectItem value="expenseDate">Data de Pagamento</SelectItem>
                <SelectItem value="category">Categoria</SelectItem>
                <SelectItem value="subcategory">Subcategoria</SelectItem>
                <SelectItem value="paymentMethod">Forma de Pagamento</SelectItem>
                <SelectItem value="amount">Valor</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as SortOrder)}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Crescente</SelectItem>
                <SelectItem value="desc">Decrescente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {sortedExpenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p className="text-lg">Nenhuma despesa neste mês</p>
              <p className="text-sm">Clique em "Nova Despesa" para começar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedExpenses.map((expense) => {
                const category = getCategoryById(expense.categoryId);
                const subcategory = expense.subcategoryId ? getSubcategoryById(expense.subcategoryId) : null;
                
                const dueDate = new Date(expense.dueDate);
                const isOverdue = !expense.isPaid && isBefore(startOfDay(dueDate), startOfDay(new Date()));

                return (
                  <div
                    key={expense.id}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl hover:bg-muted transition-colors group",
                      expense.isPaid 
                        ? "bg-muted/30 opacity-75" 
                        : isOverdue 
                          ? "bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50" 
                          : "bg-muted/50"
                    )}
                  >
                    <div
                      className={cn(
                        'w-12 h-12 rounded-full flex items-center justify-center', category?.color ? `bg-${category.color}/15` : 'bg-muted/50'
                      )}
                    >
                      <CategoryIcon iconName={category?.icon || 'Package'} className={cn("w-6 h-6", category?.color ? `text-${category.color}` : "text-muted-foreground")} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn(
                          "font-medium truncate",
                          expense.isPaid ? "line-through text-muted-foreground" : "text-foreground"
                        )}>
                          {expense.description || category?.name || 'Sem categoria'}
                        </p>
                        {expense.isPaid ? (
                          <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs">
                            <Check className="w-3 h-3 mr-1" />
                            Pago
                          </Badge>
                        ) : isOverdue ? (
                          <Badge variant="outline" className="bg-red-100 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 text-xs">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Vencido
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            Pendente
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {category?.name || 'Sem categoria'}
                        {subcategory && ` → ${subcategory.name}`}
                        {' • '}
                        {PAYMENT_METHOD_LABELS[expense.paymentMethod]} •{' '}
                        Vence em {format(new Date(expense.dueDate), "dd 'de' MMMM", { locale: ptBR })}
                      </p>
                      {expense.observation && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          📝 {expense.observation}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className={cn(
                        "font-bold text-lg flex items-center justify-end gap-1",
                        expense.isPaid 
                          ? "text-muted-foreground" 
                          : isOverdue 
                            ? "text-red-600 dark:text-red-400" 
                            : "text-foreground"
                      )}>
                        {isOverdue && <AlertTriangle className="w-4 h-4" />}
                        {formatCurrency(expense.amount)}
                      </p>
                    </div>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleTogglePaid(expense)}
                        title={expense.isPaid ? "Marcar como pendente" : "Marcar como pago"}
                      >
                        <Check className={cn("w-4 h-4", expense.isPaid ? "text-success" : "text-muted-foreground")} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(expense)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(expense.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Forms and Dialogs */}
      <ExpenseForm
        open={formOpen}
        onOpenChange={handleFormClose}
        expense={editingExpense}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta despesa? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
