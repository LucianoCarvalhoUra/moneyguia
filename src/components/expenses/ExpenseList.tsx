import { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ChevronLeft, ChevronRight, Pencil, Trash2, Copy, EyeOff } from 'lucide-react';
import { Expense } from '@/types/finance';
import ExpenseForm from './ExpenseForm';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { CategoryIcon } from '@/components/CategoryIcon';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ExpenseList() {
  const { getMonthlyExpenses, getMonthlyTotal, removeExpense, updateExpense, getCategoryById, getSubcategoryById, cards, accounts } = useFinance();

  const describeOrigin = (e: Expense) => {
    if (e.paymentMethod === 'credit_card') {
      const c = cards.find(x => x.id === e.cardId);
      return c ? `Cartão ${c.brand} •••• ${c.lastFourDigits}` : 'Cartão de Crédito';
    }
    if (e.paymentMethod === 'account') {
      const a = accounts.find(x => x.id === e.accountId);
      return a ? `Débito em conta · ${a.bankName}` : 'Débito em Conta';
    }
    if (e.paymentMethod === 'pix') {
      const a = accounts.find(x => x.id === e.accountId);
      return a ? `PIX · ${a.bankName}` : 'PIX / Dinheiro';
    }
    return '-';
  };

  const describeSettlement = (e: Expense) => {
    const m = (e as any).settlementMethod;
    if (!e.isPaid || !m) return null;
    const accId = (e as any).settlementAccountId;
    const a = accounts.find(x => x.id === accId);
    if (m === 'credit_card') {
      const c = cards.find(x => x.id === (e as any).settlementCardId);
      return c ? `Cartão ${c.brand} •••• ${c.lastFourDigits}` : 'Outro cartão de crédito';
    }
    if (m === 'account') return a ? `Débito em conta · ${a.bankName}` : 'Débito em Conta';
    if (m === 'pix') return a ? `PIX · ${a.bankName}` : 'PIX / Dinheiro';
    return null;
  };

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [initialData, setInitialData] = useState<Partial<Expense> | null>(null);

  const expenses = getMonthlyExpenses(selectedYear, selectedMonth);
  const total = getMonthlyTotal(selectedYear, selectedMonth);

  const getMonthLabel = (month: number) => format(new Date(selectedYear, month, 1), 'MMMM', { locale: ptBR });

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
              <SelectContent>{Array.from({ length: 12 }, (_, i) => <SelectItem key={i} value={i.toString()}>{getMonthLabel(i)}</SelectItem>)}</SelectContent>
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
          <p className="text-sm opacity-80">Total em {getMonthLabel(selectedMonth)}</p>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Subcategoria</TableHead>
                  <TableHead>Lançamento</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => {
                  const category = getCategoryById(expense.categoryId);
                  const subcategory = expense.subcategoryId ? getSubcategoryById(expense.subcategoryId) : null;

                  return (
                    <TableRow key={expense.id} role="button" tabIndex={0} className={cn(expense.isPaid ? "opacity-75" : "", "cursor-pointer hover:bg-muted/50 transition-colors")} onClick={(e) => { e.preventDefault(); handleEdit(expense); }} onKeyDown={(e) => { if (e.key === 'Enter') handleEdit(expense); }}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', category?.color ? `bg-${category.color}/15` : 'bg-muted/50')}>
                            <CategoryIcon iconName={category?.icon || 'Package'} className={cn("w-4 h-4", category?.color ? `text-${category.color}` : "text-muted-foreground")} />
                          </div>
                          <span className="truncate">{category?.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{subcategory?.name || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{expense.expenseDate ? new Date(expense.expenseDate).toLocaleDateString('pt-BR') : '-'}</TableCell>
                      <TableCell>{expense.dueDate ? new Date(expense.dueDate).toLocaleDateString('pt-BR') : '-'}</TableCell>
                      <TableCell className={cn("font-medium", expense.isPaid && "line-through text-muted-foreground")}>
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate">{expense.description}</span>
                            {(expense as any).excludeFromCalculations && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger><EyeOff className="w-3 h-3 text-muted-foreground" /></TooltipTrigger>
                                  <TooltipContent>Não contabilizado no saldo</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-1 text-[10px] font-normal no-underline">
                            <span className="inline-flex items-center rounded-md bg-slate-100 text-slate-700 px-1.5 py-0.5">
                              Origem: {describeOrigin(expense)}
                            </span>
                            {describeSettlement(expense) && (
                              <span className="inline-flex items-center rounded-md bg-emerald-100 text-emerald-700 px-1.5 py-0.5">
                                Quitação: {describeSettlement(expense)}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        {expense.isPaid ? 
                          <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Pago</Badge> : 
                          <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">Pendente</Badge>
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
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
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ExpenseForm open={formOpen} onOpenChange={setFormOpen} expense={editingExpense} initialData={initialData} />
    </div>
  );
}
