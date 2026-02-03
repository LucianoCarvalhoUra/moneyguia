import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useIncome } from '@/contexts/IncomeContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
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
import { format, isBefore, startOfDay } from 'date-fns';
import { Search, Plus, Pencil, Trash2, Calendar, Filter, X, ChevronLeft, ChevronRight, History, CalendarClock, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import IncomeForm from '@/components/income/IncomeForm';
import { CategoryIcon } from '@/components/CategoryIcon';
import { Income } from '@/types/income';
import { Badge } from '@/components/ui/badge';

export default function Incomes() {
  const location = useLocation();
  const { incomes, incomeCategories, incomeSubcategories, removeIncome, updateIncome, refreshData } = useIncome();
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('receiveDate');
  const [sortOrder, setSortOrder] = useState<string>('asc');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [incomeToDelete, setIncomeToDelete] = useState<Income | null>(null);

  const months = [
    { value: 0, label: 'Janeiro' }, { value: 1, label: 'Fevereiro' }, { value: 2, label: 'Março' },
    { value: 3, label: 'Abril' }, { value: 4, label: 'Maio' }, { value: 5, label: 'Junho' },
    { value: 6, label: 'Julho' }, { value: 7, label: 'Agosto' }, { value: 8, label: 'Setembro' },
    { value: 9, label: 'Outubro' }, { value: 10, label: 'Novembro' }, { value: 11, label: 'Dezembro' },
  ];
  
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

  useEffect(() => {
    if (location.state?.filter === 'pending') {
      setStatusFilter('pending');
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const filteredSubcategories = useMemo(() => {
    if (categoryFilter === 'all') return [];
    return incomeSubcategories.filter(sub => sub.categoryId === categoryFilter);
  }, [categoryFilter, incomeSubcategories]);

  const filteredIncomes = useMemo(() => {
    return incomes
      .filter(income => {
        const incomeDate = new Date(income.receiveDate);
        if (incomeDate.getMonth() !== selectedMonth || incomeDate.getFullYear() !== selectedYear) return false;
        if (statusFilter === 'received' && !income.isReceived) return false;
        if (statusFilter === 'pending' && income.isReceived) return false;
        if (categoryFilter !== 'all' && income.categoryId !== categoryFilter) return false;
        if (subcategoryFilter !== 'all' && income.subcategoryId !== subcategoryFilter) return false;
        if (searchTerm && !income.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => {
        const valA = sortField === 'receiveDate' ? new Date(a.receiveDate).getTime() : a.amount;
        const valB = sortField === 'receiveDate' ? new Date(b.receiveDate).getTime() : b.amount;
        return sortOrder === 'asc' ? valA - valB : valB - valA;
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

  const handleDelete = (income: Income) => {
    if (income.recurrenceId) {
      setIncomeToDelete(income);
      setDeleteDialogOpen(true);
    } else {
      if (confirm('Tem certeza que deseja remover esta receita?')) {
        removeIncome(income.id).then(() => toast.success('Receita removida.'));
      }
    }
  };
  
  const handleConfirmDelete = async (scope: 'single' | 'future' | 'past' | 'all') => {
    if (!incomeToDelete) return;

    try {
      let query;
      const { recurrenceId, id, receiveDate } = incomeToDelete;
      
      if (scope === 'single') {
        query = supabase.from('incomes').delete().eq('id', id);
      } else if (scope === 'future') {
        query = supabase.from('incomes').delete().eq('recurrence_id', recurrenceId).gte('receive_date', format(new Date(receiveDate), 'yyyy-MM-dd'));
      } else if (scope === 'past') {
        query = supabase.from('incomes').delete().eq('recurrence_id', recurrenceId).lte('receive_date', format(new Date(receiveDate), 'yyyy-MM-dd'));
      } else { // 'all'
        query = supabase.from('incomes').delete().eq('recurrence_id', recurrenceId);
      }
      
      const { error } = await query;
      if (error) throw error;

      toast.success('Receita(s) removida(s) com sucesso!');
      await refreshData();
    } catch (error: any) {
      toast.error(`Erro ao remover receita(s): ${error.message}`);
    } finally {
      setDeleteDialogOpen(false);
      setIncomeToDelete(null);
    }
  };

  const handleEdit = (income: Income) => {
    setEditingIncome(income);
    setIsFormOpen(true);
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Receitas</h1>
          <p className="text-muted-foreground">Gerencie seus ganhos</p>
        </div>
        <Button className="bg-primary text-primary-foreground shadow hover:bg-primary/90" onClick={() => { setEditingIncome(null); setIsFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Nova Receita
        </Button>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-center gap-4">
            <Button variant="ghost" size="icon" onClick={handlePreviousMonth} className="bg-green-100 text-green-700 hover:bg-green-200 hover:text-green-800 rounded-full w-8 h-8">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <span className="text-lg font-bold min-w-[160px] text-center capitalize text-foreground">
              {months[selectedMonth].label} {selectedYear}
            </span>
            <Button variant="ghost" size="icon" onClick={handleNextMonth} className="bg-green-100 text-green-700 hover:bg-green-200 hover:text-green-800 rounded-full w-8 h-8">
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
                    <SelectItem value="received">Recebidos</SelectItem>
                    <SelectItem value="pending">Pendentes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {incomeCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
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

      <Card className="bg-green-50/50 dark:bg-green-900/10 border-green-100 dark:border-green-900/20">
        <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total de Receitas ({months[selectedMonth].label}/{selectedYear})</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{formatCurrency(filteredIncomes.reduce((acc, curr) => acc + curr.amount, 0))}</p>
          </div>
          <div className="text-sm text-muted-foreground bg-background/50 px-3 py-1 rounded-full border">{filteredIncomes.length} registro(s) encontrado(s)</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead className="hidden md:table-cell">Subcategoria</TableHead>
                <TableHead>Recebimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIncomes.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma receita encontrada.</TableCell></TableRow>
              ) : (
                filteredIncomes.map((income) => {
                  const category = incomeCategories.find(c => c.id === income.categoryId);
                  const subcategory = incomeSubcategories.find(s => s.id === income.subcategoryId);
                  
                  const receiveDate = new Date(income.receiveDate);
                  const isOverdue = !income.isReceived && isBefore(startOfDay(receiveDate), startOfDay(new Date()));
                  const isReceived = income.isReceived;
                  
                  return (
                    <TableRow key={income.id}>
                      <TableCell className="font-medium">
                         <div className="flex items-center gap-2">
                          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", category?.color ? `bg-${category.color}/10` : "bg-muted")}><CategoryIcon iconName={category?.icon || 'Wallet'} className={cn("w-4 h-4", category?.color ? `text-${category.color}` : "text-muted-foreground")} /></div>
                          <span>{category?.name || 'Sem categoria'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{subcategory?.name || '-'}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className={cn("flex items-center gap-2", isOverdue ? "text-destructive font-bold" : "text-muted-foreground")}>
                            <Calendar className="w-4 h-4" />
                            {format(receiveDate, 'dd/MM/yyyy')}
                          </div>
                          {isOverdue && <Badge variant="destructive" className="w-fit text-[10px] h-5 px-1.5">Atrasado</Badge>}
                          {isReceived && <Badge variant="outline" className="w-fit text-[10px] h-5 px-1.5 bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">Recebido</Badge>}
                          {!isReceived && !isOverdue && <Badge variant="outline" className="w-fit text-[10px] h-5 px-1.5 bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800">Pendente</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className={cn("font-medium", isReceived ? "text-green-600 dark:text-green-400" : "")}>
                        {formatCurrency(income.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEdit(income)}><Pencil className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(income)}><Trash2 className="w-4 h-4" /></Button>
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

      <IncomeForm open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) setEditingIncome(null); }} income={editingIncome} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Transação Recorrente</AlertDialogTitle>
            <AlertDialogDescription>Esta receita faz parte de uma série. Como você gostaria de excluí-la?</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2 py-4">
             <Button variant="outline" className="justify-start h-auto py-3 px-4" onClick={() => handleConfirmDelete('single')}>
                <div className="p-2 bg-muted rounded-full"><Calendar className="w-4 h-4" /></div>
                <div className="text-left"><p className="font-medium">Apenas esta</p><p className="text-xs text-muted-foreground">Exclui somente este registro</p></div>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3 px-4" onClick={() => handleConfirmDelete('future')}>
                <div className="p-2 bg-muted rounded-full"><CalendarClock className="w-4 h-4" /></div>
                <div className="text-left"><p className="font-medium">Esta e futuras</p><p className="text-xs text-muted-foreground">Exclui este e todos os próximos</p></div>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3 px-4" onClick={() => handleConfirmDelete('past')}>
                <div className="p-2 bg-muted rounded-full"><History className="w-4 h-4" /></div>
                <div className="text-left"><p className="font-medium">Esta e Passadas</p><p className="text-xs text-muted-foreground">Exclui este e todos os anteriores</p></div>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3 px-4" onClick={() => handleConfirmDelete('all')}>
                <div className="p-2 bg-muted rounded-full"><CalendarDays className="w-4 h-4" /></div>
                <div className="text-left"><p className="font-medium">Todas</p><p className="text-xs text-muted-foreground">Exclui toda a série histórica</p></div>
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
