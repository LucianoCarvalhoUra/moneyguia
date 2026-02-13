import { useState, useEffect } from 'react';
import { useIncome } from '@/contexts/IncomeContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CategoryIcon } from '@/components/CategoryIcon';
import { cn } from '@/lib/utils';
import { Income } from '@/types/income';
import { Loader2, Trash2, Calendar, CalendarClock, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface IncomeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  income?: Income | null;
  initialData?: Partial<Income> | null;
}

export default function IncomeForm({ open, onOpenChange, income, initialData }: IncomeFormProps) {
  const { refreshData, incomeCategories, incomeSubcategories, removeIncome, addIncome, updateIncome } = useIncome();
  
  // --- State ---
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [receiveDate, setReceiveDate] = useState('');
  const [amount, setAmount] = useState('');
  const [isReceived, setIsReceived] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scopeDialogOpen, setScopeDialogOpen] = useState(false);
  const [pendingData, setPendingData] = useState<any>(null);

  // --- Helpers ---
  const formatToInput = (dateVal: any) => {
    if (!dateVal) return "";
    if (dateVal instanceof Date) return format(dateVal, 'yyyy-MM-dd');
    const str = String(dateVal);
    return str.includes('T') ? str.split('T')[0] : str;
  };

  const safeSubcategories = incomeSubcategories || [];

  const getTodayString = () => {
    const now = new Date();
    return format(now, 'yyyy-MM-dd');
  };

  const formatCurrencyInput = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    if (!numericValue) return '';
    const floatValue = Number(numericValue) / 100;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(floatValue);
  };

  // --- Initialization ---
  useEffect(() => {
    if (open) {
      const today = getTodayString();
      const dataToLoad = income || initialData;
      
      if (dataToLoad) {
        setDescription(dataToLoad.title || '');
        
        const catId = dataToLoad.categoryId || (dataToLoad as any).category_id || '';
        setCategoryId(catId);
        setSubcategoryId(dataToLoad.subcategoryId || (dataToLoad as any).subcategory_id || '');
        
        setReceiveDate(dataToLoad.receiveDate ? formatToInput(dataToLoad.receiveDate) : today);
        setAmount(dataToLoad.amount ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dataToLoad.amount) : '');
        setIsReceived(dataToLoad.isReceived || false);
        setIsRecurring(dataToLoad.isRecurring || false);
      } else {
        // Reset
        setDescription('');
        setCategoryId('');
        setSubcategoryId('');
        setReceiveDate(today);
        setAmount('');
        setIsReceived(false);
        setIsRecurring(false);
      }
    }
  }, [open, income, initialData]);

  const handleDelete = async () => {
    if (!income) return;
    if (!confirm('Tem certeza que deseja excluir esta receita?')) return;
    
    setIsSubmitting(true);
    try {
      await removeIncome(income.id);
      toast.success('Receita excluída!');
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Erro ao excluir: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecurrenceUpdate = async (scope: 'single' | 'future' | 'all') => {
    if (!income || !pendingData) return;
    
    setIsSubmitting(true);
    try {
      // 1. Atualiza a receita atual
      const { error: singleError } = await supabase.from('incomes').update(pendingData).eq('id', income.id);
      if (singleError) throw singleError;

      if (scope !== 'single') {
        const recurrenceId = income.recurrenceId || (income as any).recurrence_id;
        
        if (!recurrenceId) {
          toast.error("Não foi possível identificar a série de recorrência.");
          setIsSubmitting(false);
          return;
        }
        
        // Remove date fields from batch to preserve individual dates
        const { receive_date, ...batchData } = pendingData;
        let query = supabase.from('incomes').update(batchData).eq('recurrence_id', recurrenceId).neq('id', income.id);

        if (scope === 'future') {
          const anchorDate = pendingData.receive_date;
          query = query.gte('receive_date', anchorDate);
        }

        const { error } = await query;
        if (error) throw error;
      }

      toast.success('Receitas atualizadas com sucesso!');
      await new Promise(resolve => setTimeout(resolve, 300));
      await refreshData();
      onOpenChange(false);
    } catch (error: any) {
      console.error('[BatchUpdate] Error:', error);
      toast.error('Erro ao atualizar: ' + error.message);
    } finally {
      setIsSubmitting(false);
      setScopeDialogOpen(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const numericAmount = parseFloat(amount.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
    if (!description || !categoryId || !receiveDate || numericAmount <= 0) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: description,
        amount: numericAmount,
        receive_date: receiveDate,
        category_id: categoryId,
        subcategory_id: subcategoryId || null,
        is_received: isReceived,
        is_recurring: isRecurring,
      };

      if (income) {
        if (income.isRecurring) {
          setPendingData(payload);
          setScopeDialogOpen(true);
          setIsSubmitting(false);
          return;
        }

        await updateIncome(income.id, {
          title: description,
          amount: numericAmount,
          receiveDate: new Date(receiveDate),
          categoryId,
          subcategoryId: subcategoryId || undefined,
          isReceived,
          isRecurring
        });
        toast.success('Receita atualizada!');
      } else {
        await addIncome({
          title: description,
          amount: numericAmount,
          receiveDate: new Date(receiveDate),
          categoryId,
          subcategoryId: subcategoryId || undefined,
          isReceived,
          isRecurring
        });
        toast.success('Receita salva!');
      }

      await refreshData();
      onOpenChange(false);
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSubcategories = safeSubcategories.filter(s => s.categoryId === categoryId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden rounded-sm border-2">
        <DialogHeader className="px-6 py-3 border-b bg-muted/10 flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-lg font-semibold">
            {income ? 'Editar Receita' : 'Nova Receita'}
          </DialogTitle>
          {income && (
            <Button 
              type="button" 
              variant="ghost" 
              size="sm"
              className="text-destructive hover:bg-destructive/10 h-8 px-2 rounded-sm" 
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Excluir
            </Button>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-5 grid grid-cols-2 gap-x-4 gap-y-4">
          
          <div className="col-span-2 space-y-1">
            <Label>Descrição</Label>
            <Input 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              className="h-9 rounded-sm" 
              placeholder="Ex: Salário Mensal"
            />
          </div>

          <div className="space-y-1">
            <Label>Categoria</Label>
            <Select value={categoryId} onValueChange={v => { setCategoryId(v); setSubcategoryId(''); }}>
              <SelectTrigger className="h-9 rounded-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {incomeCategories.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    <div className="flex items-center gap-2"><CategoryIcon iconName={c.icon} className={`w-4 h-4 text-${c.color}`} /> {c.name}</div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Subcategoria</Label>
            <Select value={subcategoryId} onValueChange={setSubcategoryId} disabled={!categoryId}>
              <SelectTrigger className="h-9 rounded-sm"><SelectValue placeholder="Opcional" /></SelectTrigger>
              <SelectContent>
                {filteredSubcategories.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Data</Label>
            <Input type="date" value={receiveDate} onChange={e => setReceiveDate(e.target.value)} className="h-9 rounded-sm" />
          </div>
          <div className="space-y-1">
            <Label>Valor</Label>
            <Input value={amount} onChange={e => setAmount(formatCurrencyInput(e.target.value))} className="h-9 rounded-sm text-right font-medium" placeholder="R$ 0,00" />
          </div>

          <div className="space-y-1">
            <Label>Status</Label>
            <div className="flex items-center gap-2 border rounded-sm px-2 h-9 bg-muted/10">
              <Switch checked={isReceived} onCheckedChange={setIsReceived} />
              <span className={cn("text-sm font-medium", isReceived ? "text-green-600" : "text-muted-foreground")}>{isReceived ? 'RECEBIDO' : 'PENDENTE'}</span>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Recorrência</Label>
            <div className="flex items-center gap-2 border rounded-sm px-2 h-9 bg-muted/10">
              <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
              <span className="text-sm text-muted-foreground flex-1">Repetir?</span>
            </div>
          </div>

          <DialogFooter className="col-span-2 pt-4 border-t mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-sm h-9">Cancelar</Button>
            <Button type="submit" disabled={isSubmitting} className="rounded-sm min-w-[100px] h-9">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>

        <AlertDialog open={scopeDialogOpen} onOpenChange={setScopeDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Atualizar Recorrência</AlertDialogTitle>
              <AlertDialogDescription>
                Esta é uma receita recorrente. Como deseja aplicar as alterações?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex flex-col gap-2 py-4">
              <Button variant="outline" className="justify-start h-auto py-3 px-4" onClick={() => handleRecurrenceUpdate('single')}>
                <Calendar className="w-4 h-4 mr-3 text-muted-foreground" />
                <div className="text-left">
                  <div className="font-medium">Apenas esta</div>
                  <div className="text-xs text-muted-foreground">Alterar somente a receita atual</div>
                </div>
              </Button>
              <Button variant="outline" className="justify-start h-auto py-3 px-4" onClick={() => handleRecurrenceUpdate('future')}>
                <CalendarClock className="w-4 h-4 mr-3 text-muted-foreground" />
                <div className="text-left">
                  <div className="font-medium">Esta e próximas</div>
                  <div className="text-xs text-muted-foreground">Alterar desta data em diante</div>
                </div>
              </Button>
              <Button variant="outline" className="justify-start h-auto py-3 px-4" onClick={() => handleRecurrenceUpdate('all')}>
                <CalendarDays className="w-4 h-4 mr-3 text-muted-foreground" />
                <div className="text-left">
                  <div className="font-medium">Todas</div>
                  <div className="text-xs text-muted-foreground">Alterar toda a série</div>
                </div>
              </Button>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}