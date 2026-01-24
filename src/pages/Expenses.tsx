import { useState, useMemo } from 'react';
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
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Plus, Pencil, Trash2, CheckCircle2, AlertCircle, Calendar, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ExpenseForm from '@/components/expenses/ExpenseForm';
import { Badge } from '@/components/ui/badge';

export default function Expenses() {
  const { expenses, categories, subcategories, removeExpense, updateExpense } = useFinance();
  
  // States
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
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
  
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('dueDate');
  const [sortOrder, setSortOrder] = useState<string>('asc');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);

  // Filtered Subcategories
  const filteredSubcategories = useMemo(() => {
    if (categoryFilter === 'all') return [];
    return subcategories.filter(sub => sub.categoryId === categoryFilter);
  }, [categoryFilter, subcategories]);

  // Filtered & Sorted Expenses
  const filteredExpenses = useMemo(() => {
    return expenses
      .filter(expense => {
        // Date Filter
        const expenseDate = new Date(expense.dueDate);
        if (expenseDate.getMonth() !== selectedMonth || expenseDate.getFullYear() !== selectedYear) return false;

        // Status
        if (statusFilter === 'paid' && !expense.isPaid) return false;
        if (statusFilter === 'pending' && expense.isPaid) return false;

        // Category
        if (categoryFilter !== 'all' && expense.categoryId !== categoryFilter) return false;

        // Subcategory
        if (subcategoryFilter !== 'all' && expense.subcategoryId !== subcategoryFilter) return false;

        // Search
        if (searchTerm) {
          const category = categories.find(c => c.id === expense.categoryId);
          const subcategory = subcategories.find(s => s.id === expense.subcategoryId);
          const searchLower = searchTerm.toLowerCase();
          
          if (!category?.name.toLowerCase().includes(searchLower) && !subcategory?.name.toLowerCase().includes(searchLower)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let comparison = 0;
        switch (sortField) {
          case 'dueDate':
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
  }, [expenses, selectedMonth, selectedYear, statusFilter, categoryFilter, subcategoryFilter, searchTerm, sortField, sortOrder]);

  const handleClearFilters = () => {
    setStatusFilter('all');
    setCategoryFilter('all');
    setSubcategoryFilter('all');
    setSearchTerm('');
    setSortField('dueDate');
    setSortOrder('asc');
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
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

      {/* Filters & Sort Bar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Filter className="w-4 h-4" />
            Filtros e Ordenação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {/* Period Filter */}
            <div className="flex flex-col sm:flex-row gap-4 pb-4 border-b">
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-full sm:w-[120px]">
                  <SelectValue placeholder="Ano" />
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

            {/* Top Row: Search and Main Filters */}
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar despesa..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 lg:w-auto">
                 <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
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
                      <SelectItem key={cat.id} value={cat.id}>{cat.icon} {cat.name}</SelectItem>
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

            {/* Bottom Row: Sorting and Clear */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Ordenar por:</span>
                <Select value={sortField} onValueChange={setSortField}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dueDate">Vencimento</SelectItem>
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
                className="w-full sm:w-auto bg-transparent hover:bg-accent text-muted-foreground hover:text-foreground shadow-none"
                onClick={handleClearFilters}
              >
                <X className="w-4 h-4 mr-2" />
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Card */}
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

      {/* Expenses Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead className="hidden md:table-cell">Subcategoria</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
                          <span className="text-lg">{category?.icon || '📦'}</span>
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
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "cursor-pointer hover:opacity-80 transition-opacity",
                            expense.isPaid 
                              ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900" 
                              : "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-900"
                          )}
                          onClick={() => handlePay(expense.id, expense.isPaid)}
                        >
                          {expense.isPaid ? (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Pago
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Pendente
                            </span>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="icon"
                            className="h-8 w-8 bg-transparent hover:bg-accent text-muted-foreground hover:text-foreground shadow-none"
                            onClick={() => handleEdit(expense)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            className="h-8 w-8 bg-transparent hover:bg-destructive/10 text-destructive shadow-none"
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
