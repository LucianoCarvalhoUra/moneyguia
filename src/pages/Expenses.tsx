import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useFinance } from '@/contexts/FinanceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, isBefore, startOfDay } from 'date-fns';
import { Search, Plus, Pencil, Trash2, CheckCircle2, AlertCircle, Calendar, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ExpenseForm from '@/components/expenses/ExpenseForm';
import { Badge } from '@/components/ui/badge';
import { CategoryIcon } from '@/components/CategoryIcon';

export default function Expenses() {
  const location = useLocation();
  const { expenses, categories, subcategories, removeExpense, updateExpense } = useFinance();
  
  // 1. Escopo de Variáveis
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState('all');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  // Constantes
  const months = [
    { value: 0, label: 'Janeiro' },
    { value: 1, label: 'Fevereiro' },
    { value: 2, label: 'Março' },
    { value: 3, label: 'Abril' },
    { value: 4, label: 'Maio' },
    { value: 5, label: 'Junho' },
    { value: 6, label: 'Julho' },
    { value: 7, label: 'Agosto' },
    { value: 8, label: 'Setembro' },
    { value: 9, label: 'Outubro' },
    { value: 10, label: 'Novembro' },
    { value: 11, label: 'Dezembro' },
  ];

  const years = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

  // Funções Auxiliares
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
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

  // Handle Deep Link from Dashboard Alert
  useEffect(() => {
    if (location.state?.filter === 'overdue') {
      setStatusFilter('overdue');
      
      if (location.state?.focusExpenseId) {
        const expense = expenses.find(e => e.id === location.state.focusExpenseId);
        if (expense) {
          setEditingExpense(expense);
          setIsFormOpen(true);
        }
      }
      // Clear state to avoid re-triggering
      window.history.replaceState({}, document.title);
    }
  }, [location.state, expenses]);

  // Filtered Subcategories
  const filteredSubcategories = useMemo(() => {
    if (categoryFilter === 'all') return [];
    return subcategories.filter(sub => sub.categoryId === categoryFilter);
  }, [categoryFilter, subcategories]);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses
      .filter(expense => {
        const expenseDate = new Date(expense.dueDate);
        
        // Special Overdue Filter (Bypasses Month/Year)
        if (statusFilter === 'overdue') {
          return !expense.isPaid && isBefore(expenseDate, startOfDay(new Date()));
        }

        // Month/Year Filter (Only if not overdue filter)
        if (statusFilter !== 'overdue' && (expenseDate.getMonth() !== selectedMonth || expenseDate.getFullYear() !== selectedYear)) {
           return false;
        }

        // Status Filter
        if (statusFilter === 'paid' && !expense.isPaid) return false;
        if (statusFilter === 'pending' && expense.isPaid) return false;
        // 'overdue' is handled above

        // Category Filter
        if (categoryFilter !== 'all' && expense.categoryId !== categoryFilter) return false;

        // Subcategory Filter
        if (subcategoryFilter !== 'all' && expense.subcategoryId !== subcategoryFilter) return false;

        // Search Filter
        if (searchTerm) {
          const category = categories.find(c => c.id === expense.categoryId);
          const subcategory = subcategories.find(s => s.id === expense.subcategoryId);
          const searchLower = searchTerm.toLowerCase();
          
          const matchesCategory = category?.name.toLowerCase().includes(searchLower);
          const matchesSubcategory = subcategory?.name.toLowerCase().includes(searchLower);
          
          if (!matchesCategory && !matchesSubcategory) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let comparison = 0;
        switch (sortField) {
          case 'date':
            comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            break;
          case 'amount':
            comparison = a.amount - b.amount;
            break;
          default:
            comparison = 0;
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [expenses, selectedMonth, selectedYear, statusFilter, categoryFilter, subcategoryFilter, searchTerm, sortField, sortOrder, categories, subcategories]);

  const handleClearFilters = () => {
    setStatusFilter('all');
    setCategoryFilter('all');
    setSubcategoryFilter('all');
    setSearchTerm('');
    setSortField('date');
    setSortOrder('desc');
  };

  const handleDelete = async (id: string) => {
    try {
      await removeExpense(id);
      toast.success('Despesa removida');
    } catch (error) {
      toast.error('Erro ao remover despesa');
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

  const handleEdit = (expense: any) => {
    setEditingExpense(expense);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Despesas</h1>
          <p className="text-muted-foreground">Gerencie seus gastos</p>
        </div>
        <Button 
          className="bg-primary text-primary-foreground shadow hover:bg-primary/90"
          onClick={() => {
            setEditingExpense(null);
            setIsFormOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Despesa
        </Button>
      </div>

      {/* 3. UI e Filtros (Seletor de Mês/Ano sempre visível) */}
      {/* Seletor de Mês/Ano */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handlePreviousMonth}
              className="bg-green-100 text-green-700 hover:bg-green-200 hover:text-green-800 rounded-full w-8 h-8"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <span className="text-lg font-bold min-w-[160px] text-center capitalize text-foreground">
              {months[selectedMonth].label} {selectedYear}
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleNextMonth}
              className="bg-green-100 text-green-700 hover:bg-green-200 hover:text-green-800 rounded-full w-8 h-8"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Botão Filtros e Opções */}
      {/* Botão Filtros */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => setIsFiltersOpen(!isFiltersOpen)}
        >
          <Filter className="w-4 h-4" />
          {isFiltersOpen ? 'Ocultar Filtros' : 'Filtros e Opções'}
        </Button>
      </div>

      {/* Filtros Condicionais */}
      {isFiltersOpen && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Filtros Avançados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por categoria..."
                      className="pl-9"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full sm:w-[140px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="paid">Pago</SelectItem>
                        <SelectItem value="overdue">Vencidos</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={categoryFilter} onValueChange={(v) => {
                      setCategoryFilter(v);
                      setSubcategoryFilter('all');
                    }}>
                      <SelectTrigger className="w-full sm:w-[160px]">
                        <SelectValue placeholder="Categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <span className="flex items-center gap-2">
                              <div className={cn("w-6 h-6 rounded-full flex items-center justify-center", `bg-${cat.color}/10`)}>
                                <CategoryIcon iconName={cat.icon} className={cn("w-3 h-3", `text-${cat.color}`)} />
                              </div>
                              {cat.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select 
                      value={subcategoryFilter} 
                      onValueChange={setSubcategoryFilter}
                      disabled={categoryFilter === 'all' || filteredSubcategories.length === 0}
                    >
                      <SelectTrigger className="w-full sm:w-[160px]">
                        <SelectValue placeholder="Subcategoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {filteredSubcategories.map(sub => (
                          <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">Ordenar por:</span>
                    <Select value={sortField} onValueChange={setSortField}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Vencimento</SelectItem>
                        <SelectItem value="amount">Valor</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={sortOrder} onValueChange={setSortOrder}>
                      <SelectTrigger className="w-[110px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asc">Crescente</SelectItem>
                        <SelectItem value="desc">Decrescente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    variant="ghost"
                    onClick={handleClearFilters}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Limpar Filtros
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
      )}

      {/* Card de Resumo */}
      {/* Resumo */}
      <Card className="bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20">
        <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              Total de Despesas ({months[selectedMonth].label}/{selectedYear})
            </p>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0))}
            </p>
          </div>
          <div className="text-sm text-muted-foreground bg-background/50 px-3 py-1 rounded-full border">
            {filteredExpenses.length} registro(s) encontrado(s)
          </div>
        </CardContent>
      </Card>

      {/* 4. Tabela de Despesas */}
      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead className="hidden md:table-cell">Subcategoria</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhuma despesa encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenses.map((expense) => {
                  const category = categories.find(c => c.id === expense.categoryId);
                  const subcategory = subcategories.find(s => s.id === expense.subcategoryId);
                  
                  return (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", category?.color ? `bg-${category.color}/10` : "bg-muted")}>
                            <CategoryIcon iconName={category?.icon || 'Package'} className={cn("w-4 h-4", category?.color ? `text-${category.color}` : "text-muted-foreground")} />
                          </div>
                          <span>{category?.name || 'Sem categoria'}</span>
                        </div>
                        <div className="md:hidden text-xs text-muted-foreground mt-1 pl-7">
                          {subcategory ? subcategory.name : '-'}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {subcategory ? subcategory.name : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {format(new Date(expense.dueDate), 'dd/MM/yyyy')}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => handleEdit(expense)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(expense.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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

      <ExpenseForm 
        open={isFormOpen} 
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingExpense(null);
        }}
        expense={editingExpense}
      />
    </div>
  );
}
