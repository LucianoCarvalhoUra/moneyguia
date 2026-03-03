import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useIncome } from '@/contexts/IncomeContext';
import { useAuth } from '@/contexts/AuthContext';
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
  AlertDialogAction,
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
import { ptBR } from 'date-fns/locale';
import { Search, Plus, Pencil, Trash2, Calendar, Filter, X, ChevronLeft, ChevronRight, History, CalendarClock, CalendarDays, Check, Copy, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import IncomeForm from '@/components/income/IncomeForm';
import { CategoryIcon } from '@/components/CategoryIcon';
import { Income } from '@/types/income';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function Incomes() {
  const location = useLocation();
  const { user } = useAuth();
  const { incomes, incomeCategories, incomeSubcategories, removeIncome, updateIncome, refreshData } = useIncome();
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>('all');
  const [visualFilter, setVisualFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('receiveDate');
  const [sortOrder, setSortOrder] = useState<string>('asc');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [duplicatingIncome, setDuplicatingIncome] = useState<Income | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [incomeToDelete, setIncomeToDelete] = useState<Income | null>(null);
  const [selectedDeleteScope, setSelectedDeleteScope] = useState<'single' | 'future' | 'past' | 'all'>('single');

  const getMonthLabel = (monthIndex: number) => {
    const label = format(new Date(selectedYear, monthIndex, 1), 'MMMM', { locale: ptBR });
    return label.charAt(0).toUpperCase() + label.slice(1);
  };
  
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

  useEffect(() => {
    if (location.state?.filter === 'pending') {
      setStatusFilter('pending');
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`incomes-list-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'incomes',
          filter: `user_id=eq.${user.id}`,
        },
        async () => {
          await refreshData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refreshData]);

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
        if (visualFilter === 'visual' && !income.excludeFromCalculations) return false;
        if (visualFilter === 'counted' && income.excludeFromCalculations) return false;
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
  }, [incomes, selectedMonth, selectedYear, statusFilter, visualFilter, categoryFilter, subcategoryFilter, searchTerm, sortField, sortOrder]);

  const handleClearFilters = () => {
    setStatusFilter('all');
    setVisualFilter('all');
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
    setIncomeToDelete(income);
    setSelectedDeleteScope('single');
    setDeleteDialogOpen(true);
  };
  
  const handleConfirmDelete = async () => {
    if (!incomeToDelete) return;

    try {
      let query;
      const { recurrenceId, id, receiveDate } = incomeToDelete;
      
      if (selectedDeleteScope === 'single' || !recurrenceId) {
        query = supabase.from('incomes').delete().eq('id', id);
      } else if (selectedDeleteScope === 'future') {
        query = supabase.from('incomes').delete().eq('recurrence_id', recurrenceId).gte('receive_date', format(new Date(receiveDate), 'yyyy-MM-dd'));
      } else if (selectedDeleteScope === 'past') {
        query = supabase.from('incomes').delete().eq('recurrence_id', recurrenceId).lte('receive_date', format(new Date(receiveDate), 'yyyy-MM-dd'));
      } else { // 'all'
        query = supabase.from('incomes').delete().eq('recurrence_id', recurrenceId);
      }
      
      const { error } = await query;
      if (error) throw error;

      await refreshData();
      toast.success('Receita(s) removida(s) e sincronizada(s) com o banco.');
      setDeleteDialogOpen(false); // Ensure dialog closes immediately
      setIncomeToDelete(null);
      setSelectedDeleteScope('single');
    } catch (error: any) {
      toast.error(`Erro ao remover receita(s): ${error.message}`);
    }
  };

  const handleEdit = (income: Income) => {
    setEditingIncome(income);
    setIsFormOpen(true);
  };


  const handleDuplicate = (income: Income) => {
    setDuplicatingIncome({
      ...income,
      title: `${income.title} (Cópia)`,
      receiveDate: new Date().toISOString() as unknown as Date, // Define para hoje por conveniência
      isReceived: false,
    });
    setIsFormOpen(true);
  };


  const handleToggleReceived = async (id: string, currentStatus: boolean) => {
    try {
      await updateIncome(id, { isReceived: !currentStatus });
      await refreshData();
      toast.success(currentStatus ? 'Receita marcada como pendente e sincronizada.' : 'Recebimento confirmado e sincronizado.');
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Receitas</h1>
          <p className="text-muted-foreground">Gerencie seus ganhos</p>
        </div>
        <Button className="bg-primary text-primary-foreground shadow hover:bg-primary/90" onClick={() => { setEditingIncome(null); setDuplicatingIncome(null); setIsFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Nova Receita
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
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                <Label>Controle visual</Label>
                <Select value={visualFilter} onValueChange={setVisualFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="counted">Somente contabilizados</SelectItem>
                    <SelectItem value="visual">Apenas controle visual</SelectItem>
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
            <p className="text-sm font-medium text-muted-foreground">Total de Receitas ({getMonthLabel(selectedMonth)}/{selectedYear})</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{formatCurrency(filteredIncomes.filter(i => !i.excludeFromCalculations).reduce((acc, curr) => acc + curr.amount, 0))}</p>
          </div>
          <div className="text-sm text-muted-foreground bg-background/50 px-3 py-1 rounded-md border">{filteredIncomes.length} registro(s) encontrado(s)</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead className="text-center">Status</TableHead>
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
                          {income.excludeFromCalculations && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>Não contabilizado no saldo</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          <div className={cn("w-8 h-8 rounded-md flex items-center justify-center", category?.color ? `bg-${category.color}/10` : "bg-muted")}><CategoryIcon iconName={category?.icon || 'Wallet'} className={cn("w-4 h-4", category?.color ? `text-${category.color}` : "text-muted-foreground")} /></div>
                          <span>{category?.name || 'Sem categoria'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={cn("flex items-center gap-2", isOverdue ? "text-destructive font-bold" : "text-muted-foreground")}>
                          {format(receiveDate, 'dd/MM/yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{income.title}</span>
                          {subcategory && <span className="text-xs text-muted-foreground">{subcategory.name}</span>}
                        </div>
                      </TableCell>
                      <TableCell className={cn("font-medium", isReceived ? "text-green-600 dark:text-green-400" : "")}>{formatCurrency(income.amount)}</TableCell>
                      <TableCell className="text-center">
                        {isReceived && <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">Recebido</Badge>}
                        {!isReceived && isOverdue && <Badge variant="destructive">Atrasado</Badge>}
                        {!isReceived && !isOverdue && <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800">Pendente</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className={cn("h-8 w-8", income.isReceived ? "text-green-600 hover:text-green-700" : "text-muted-foreground hover:text-green-600")}
                            onClick={() => handleToggleReceived(income.id, income.isReceived)}
                            title={income.isReceived ? "Marcar como pendente" : "Confirmar recebimento"}
                          ><Check className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDuplicate(income)} title="Duplicar"><Copy className="w-4 h-4" /></Button>
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

      <IncomeForm open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) { setEditingIncome(null); setDuplicatingIncome(null); } }} income={editingIncome} initialData={duplicatingIncome} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Receita</AlertDialogTitle>
            <AlertDialogDescription>
              {incomeToDelete?.recurrenceId 
                ? "Esta receita é recorrente. Como você gostaria de excluí-la?"
                : "Tem certeza que deseja excluir esta receita?"
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          {incomeToDelete?.recurrenceId && (
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


