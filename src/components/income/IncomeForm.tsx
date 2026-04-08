﻿import { useState, useEffect } from "react";
import { useForm, Controller, UseFormReturn } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useIncome } from "@/contexts/IncomeContext";
import { Income } from "@/types/income";
import { SchedulingFields } from "../SchedulingFields"; // Import the scheduling fields component

interface IncomeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  income?: Income | null;
  initialData?: Income | null;
}

interface IncomeFormData {
  title: string;
  amount: number;
  receiveDate: string; // Actual receive date
  categoryId: string;
  subcategoryId?: string;
  isReceived: boolean;
  excludeFromCalculations: boolean;
  // Recurrence fields
  is_recurring: boolean;
  recurrence_type?: "daily" | "weekly" | "monthly" | "yearly";
  start_date?: string; // The first occurrence date for recurring items
  // Scheduling fields
  is_scheduled: boolean;
  scheduled_date?: string; // The date the transaction is scheduled to appear
}

export default function IncomeForm({ open, onOpenChange, income, initialData }: IncomeFormProps) {
  const { user } = useAuth();
  const { incomeCategories, incomeSubcategories, addIncome, updateIncome, refreshData } = useIncome();
  const form = useForm<IncomeFormData>({
    defaultValues: {
      isReceived: false,
      excludeFromCalculations: false,
      is_recurring: false,
      recurrence_type: 'monthly', // Default for recurrence
      start_date: new Date().toISOString().split('T')[0], // Default to today
      is_scheduled: false,
      scheduled_date: new Date().toISOString().split('T')[0], // Default to today
    }
  });
  const { register, handleSubmit, reset, control, watch, setValue, formState: { errors } } = form;
  const [loading, setLoading] = useState(false);

  const isRecurring = watch("is_recurring");
  const isScheduled = watch("is_scheduled");
  const receiveDate = watch("receiveDate"); // Use this as baseDate for scheduling validation

  useEffect(() => {
    if (open) {
      if (income) {
        reset({
          ...income,
          receiveDate: income.receiveDate ? new Date(income.receiveDate).toISOString().split('T')[0] : '',
          // Map existing recurrence/scheduling data if available
          is_recurring: (income as any).isRecurring || false,
          recurrence_type: (income as any).recurrenceType || 'monthly',
          start_date: (income as any).scheduledDate ? new Date((income as any).scheduledDate).toISOString().split('T')[0] : (income.receiveDate ? new Date(income.receiveDate).toISOString().split('T')[0] : ''),
          is_scheduled: (income as any).isScheduled || false,
          scheduled_date: (income as any).scheduledDate ? new Date((income as any).scheduledDate).toISOString().split('T')[0] : '',
        });
      } else if (initialData) {
        reset({
          ...initialData,
          receiveDate: initialData.receiveDate ? new Date(initialData.receiveDate).toISOString().split('T')[0] : '',
          // For duplication, ensure recurrence/scheduling fields are reset or copied as needed
          is_recurring: false, // Duplicated items usually start as single
          recurrence_type: 'monthly',
          start_date: initialData.receiveDate ? new Date(initialData.receiveDate).toISOString().split('T')[0] : '',
          is_scheduled: false,
          scheduled_date: initialData.receiveDate ? new Date(initialData.receiveDate).toISOString().split('T')[0] : '',
        });
      } else {
        reset({
          title: '',
          amount: 0,
          receiveDate: new Date().toISOString().split('T')[0],
          categoryId: '',
          subcategoryId: '',
          isReceived: false,
          excludeFromCalculations: false,
          is_recurring: false,
          recurrence_type: 'monthly',
          start_date: new Date().toISOString().split('T')[0],
          is_scheduled: false,
          scheduled_date: new Date().toISOString().split('T')[0],
        });
      }
    }
  }, [open, income, initialData, reset]);

  const onSubmit = async (data: IncomeFormData) => {
    if (!user) {
      toast.error("Você precisa estar logado para salvar receitas.");
      return;
    }
    setLoading(true);
    try {
      const incomePayload: any = {
        userId: user.id,
        title: data.title,
        amount: data.amount,
        receiveDate: data.receiveDate as any, // Actual receive date
        categoryId: data.categoryId,
        subcategoryId: data.subcategoryId || null,
        isReceived: data.isReceived,
        excludeFromCalculations: data.excludeFromCalculations,
        // Recurrence fields
        isRecurring: data.is_recurring,
        recurrenceType: data.is_recurring ? data.recurrence_type : null,
        // Scheduling fields
        isScheduled: data.is_scheduled || data.is_recurring, // If recurring, it's also scheduled
        scheduledDate: null as any, // Default to null, then set based on conditions
      };

      // Determine scheduled_date logic
      if (data.is_recurring && data.start_date) {
        incomePayload.scheduledDate = data.start_date as any;
      } else if (data.is_scheduled && data.scheduled_date) {
        incomePayload.scheduledDate = data.scheduled_date as any;
      } else {
        incomePayload.scheduledDate = null as any; // Not scheduled or recurring, so no specific scheduled_date
      }

      if (income) {
        await updateIncome(income.id, incomePayload);
        toast.success("Receita atualizada com sucesso!");
      } else {
        await addIncome(incomePayload as Income); // Cast to Income as addIncome expects full Income object
        toast.success("Receita adicionada com sucesso!");
      }
      refreshData();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Erro ao salvar receita: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredSubcategories = incomeSubcategories.filter(sub => sub.categoryId === watch("categoryId"));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{income ? "Editar Receita" : "Nova Receita"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">Título</Label>
            <Input id="title" {...register("title", { required: "Título é obrigatório" })} className="col-span-3" />
            {errors.title && <p className="col-span-4 text-right text-sm text-red-600">{errors.title.message}</p>}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">Valor</Label>
            <Input id="amount" type="number" step="0.01" {...register("amount", { required: "Valor é obrigatório", valueAsNumber: true })} className="col-span-3" />
            {errors.amount && <p className="col-span-4 text-right text-sm text-red-600">{errors.amount.message}</p>}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="receiveDate" className="text-right">Data</Label>
            <Input id="receiveDate" type="date" {...register("receiveDate", { required: "Data é obrigatória" })} className="col-span-3" />
            {errors.receiveDate && <p className="col-span-4 text-right text-sm text-red-600">{errors.receiveDate.message}</p>}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="categoryId" className="text-right">Categoria</Label>
            <Controller
              name="categoryId"
              control={control}
              rules={{ required: "Categoria é obrigatória" }}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value} >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {incomeCategories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.categoryId && <p className="col-span-4 text-right text-sm text-red-600">{errors.categoryId.message}</p>}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="subcategoryId" className="text-right">Subcategoria</Label>
            <Controller
              name="subcategoryId"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value} disabled={filteredSubcategories.length === 0}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecione uma subcategoria (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSubcategories.map(sub => (
                      <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex items-center space-x-2 col-span-4 justify-end">
            <Checkbox id="isReceived" {...register("isReceived")} />
            <Label htmlFor="isReceived">Recebido</Label>
          </div>
          <div className="flex items-center space-x-2 col-span-4 justify-end">
            <Checkbox id="excludeFromCalculations" {...register("excludeFromCalculations")} />
            <Label htmlFor="excludeFromCalculations">Apenas controle visual (não contabilizar)</Label>
          </div>

          {/* Recurrence Fields */}
          <div className="space-y-4 p-4 border rounded-xl bg-slate-50/50 mt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_recurring"
                checked={isRecurring}
                onCheckedChange={(checked) => setValue("is_recurring", !!checked)}
              />
              <Label htmlFor="is_recurring">Transação Recorrente</Label>
            </div>

            {isRecurring && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200 space-y-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="recurrence_type" className="text-right">Frequência</Label>
                  <Controller
                    name="recurrence_type"
                    control={control}
                    rules={{ required: isRecurring ? "Frequência é obrigatória" : false }}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value} >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Selecione a frequência" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Diário</SelectItem>
                          <SelectItem value="weekly">Semanal</SelectItem>
                          <SelectItem value="monthly">Mensal</SelectItem>
                          <SelectItem value="yearly">Anual</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.recurrence_type && <p className="col-span-4 text-right text-sm text-red-600">{errors.recurrence_type.message}</p>}
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="start_date" className="text-right">Início da Recorrência</Label>
                  <Input id="start_date" type="date" {...register("start_date", { required: isRecurring ? "Data de início é obrigatória" : false })} className="col-span-3" />
                  {errors.start_date && <p className="col-span-4 text-right text-sm text-red-600">{errors.start_date.message}</p>}
                </div>
              </div>
            )}
          </div>

          {/* Scheduling Fields */}
          <SchedulingFields form={form} baseDateFieldName="receiveDate" />

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar Receita"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}