import { useState, useMemo, useEffect } from 'react';
import { useIncome } from '@/contexts/IncomeContext';
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
import { Search, Plus, Pencil, Trash2, CheckCircle2, AlertCircle, Calendar, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import IncomeForm from '@/components/income/IncomeForm';
import { Badge } from '@/components/ui/badge';

export default function Incomes() {
  const { incomes: fetchedIncomes, incomeCategories, incomeSubcategories, removeIncome, updateIncome } = useIncome();
  
  // Mock data for visualization if no real data exists
  const incomes = fetchedIncomes.length > 0 ? fetchedIncomes : [
    {
      id: 'mock-1',
      title: 'Salário Mensal',
      description: 'Adiantamento Quinzenal',
      amount: 3500.00,
      receiveDate: new Date().toISOString(),
      categoryId: 'salary',
      subcategoryId: null,
      isReceived: true,
      userId: 'mock-user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'mock-2',
      title: 'Freelance',
      description: 'Desenvolvimento Web',
      amount: 1200.00,
      receiveDate: new Date(Date.now() + 86400000 * 2).toISOString(),
      categoryId: 'freelance',
      subcategoryId: null,
      isReceived: false,
      userId: 'mock-user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ];
  
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
  const [sortField, setSortField] = useState<string>('receiveDate');
  const [sortOrder, setSortOrder] = useState<string>('asc');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<any>(null);

  // Session Timeout Logic
  useEffect(() => {
    let timeout: number;

    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        window.location.href = '/auth';
      }, 15 * 60 * 1000); // 15 minutes
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer));
    
    resetTimer();

    return () => {
      clearTimeout(timeout);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, []);

  // Filtered Subcategories
  const filteredSubcategories = useMemo(() => {
    if (categoryFilter === 'all') return [];
    return incomeSubcategories.filter(sub => sub.categoryId === categoryFilter);
  }, [categoryFilter, incomeSubcategories]);

  // Filtered & Sorted Incomes
  const filteredIncomes = useMemo(() => {
    return incomes
      .filter(income => {
        // Date Filter
        const incomeDate = new Date(income.receiveDate);
        if (incomeDate.getMonth() !== selectedMonth || incomeDate.getFullYear() !== selectedYear) return false;

        // Status
        if (statusFilter === 'received' && !income.isReceived) return false;
        if (statusFilter === 'pending' && income.isReceived) return false;

        // Category
        if (categoryFilter !== 'all' && income.categoryId !== categoryFilter) return false;

        // Subcategory
        if (subcategoryFilter !== 'all' && income.subcategoryId !== subcategoryFilter) return false;

        // Search
        const searchContent = (income.title || '').toLowerCase();
        if (searchTerm && !searchContent.includes(searchTerm.toLowerCase())) return false;

        return true;
      })
      .sort((a, b) => {
        let comparison = 0;
        switch (sortField) {
          case 'receiveDate':
            comparison = new Date(a.receiveDate).getTime() - new Date(b.receiveDate).getTime();
            break;
          case 'amount':
            comparison = a.amount - b.amount;
            break;
          case 'description':
             const titleA = a.title || '';
             const titleB = b.title || '';
            comparison = titleA.localeCompare(titleB);
            break;
          default:
            comparison = 0;
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [incomes, selectedMonth, selectedYear, statusFilter, categoryFilter, subcategoryFilter, searchTerm, sortField, sortOrder]);

  const handleClearFilters = () => {
    setStatusFilter('all');
    setCategoryFilter('all');
    setSubcategoryFilter('all');
    setSearchTerm('');
    setSortField('receiveDate');
    setSortOrder('asc');
  };

  const handleDelete = async (id: string) => {
    try {
      await removeIncome(id);
      toast.success('Receita removida');
    } catch (error) {
      toast.error('Erro ao remover receita');
    }
  };

  const handleReceive = async (id: string, currentStatus: boolean) => {
    try {
      await updateIncome(id, { isReceived: !currentStatus });
      toast.success(currentStatus ? 'Receita marcada como pendente' : 'Receita marcada como recebida');
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleEdit = (income: any) => {
    setEditingIncome(income);
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
          <h1 className="text-2xl font-bold text-foreground">Receitas</h1>
          <p className="text-muted-foreground">Gerencie seus ganhos</p>
        </div>
        <Button 
          className="bg-primary text-primary-foreground shadow hover:bg-primary/90"
          onClick={() => {
            setEditingIncome(null);
            setIsFormOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Receita
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
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="received">Recebido</SelectItem>
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
                <Select value={sortField} onValueChange={setSortField}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receiveDate">Recebimento</SelectItem>
                    <SelectItem value="amount">Valor</SelectItem>
                    <SelectItem value="description">Descrição</SelectItem>
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

      {/* Incomes Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead className="hidden md:table-cell">Categoria</TableHead>
                <TableHead>Recebimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIncomes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhuma receita encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                filteredIncomes.map((income) => {
                  const category = incomeCategories.find(c => c.id === income.categoryId);
                  const subcategory = incomeSubcategories.find(s => s.id === income.subcategoryId);
                  
                  return (
                    <TableRow key={income.id}>
                      <TableCell className="font-medium">
                        {income.title}
                        <div className="md:hidden text-xs text-muted-foreground mt-1">
                          {category?.name} {subcategory && `• ${subcategory.name}`}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex flex-col">
                          <span className="flex items-center gap-1">
                            {category?.icon} {category?.name || 'Sem categoria'}
                          </span>
                          {subcategory && (
                            <span className="text-xs text-muted-foreground ml-5">
                              ↳ {subcategory.name}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {format(new Date(income.receiveDate), 'dd/MM/yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "cursor-pointer hover:opacity-80 transition-opacity",
                            income.isReceived 
                              ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900" 
                              : "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-900"
                          )}
                          onClick={() => handleReceive(income.id, income.isReceived)}
                        >
                          {income.isReceived ? (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Recebido
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Pendente
                            </span>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-green-600 dark:text-green-400">
                        {formatCurrency(income.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="icon"
                            className="h-8 w-8 bg-transparent hover:bg-accent text-muted-foreground hover:text-foreground shadow-none"
                            onClick={() => handleEdit(income)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            className="h-8 w-8 bg-transparent hover:bg-destructive/10 text-destructive shadow-none"
                            onClick={() => handleDelete(income.id)}
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

      <IncomeForm 
        open={isFormOpen} 
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingIncome(null);
        }}
        income={editingIncome}
      />
    </div>
  );
}
