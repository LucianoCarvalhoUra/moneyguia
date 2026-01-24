import { useState, useMemo } from 'react';
import { useIncome } from '@/contexts/IncomeContext';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, RefreshCw, Check, Clock, Search, Filter, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Income } from '@/types/income';
import IncomeForm from '@/components/income/IncomeForm';
import IncomeCategoryChart from '@/components/dashboard/IncomeCategoryChart';
import IncomeExpenseChart from '@/components/dashboard/IncomeExpenseChart';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type SortField = 'receiveDate' | 'category' | 'subcategory' | 'amount';
type SortOrder = 'asc' | 'desc';

export default function Incomes() {
  const { 
    getMonthlyIncomes, 
    removeIncome,
    updateIncome,
    getMonthlyIncomeTotal, 
    getIncomeTotalByCategory,
    getIncomeCategoryById,
    getIncomeSubcategoryById,
    incomeCategories,
    incomeSubcategories
  } = useIncome();
  const { getMonthlyTotal, accounts } = useFinance();
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [formOpen, setFormOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [incomeToDelete, setIncomeToDelete] = useState<string | null>(null);
  
  // Filter States
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('receiveDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const incomes = getMonthlyIncomes(selectedYear, selectedMonth);
  const total = getMonthlyIncomeTotal(selectedYear, selectedMonth);
  const expenseTotal = getMonthlyTotal(selectedYear, selectedMonth);
  const incomeCategoryTotals = getIncomeTotalByCategory(selectedYear, selectedMonth);

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

  const handleEdit = (income: Income) => {
    setEditingIncome(income);
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    setIncomeToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (incomeToDelete) {
      removeIncome(incomeToDelete);
      toast.success('Receita removida com sucesso!');
    }
    setDeleteDialogOpen(false);
    setIncomeToDelete(null);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setEditingIncome(undefined);
    }
  };

  const handleToggleReceived = async (income: Income) => {
    await updateIncome(income.id, { isReceived: !income.isReceived });
    toast.success(income.isReceived ? 'Receita marcada como pendente' : 'Receita marcada como recebida');
  };

  const getAccountName = (accountId?: string) => {
    if (!accountId) return null;
    const account = accounts.find(a => a.id === accountId);
    return account ? `${account.bankName}` : null;
  };

  // Filtered Subcategories
  const filteredSubcategories = useMemo(() => {
    if (categoryFilter === 'all') return [];
    return incomeSubcategories.filter(sub => sub.categoryId === categoryFilter);
  }, [categoryFilter, incomeSubcategories]);

  // Filtered & Sorted Incomes
  const filteredIncomes = useMemo(() => {
    return incomes.filter(income => {
      // Status
      if (statusFilter === 'received' && !income.isReceived) return false;
      if (statusFilter === 'pending' && income.isReceived) return false;

      // Category
      if (categoryFilter !== 'all' && income.categoryId !== categoryFilter) return false;

      // Subcategory
      if (subcategoryFilter !== 'all' && income.subcategoryId !== subcategoryFilter) return false;

      // Search
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const titleMatch = income.title?.toLowerCase().includes(searchLower);
        const descriptionMatch = income.description?.toLowerCase().includes(searchLower);
        if (!titleMatch && !descriptionMatch) return false;
      }

      return true;
    }).sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'receiveDate':
          comparison = new Date(a.receiveDate).getTime() - new Date(b.receiveDate).getTime();
          break;
        case 'category':
          const catA = getIncomeCategoryById(a.categoryId)?.name || '';
          const catB = getIncomeCategoryById(b.categoryId)?.name || '';
          comparison = catA.localeCompare(catB);
          break;
        case 'subcategory':
          const subA = a.subcategoryId ? getIncomeSubcategoryById(a.subcategoryId)?.name || '' : '';
          const subB = b.subcategoryId ? getIncomeSubcategoryById(b.subcategoryId)?.name || '' : '';
          comparison = subA.localeCompare(subB);
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        default:
          comparison = new Date(a.receiveDate).getTime() - new Date(b.receiveDate).getTime();
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [incomes, statusFilter, categoryFilter, subcategoryFilter, searchTerm, sortField, sortOrder, getIncomeCategoryById, getIncomeSubcategoryById]);

  const handleClearFilters = () => {
    setStatusFilter('all');
    setCategoryFilter('all');
    setSubcategoryFilter('all');
    setSearchTerm('');
    setSortField('receiveDate');
    setSortOrder('asc');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Receitas</h1>
          <p className="text-muted-foreground">Gerencie seus ganhos e rendimentos</p>
        </div>
        <Button className="bg-primary text-primary-foreground shadow hover:bg-primary/90" onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Receita
        </Button>
      </div>

      {/* Month Selector */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <Button className="hover:bg-accent hover:text-accent-foreground" size="icon" onClick={handlePreviousMonth}>
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

            <Button className="hover:bg-accent hover:text-accent-foreground" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="bg-success border-0">
        <CardContent className="py-6">
          <div className="text-center text-success-foreground">
            <p className="text-sm opacity-80">Total em {months[selectedMonth]}</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(total)}</p>
            <p className="text-sm opacity-80 mt-1">{incomes.length} receita(s)</p>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <IncomeCategoryChart data={incomeCategoryTotals} total={total} />
        <IncomeExpenseChart income={total} expense={expenseTotal} />
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
            {/* Top Row: Search and Main Filters */}
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar receita..."
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
                    <SelectItem value="received">Recebido</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
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
                    {incomeCategories.map(cat => (
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
                <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receiveDate">Data</SelectItem>
                    <SelectItem value="category">Categoria</SelectItem>
                    <SelectItem value="subcategory">Subcategoria</SelectItem>
                    <SelectItem value="amount">Valor</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as SortOrder)}>
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

      {/* Income List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">Lista de Receitas</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredIncomes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p className="text-lg">Nenhuma receita encontrada</p>
              <p className="text-sm">Tente ajustar os filtros ou adicionar uma nova receita</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredIncomes.map((income) => {
                const category = getIncomeCategoryById(income.categoryId);
                const subcategory = income.subcategoryId ? getIncomeSubcategoryById(income.subcategoryId) : null;
                const accountName = getAccountName(income.accountId);
                
                return (
                  <div
                    key={income.id}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl hover:bg-muted transition-colors group",
                      income.isReceived ? "bg-muted/30 opacity-75" : "bg-muted/50"
                    )}
                  >
                    <div
                      className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center text-xl bg-success/10'
                      )}
                    >
                      {category?.icon || '💰'}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn(
                          "font-medium text-foreground truncate",
                          income.isReceived && "line-through text-muted-foreground"
                        )}>
                          {income.title || category?.name || 'Sem categoria'}
                        </p>
                        {income.isReceived ? (
                          <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs">
                            <Check className="w-3 h-3 mr-1" />
                            Recebido
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            Pendente
                          </Badge>
                        )}
                        {income.isRecurring && (
                          <RefreshCw className="w-3 h-3 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {category?.name || 'Sem categoria'}
                        {subcategory && ` → ${subcategory.name}`}
                        {accountName && ` • ${accountName}`}
                        {' • '}
                        Recebimento em {format(new Date(income.receiveDate), "dd 'de' MMMM", { locale: ptBR })}
                      </p>
                      {income.description && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          📝 {income.description}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className={cn(
                        "font-bold text-lg",
                        income.isReceived 
                          ? "text-muted-foreground" 
                          : !income.isReceived && new Date(income.receiveDate) < new Date() 
                            ? "text-destructive" 
                            : "text-success"
                      )}>
                        +{formatCurrency(income.amount)}
                      </p>
                    </div>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        className="hover:bg-accent hover:text-accent-foreground"
                        onClick={() => handleToggleReceived(income)}
                        title={income.isReceived ? "Marcar como pendente" : "Marcar como recebido"}
                      >
                        <Check className={cn("w-4 h-4", income.isReceived ? "text-success" : "text-muted-foreground")} />
                      </Button>
                      <Button
                        size="icon"
                        className="hover:bg-accent hover:text-accent-foreground"
                        onClick={() => handleEdit(income)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        className="hover:bg-accent hover:text-accent-foreground"
                        onClick={() => handleDelete(income.id)}
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
      <IncomeForm
        open={formOpen}
        onOpenChange={handleFormClose}
        income={editingIncome}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta receita? Esta ação não pode ser desfeita.
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
}             </SelectTrigger>
              <SelectContent>
                <SelectItem value="receiveDate">Data de Recebimento</SelectItem>
                <SelectItem value="category">Categoria</SelectItem>
                <SelectItem value="subcategory">Subcategoria</SelectItem>
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
          {sortedIncomes.length === 0 ? (
          {filteredIncomes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p className="text-lg">Nenhuma receita neste mês</p>
              <p className="text-sm">Clique em "Nova Receita" para começar</p>
              <p className="text-lg">Nenhuma receita encontrada</p>
              <p className="text-sm">Tente ajustar os filtros ou adicionar uma nova receita</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedIncomes.map((income) => {
              {filteredIncomes.map((income) => {
                const category = getIncomeCategoryById(income.categoryId);
                const subcategory = income.subcategoryId ? getIncomeSubcategoryById(income.subcategoryId) : null;
                const accountName = getAccountName(income.accountId);
                
                return (
                  <div
                    key={income.id}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl hover:bg-muted transition-colors group",
                      income.isReceived ? "bg-muted/30 opacity-75" : "bg-muted/50"
                    )}
                  >
                    <div
                      className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center text-xl bg-success/10'
                      )}
                    >
                      {category?.icon || '💰'}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn(
                          "font-medium text-foreground truncate",
                          income.isReceived && "line-through text-muted-foreground"
                        )}>
                          {income.title || category?.name || 'Sem categoria'}
                        </p>
                        {income.isReceived ? (
                          <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs">
                            <Check className="w-3 h-3 mr-1" />
                            Recebido
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            Pendente
                          </Badge>
                        )}
                        {income.isRecurring && (
                          <RefreshCw className="w-3 h-3 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {category?.name || 'Sem categoria'}
                        {subcategory && ` → ${subcategory.name}`}
                        {accountName && ` • ${accountName}`}
                        {' • '}
                        Recebimento em {format(new Date(income.receiveDate), "dd 'de' MMMM", { locale: ptBR })}
                      </p>
                      {income.description && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          📝 {income.description}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className={cn(
                        "font-bold text-lg",
                        income.isReceived 
                          ? "text-muted-foreground" 
                          : !income.isReceived && new Date(income.receiveDate) < new Date() 
                            ? "text-destructive" 
                            : "text-success"
                      )}>
                        +{formatCurrency(income.amount)}
                      </p>
                    </div>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        className="hover:bg-accent hover:text-accent-foreground"
                        onClick={() => handleToggleReceived(income)}
                        title={income.isReceived ? "Marcar como pendente" : "Marcar como recebido"}
                      >
                        <Check className={cn("w-4 h-4", income.isReceived ? "text-success" : "text-muted-foreground")} />
                      </Button>
                      <Button
                        size="icon"
                        className="hover:bg-accent hover:text-accent-foreground"
                        onClick={() => handleEdit(income)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        className="hover:bg-accent hover:text-accent-foreground"
                        onClick={() => handleDelete(income.id)}
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
      <IncomeForm
        open={formOpen}
        onOpenChange={handleFormClose}
        income={editingIncome}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta receita? Esta ação não pode ser desfeita.
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