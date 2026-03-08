import { useState, useMemo, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useFinance } from '@/contexts/FinanceContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, isBefore, startOfDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Plus, Pencil, Trash2, Calendar, Filter, X, ChevronLeft, ChevronRight, History, CalendarClock, CalendarDays, Copy, Check, ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ExpenseForm from '@/components/expenses/ExpenseForm';
import { CategoryIcon } from '@/components/CategoryIcon';
import { Expense } from '@/types/finance';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { EyeOff } from 'lucide-react';

export default function Expenses() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { expenses, categories, subcategories, removeExpense, updateExpense, refreshData } = useFinance();
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const p = searchParams.get('month');
    return p !== null ? parseInt(p) : new Date().getMonth();
  });
  const [selectedYear, setSelectedYear] = useState(() => {
    const p = searchParams.get('year');
    return p !== null ? parseInt(p) : new Date().getFullYear();
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState('all');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [duplicatingExpense, setDuplicatingExpense] = useState<Expense | null>(null);
  const [sortField, setSortField] = useState<'dueDate' | 'category' | 'description' | 'amount' | 'status'>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [selectedDeleteScope, setSelectedDeleteScope] = useState<'single' | 'future' | 'past' | 'all'>('single');

  const getMonthLabel = (monthIndex: number) => {
    const label = format(new Date(selectedYear, monthIndex, 1), 'MMMM', { locale: ptBR });
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  const years = Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - 3 + i);

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const handlePreviousMonth = () => {
    if (statusFilter === 'overdue') {
      setStatusFilter('all');
    }

    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (statusFilter === 'overdue') {
      setStatusFilter('all');
    }

    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  useEffect(() => {
    if (location.state?.filter === 'overdue') {
      setStatusFilter('overdue');
      if (location.state.month !== undefined && location.state.year !== undefined) {
        setSelectedMonth(location.state.month);
        setSelectedYear(location.state.year);
      }
      window.history.replaceState({}, document.title);
    }
  }, [location.state, expenses]);

  const filteredSubcategories = useMemo(() => {
    if (categoryFilter === 'all') return [];
    return subcategories.filter(sub => sub.categoryId === categoryFilter);
  }, [categoryFilter, subcategories]);

  const getExpenseStatusRank = (expense: Expense) => {
    const dueDate = new Date(expense.dueDate);
    const isOverdue = !expense.isPaid && isBefore(startOfDay(dueDate), startOfDay(new Date()));
    if (expense.isPaid) return 2;
    if (isOverdue) return 0;
    return 1;
  };

  const handleSort = (field: 'dueDate' | 'category' | 'description' | 'amount' | 'status') => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortField(field);
    setSortOrder('desc');
  };

  const renderSortIcon = (field: 'dueDate' | 'category' | 'description' | 'amount' | 'status') => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/60" />;
    return sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-foreground" /> : <ArrowDown className="h-3.5 w-3.5 text-foreground" />;
  };

  const filteredExpenses = useMemo(() => {
    return expenses
      .filter(expense => {
        const expenseDate = new Date(expense.dueDate);
        if (statusFilter === 'overdue') return !expense.isPaid && isBefore(expenseDate, startOfDay(new Date()));
        if (statusFilter !== 'overdue' && (expenseDate.getMonth() !== selectedMonth || expenseDate.getFullYear() !== selectedYear)) return false;
        if (statusFilter === 'paid' && !expense.isPaid) return false;
        if (statusFilter === 'pending' && expense.isPaid) return false;
        if (categoryFilter !== 'all' && expense.categoryId !== categoryFilter) return false;
        if (subcategoryFilter !== 'all' && expense.subcategoryId !== subcategoryFilter) return false;
        if (searchTerm) {
          const category = categories.find(c => c.id === expense.categoryId);
          const subcategory = subcategories.find(s => s.id === expense.subcategoryId);
          return `${category?.name} ${subcategory?.name}`.toLowerCase().includes(searchTerm.toLowerCase());
        }
        return true;
      })
      .sort((a, b) => {
        const categoryA = categories.find(c => c.id === a.categoryId)?.name || '';
        const categoryB = categories.find(c => c.id === b.categoryId)?.name || '';

        let comparison = 0;
        switch (sortField) {
          case 'category':
            comparison = categoryA.localeCompare(categoryB, 'pt-BR', { sensitivity: 'base' });
            break;
          case 'description':
            comparison = a.description.localeCompare(b.description, 'pt-BR', { sensitivity: 'base' });
            break;
          case 'amount':
            comparison = a.amount - b.amount;
            break;
          case 'status':
            comparison = getExpenseStatusRank(a) - getExpenseStatusRank(b);
            break;
          case 'dueDate':
          default:
            comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            break;
        }

        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [expenses, selectedMonth, selectedYear, statusFilter, categoryFilter, subcategoryFilter, searchTerm, sortField, sortOrder, categories, subcategories]);

  const handleClearFilters = () => {
    setStatusFilter('all');
    setCategoryFilter('all');
    setSubcategoryFilter('all');
    setSearchTerm('');
    setSortField('dueDate');
    setSortOrder('desc');
  };

  const handleDelete = (expense: Expense) => {
    setExpenseToDelete(expense);
    // Define 'single' como padrão para garantir que o botão Confirmar funcione para itens únicos
    // Se for recorrente, o usuário poderá alterar no modal
    setSelectedDeleteScope('single');
    setDeleteDialogOpen(true);
  };
  
  const handleConfirmDelete = async () => {
    if (!expenseToDelete) return;

    try {
      let query;
      const { recurrenceId, id, dueDate } = expenseToDelete;
      
      // Se for exclusão única ou não tiver recorrência
      if (selectedDeleteScope === 'single' || !recurrenceId) {
        query = supabase.from('expenses').delete().eq('id', id);
      } else if (selectedDeleteScope === 'future') {
        query = supabase.from('expenses').delete().eq('recurrence_id', recurrenceId).gte('due_date', format(new Date(dueDate), 'yyyy-MM-dd'));
      } else if (selectedDeleteScope === 'past') {
        query = supabase.from('expenses').delete().eq('recurrence_id', recurrenceId).lte('due_date', format(new Date(dueDate), 'yyyy-MM-dd'));
      } else { // 'all'
        query = supabase.from('expenses').delete().eq('recurrence_id', recurrenceId);
      }
      
      const { error } = await query;
      if (error) throw error;

      toast.success('Despesa(s) removida(s) com sucesso!');
      await refreshData();
      setDeleteDialogOpen(false); // Ensure dialog closes immediately
      setExpenseToDelete(null);
      setSelectedDeleteScope('single');
    } catch (error: any) {
      toast.error(`Erro ao remover despesa(s): ${error.message}`);
    }
  };

  const handlePay = async (id: string, currentStatus: boolean) => {
    try {
      await updateExpense(id, { isPaid: !currentStatus });
      toast.success(currentStatus ? 'Despesa marcada como pendente' : 'Despesa marcada como paga');
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setIsFormOpen(true);
  };

  const handleDuplicate = (expense: Expense) => {
    setDuplicatingExpense({
      ...expense,
      description: `${expense.description} (Cópia)`,
      dueDate: new Date(), // Define para hoje por conveniência
      isPaid: false,
    });
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header, Date Selector, Filters, etc. */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Despesas</h1>
          <p className="text-muted-foreground">Gerencie seus gastos</p>
        </div>
        <Button className="bg-primary text-primary-foreground shadow hover:bg-primary/90" onClick={() => { setEditingExpense(null); setDuplicatingExpense(null); setIsFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Nova Despesa
        </Button>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-center gap-4">
            <Button variant="ghost" size="icon" onClick={handlePreviousMonth} className="bg-green-100 text-green-700 hover:bg-green-200 hover:text-green-800 rounded-md w-8 h-8">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <span className="text-lg font-bold min-w-[160px] text-center capitalize text-foreground">
              {getMonthLabel(selectedMonth)} {selectedYear}
            </span>
            <Button variant="ghost" size="icon" onClick={handleNextMonth} className="bg-green-100 text-green-700 hover:bg-green-200 hover:text-green-800 rounded-md w-8 h-8">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" className="gap-2" onClick={() => setIsFiltersOpen(!isFiltersOpen)}>
          <Filter className="w-4 h-4" /> {isFiltersOpen ? 'Ocultar Filtros' : 'Filtros e Opções'}
        </Button>
      </div>

      {isFiltersOpen && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Filtros Avançados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Descrição..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="paid">Pagos</SelectItem>
                    <SelectItem value="pending">Pendentes</SelectItem>
                    <SelectItem value="overdue">Vencidos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subcategoria</Label>
                <Select value={subcategoryFilter} onValueChange={setSubcategoryFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {filteredSubcategories.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button variant="ghost" onClick={handleClearFilters} size="sm">Limpar Filtros</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20">
        <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total de Despesas ({getMonthLabel(selectedMonth)}/{selectedYear})</p>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">{formatCurrency(filteredExpenses.filter(e => !(e as any).excludeFromCalculations).reduce((acc, curr) => acc + curr.amount, 0))}</p>
          </div>
          <div className="text-sm text-muted-foreground bg-background/50 px-3 py-1 rounded-md border">{filteredExpenses.length} registro(s) encontrado(s)</div>
        </CardContent>
      </Card>
      
      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button type="button" onClick={() => handleSort('category')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                    Categoria {renderSortIcon('category')}
                  </button>
                </TableHead>
                <TableHead>
                  <button type="button" onClick={() => handleSort('dueDate')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                    Vencimento {renderSortIcon('dueDate')}
                  </button>
                </TableHead>
                <TableHead>
                  <button type="button" onClick={() => handleSort('description')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                    Descrição {renderSortIcon('description')}
                  </button>
                </TableHead>
                <TableHead>
                  <button type="button" onClick={() => handleSort('amount')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                    Valor {renderSortIcon('amount')}
                  </button>
                </TableHead>
                <TableHead className="text-center">
                  <button type="button" onClick={() => handleSort('status')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                    Status {renderSortIcon('status')}
                  </button>
                </TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma despesa encontrada.</TableCell></TableRow>
              ) : (
                filteredExpenses.map((expense) => {
                    const category = categories.find(c => c.id === expense.categoryId);
                    const subcategory = subcategories.find(s => s.id === expense.subcategoryId);
                    
                    const dueDate = expense.dueDate;
                    const isOverdue = !expense.isPaid && isBefore(startOfDay(dueDate), startOfDay(new Date()));
                    const isPaid = expense.isPaid;

                    return (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {(expense as any).excludeFromCalculations && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>Não contabilizado no saldo</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          <div className={cn("w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0", category?.color ? `bg-${category.color}/10` : "bg-muted")}>
                            <CategoryIcon iconName={category?.icon || 'Package'} className={cn("w-4 h-4", category?.color ? `text-${category.color}` : "text-muted-foreground")} />
                          </div>
                          <span>{category?.name || 'Sem categoria'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={cn("text-sm", isOverdue ? "text-destructive font-bold" : "text-muted-foreground")}>
                          {format(dueDate, 'dd/MM/yyyy')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{expense.description}</span>
                          {subcategory && <span className="text-xs text-muted-foreground">{subcategory.name}</span>}
                        </div>
                      </TableCell>
                      <TableCell className={cn("font-medium", isOverdue ? "text-destructive font-bold" : isPaid ? "text-green-600 dark:text-green-400" : "")}>
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        {isPaid && <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">Pago</Badge>}
                        {!isPaid && isOverdue && <Badge variant="destructive">Atrasado</Badge>}
                        {!isPaid && !isOverdue && <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800">Pendente</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className={cn("h-8 w-8", expense.isPaid ? "text-green-600 hover:text-green-700" : "text-muted-foreground hover:text-green-600")}
                            onClick={() => handlePay(expense.id, expense.isPaid)} 
                            title={expense.isPaid ? "Marcar como pendente" : "Marcar como pago"}
                          ><Check className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDuplicate(expense)} title="Duplicar"><Copy className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEdit(expense)}><Pencil className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(expense)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ExpenseForm open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) { setEditingExpense(null); setDuplicatingExpense(null); } }} expense={editingExpense} initialData={duplicatingExpense} />
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Transação</AlertDialogTitle>
            <AlertDialogDescription>
              {expenseToDelete?.recurrenceId 
                ? "Esta despesa é recorrente. Como você gostaria de excluí-la?"
                : "Tem certeza que deseja excluir esta despesa?"
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          {expenseToDelete?.recurrenceId && (
            <div className="flex flex-col gap-2 py-4">
              <div 
                className={cn("flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all", selectedDeleteScope === 'single' ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-accent")}
                onClick={() => setSelectedDeleteScope('single')}
              >
                  <div className="p-2 bg-muted rounded-md"><Calendar className="w-4 h-4" /></div>
                  <div className="text-left"><p className="font-medium">Apenas esta</p><p className="text-xs text-muted-foreground">Exclui somente este registro</p></div>
              </div>
              <div 
                className={cn("flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all", selectedDeleteScope === 'future' ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-accent")}
                onClick={() => setSelectedDeleteScope('future')}
              >
                  <div className="p-2 bg-muted rounded-md"><CalendarClock className="w-4 h-4" /></div>
                  <div className="text-left"><p className="font-medium">Esta e futuras</p><p className="text-xs text-muted-foreground">Exclui este e todos os próximos</p></div>
              </div>
              <div 
                className={cn("flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all", selectedDeleteScope === 'past' ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-accent")}
                onClick={() => setSelectedDeleteScope('past')}
              >
                  <div className="p-2 bg-muted rounded-md"><History className="w-4 h-4" /></div>
                  <div className="text-left"><p className="font-medium">Esta e Passadas</p><p className="text-xs text-muted-foreground">Exclui este e todos os anteriores</p></div>
              </div>
              <div 
                className={cn("flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all", selectedDeleteScope === 'all' ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-accent")}
                onClick={() => setSelectedDeleteScope('all')}
              >
                  <div className="p-2 bg-muted rounded-md"><CalendarDays className="w-4 h-4" /></div>
                  <div className="text-left"><p className="font-medium">Todas</p><p className="text-xs text-muted-foreground">Exclui toda a série histórica</p></div>
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


