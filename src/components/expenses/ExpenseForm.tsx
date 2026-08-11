import { useState, useEffect } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CategoryIcon } from '@/components/CategoryIcon';
import { cn } from '@/lib/utils';
import { Expense } from '@/types/expense';
import { Loader2, Trash2, FileText, Tag, CreditCard, Repeat, Settings2 } from 'lucide-react';
import { CalculatorPopover } from '@/components/ui/calculator-popover';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { DateInputBR } from "@/components/ui/date-input-br";

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense | null;
  initialData?: Partial<Expense> | null;
}

export default function ExpenseForm({ open, onOpenChange, expense, initialData }: ExpenseFormProps) {
  const { user } = useAuth();
  const { accounts, categories, subcategories, removeExpense, refreshData } = useFinance();

  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [installments, setInstallments] = useState('1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [excludeFromCalculations, setExcludeFromCalculations] = useState(false);
  const [notes, setNotes] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  const formatToInput = (dateVal: any) => {
    if (!dateVal) return "";
    if (dateVal instanceof Date) return format(dateVal, 'yyyy-MM-dd');
    const str = String(dateVal);
    return str.includes('T') ? str.split('T')[0] : str;
  };

  const getTodayString = () => format(new Date(), 'yyyy-MM-dd');

  const formatCurrencyInput = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    if (!numericValue) return '';
    const floatValue = Number(numericValue) / 100;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(floatValue);
  };

  useEffect(() => {
    if (open) {
      const today = getTodayString();
      const dataToLoad = expense || initialData;

      if (dataToLoad) {
        setDescription(dataToLoad.description || '');
        setCategoryId(dataToLoad.categoryId || (dataToLoad as any).category_id || '');
        setSubcategoryId(dataToLoad.subcategoryId || (dataToLoad as any).subcategory_id || '');
        setDueDate(dataToLoad.dueDate ? formatToInput(dataToLoad.dueDate) : (dataToLoad as any).due_date ? formatToInput((dataToLoad as any).due_date) : today);
        setAmount(dataToLoad.amount ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dataToLoad.amount) : '');
        setAccountId(dataToLoad.accountId || (dataToLoad as any).account_id || '');
        setIsPaid(dataToLoad.isPaid || (dataToLoad as any).is_paid || false);
        setIsRecurring(dataToLoad.isRecurring || false);
        setInstallments(dataToLoad.installments?.toString() || '1');
        setExcludeFromCalculations((dataToLoad as any).exclude_from_calculations || false);
        setNotes((dataToLoad as any).notes || '');
      } else {
        setDescription('');
        setCategoryId('');
        setSubcategoryId('');
        setDueDate(today);
        setAmount('');
        setAccountId('');
        setIsPaid(false);
        setIsRecurring(false);
        setInstallments('1');
        setExcludeFromCalculations(false);
        setNotes('');
        setShowErrors(false);
      }
    }
  }, [open, expense, initialData]);

  const handleDelete = async () => {
    if (!expense) return;
    if (!confirm('Tem certeza que deseja excluir esta despesa?')) return;
    setIsSubmitting(true);
    try {
      await removeExpense(expense.id);
      toast.success('Despesa excluída!');
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Erro ao excluir: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const numericAmount = parseFloat(amount.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
    if (!description || !categoryId || !dueDate || numericAmount <= 0) {
      setShowErrors(true);
      setShakeKey(k => k + 1);
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        description,
        amount: numericAmount,
        due_date: dueDate,
        category_id: categoryId,
        subcategory_id: subcategoryId || null,
        account_id: accountId || null,
        is_paid: isPaid,
        is_recurring: isRecurring,
        installments: isRecurring ? parseInt(installments) : null,
        user_id: user?.id,
        exclude_from_calculations: excludeFromCalculations,
        notes: notes || null,
      };

      if (expense) {
        const { error } = await supabase.from('expenses').update(payload).eq('id', expense.id);
        if (error) throw error;
        toast.success('Despesa atualizada!');
      } else {
        const { error } = await supabase.from('expenses').insert([payload]);
        if (error) throw error;
        toast.success('Despesa salva!');
      }

      await refreshData();
      onOpenChange(false);
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao salvar despesa: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSubcategories = (subcategories || []).filter(s => s.categoryId === categoryId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl w-[calc(100vw-1rem)] max-h-[95vh] sm:max-h-[92vh] gap-0 overflow-hidden rounded-2xl border-0 bg-card p-0 shadow-xl">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 border-b px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="min-w-0">
            <DialogTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground truncate">
              {expense ? 'Editar Despesa' : 'Nova Despesa'}
            </DialogTitle>
            <DialogDescription className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">
              {expense ? 'Altere os dados da despesa' : 'Preencha os detalhes do seu gasto'}
            </DialogDescription>
          </div>
          {expense && (
            <Button type="button" variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 h-8 px-2 rounded-lg shrink-0" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Excluir</span>
            </Button>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto max-h-[calc(95vh-72px)] sm:max-h-[calc(92vh-80px)] bg-muted/20">
          <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
            <span className="absolute inset-y-0 left-0 w-1 bg-primary" />
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end pl-2">
              <div key={`desc-${shakeKey}`} className={cn("flex-1 space-y-1.5", showErrors && !description && "animate-shake")}>
                <Label className={cn("flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider", showErrors && !description ? "text-destructive" : "text-muted-foreground")}>
                  <FileText className="w-3 h-3" /> Descrição *
                </Label>
                <Input value={description} onChange={e => setDescription(e.target.value)} className={cn("h-11 rounded-xl border-border/60 bg-muted/30 focus:bg-card transition-colors", showErrors && !description && "border-destructive ring-1 ring-destructive/30")} placeholder="Ex: Supermercado" />
              </div>
              <div key={`amt-${shakeKey}`} className={cn("w-full sm:w-64 space-y-1.5", showErrors && (parseFloat(amount.replace(/[^\d,]/g, '').replace(',', '.')) || 0) <= 0 && "animate-shake")}>
                <Label className={cn("text-[11px] font-bold uppercase tracking-wider", showErrors && (parseFloat(amount.replace(/[^\d,]/g, '').replace(',', '.')) || 0) <= 0 ? "text-destructive" : "text-muted-foreground")}>Valor *</Label>
                <div className="flex items-center gap-1">
                  <Input value={amount} onChange={e => setAmount(formatCurrencyInput(e.target.value))} className={cn("h-11 rounded-xl border-border/60 bg-muted/30 focus:bg-card text-right text-lg font-bold transition-colors text-primary", showErrors && (parseFloat(amount.replace(/[^\d,]/g, '').replace(',', '.')) || 0) <= 0 && "border-destructive ring-1 ring-destructive/30")} placeholder="R$ 0,00" />
                  <CalculatorPopover currentValue={amount} onConfirm={(val) => setAmount(formatCurrencyInput(val))} />
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
              <span className="absolute inset-y-0 left-0 w-1 bg-primary/40" />
              <div className="flex items-center gap-2 pl-2 mb-3">
                <Tag className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Categoria & Vencimento</span>
                <div className="flex-1 h-px bg-border/60" />
              </div>
              
              <div className="space-y-3 pl-2">
                <div className="grid grid-cols-2 gap-3">
                  <div key={`cat-${shakeKey}`} className={cn("space-y-1.5", showErrors && !categoryId && "animate-shake")}>
                    <Label className={cn("text-[11px] font-bold uppercase tracking-wider", showErrors && !categoryId ? "text-destructive" : "text-muted-foreground")}>Categoria *</Label>
                    <Select value={categoryId} onValueChange={setCategoryId}>
                      <SelectTrigger className={cn("h-10 rounded-xl border-border/60 bg-muted/30", showErrors && !categoryId && "border-destructive ring-1 ring-destructive/30")}><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {(categories || []).map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            <div className="flex items-center gap-2"><CategoryIcon iconName={c.icon} className="w-4 h-4 text-primary" /> {c.name}</div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Subcategoria</Label>
                    <Select value={subcategoryId} onValueChange={setSubcategoryId} disabled={!categoryId}>
                      <SelectTrigger className="h-10 rounded-xl border-border/60 bg-muted/30"><SelectValue placeholder="Opcional" /></SelectTrigger>
                      <SelectContent>
                        {filteredSubcategories.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div key={`due-${shakeKey}`} className={cn("space-y-1.5 pt-2 border-t border-border/40", showErrors && !dueDate && "animate-shake")}>
                  <Label className={cn("text-[11px] font-bold uppercase tracking-wider", showErrors && !dueDate ? "text-destructive" : "text-muted-foreground")}>Data de Vencimento *</Label>
                  <DateInputBR value={dueDate} onChange={setDueDate} className={cn("h-10 rounded-xl border-border/60 bg-muted/30 font-medium", showErrors && !dueDate && "border-destructive ring-1 ring-destructive/30")} />
                </div>
              </div>
            </section>

            <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
              <span className="absolute inset-y-0 left-0 w-1 bg-primary/40" />
              <div className="flex items-center gap-2 pl-2 mb-3">
                <CreditCard className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Conta & Pagamento</span>
                <div className="flex-1 h-px bg-border/60" />
              </div>
              <div className="grid grid-cols-2 gap-3 pl-2">
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Conta de Saída</Label>
                  <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger className="h-10 rounded-xl border-border/60 bg-muted/30"><SelectValue placeholder="Selecione a conta (Opcional)" /></SelectTrigger>
                    <SelectContent>{(accounts || []).map(a => <SelectItem key={a.id} value={a.id}>{a.bankName}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Status</Label>
                  <button type="button" onClick={() => setIsPaid(!isPaid)} className={cn(
                    "flex items-center justify-center gap-2 w-full h-10 rounded-xl border text-sm font-semibold transition-all",
                    isPaid ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600" : "bg-muted/30 border-border/60 text-muted-foreground"
                  )}>
                    <span className={cn("w-2 h-2 rounded-full", isPaid ? "bg-emerald-500" : "bg-muted-foreground/40")} />
                    {isPaid ? 'Pago' : 'Pendente'}
                  </button>
                </div>
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
              <span className="absolute inset-y-0 left-0 w-1 bg-primary/40" />
              <div className="flex items-center gap-2 pl-2 mb-3">
                <Repeat className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Recorrência & Notas</span>
                <div className="flex-1 h-px bg-border/60" />
              </div>
              <div className="space-y-3 pl-2">
                <div className="flex items-end gap-3">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Recorrente</Label>
                    <button type="button" onClick={() => setIsRecurring(!isRecurring)} className={cn(
                      "flex items-center justify-center gap-2 h-10 w-full rounded-xl border text-sm font-semibold transition-all",
                      isRecurring ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted/30 border-border/60 text-muted-foreground"
                    )}>
                      <span className={cn("w-2 h-2 rounded-full", isRecurring ? "bg-primary" : "bg-muted-foreground/40")} />
                      {isRecurring ? 'Sim' : 'Não'}
                    </button>
                  </div>
                  {isRecurring && (
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Repetições</Label>
                      <Input type="number" min="1" value={installments} onChange={e => setInstallments(e.target.value)} className="h-10 w-24 text-center rounded-xl border-border/60 bg-muted/30" placeholder="Meses" />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 pt-1">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Observação</Label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} className="flex w-full rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-sm focus:bg-card resize-none" placeholder="Anotações opcionais..." rows={2} />
                </div>
              </div>
            </section>

            <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
              <span className="absolute inset-y-0 left-0 w-1 bg-primary/40" />
              <div className="flex items-center gap-2 pl-2 mb-3">
                <Settings2 className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Opções Avançadas</span>
                <div className="flex-1 h-px bg-border/60" />
              </div>
              <div className="space-y-3 pl-2">
                <div className="flex items-center gap-3">
                  <Switch id="visual-control-expense" checked={excludeFromCalculations} onCheckedChange={setExcludeFromCalculations} />
                  <Label htmlFor="visual-control-expense" className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                    Apenas controle visual
                  </Label>
                </div>
              </div>
            </section>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border/40">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl h-9 px-5 text-sm">Cancelar</Button>
            <Button type="submit" disabled={isSubmitting} className="rounded-xl min-w-[110px] h-9 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
