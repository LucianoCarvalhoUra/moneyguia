import { useState, useMemo } from 'react';
import { useIncome } from '@/contexts/IncomeContext';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, RefreshCw, ArrowUpDown } from 'lucide-react';
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
    getMonthlyIncomeTotal, 
    getIncomeTotalByCategory,
    getIncomeCategoryById,
    getIncomeSubcategoryById 
  } = useIncome();
  const { getMonthlyTotal, accounts } = useFinance();
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [formOpen, setFormOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [incomeToDelete, setIncomeToDelete] = useState<string | null>(null);
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

  const getAccountName = (accountId?: string) => {
    if (!accountId) return null;
    const account = accounts.find(a => a.id === accountId);
    return account ? `${account.bankName}` : null;
  };

  const sortedIncomes = useMemo(() => {
    return [...incomes].sort((a, b) => {
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
  }, [incomes, sortField, sortOrder, getIncomeCategoryById, getIncomeSubcategoryById]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Receitas</h1>
          <p className="text-muted-foreground">Gerencie seus ganhos e rendimentos</p>
        </div>
        <Button variant="hero" onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Receita
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

      {/* Income List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">Lista de Receitas</CardTitle>
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
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
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p className="text-lg">Nenhuma receita neste mês</p>
              <p className="text-sm">Clique em "Nova Receita" para começar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedIncomes.map((income) => {
                const category = getIncomeCategoryById(income.categoryId);
                const subcategory = income.subcategoryId ? getIncomeSubcategoryById(income.subcategoryId) : null;
                const accountName = getAccountName(income.accountId);
                
                return (
                  <div
                    key={income.id}
                    className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
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
                        <p className="font-medium text-foreground truncate">
                          {income.title || category?.name || 'Sem categoria'}
                        </p>
                        {income.isRecurring && (
                          <RefreshCw className="w-3 h-3 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {category?.name || 'Sem categoria'}
                        {subcategory && ` → ${subcategory.name}`}
                        {accountName && ` • ${accountName}`}
                        {' • '}
                        Recebido em {format(new Date(income.receiveDate), "dd 'de' MMMM", { locale: ptBR })}
                      </p>
                      {income.description && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          📝 {income.description}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-success text-lg">
                        +{formatCurrency(income.amount)}
                      </p>
                    </div>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(income)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
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