import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Check, AlertTriangle } from "lucide-react";

interface RecurrenceFormData {
  type: "income" | "expense";
  description: string;
  amount: number;
  recurrence_type: "daily" | "weekly" | "monthly" | "yearly";
  start_date: string;
  only_visual: boolean;
}

export default function RecurrenceForm() {
  const { user } = useAuth();
  const { register, handleSubmit, formState: { errors }, reset, control } = useForm<RecurrenceFormData>({
    defaultValues: {
      type: "expense",
      recurrence_type: "monthly",
      only_visual: false
    }
  });
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data: RecurrenceFormData) => {
    if (!user) {
      toast.error("Você precisa estar logado para salvar recorrências.");
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        user_id: user.id,
        amount: data.amount,
        recurrence_type: data.recurrence_type,
        start_date: new Date(data.start_date).toISOString(),
        created_at: new Date().toISOString(),
        is_scheduled: true,
        scheduled_date: data.start_date,
        is_recurring: true
      };

      // If "apenas visual" is checked, just show a confirmation instead of saving
      if (data.only_visual) {
        toast.info("Recorrência configurada como 'Apenas Visual'. Nenhum dado foi salvo no banco.", {
          duration: 5000
        });
        console.log("Recurrence data (visual only):", payload);
        reset();
      } else {
        const table = data.type === "income" ? "incomes" : "expenses";
        
        // Mapeamento correto de colunas: title para incomes, description para expenses
        const insertData = data.type === "income"
          ? { ...payload, title: data.description, is_received: false }
          : { ...payload, description: data.description, is_paid: false };

        // Usando Type Assertion para contornar erro de tabela 'recurrences' inexistente
        // e salvar diretamente em incomes ou expenses conforme a lógica do banco
        const { data: dbData, error } = await (supabase.from(table) as any)
          .insert([insertData])
          .select();

        if (error) {
          throw error;
        }

        toast.success("Recorrência salva com sucesso!");
        console.log("Recurrence saved:", dbData);
        reset();
      }
    } catch (err: any) {
      toast.error("Erro ao salvar recorrência: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="type">Tipo de Transação</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Despesa</SelectItem>
                    <SelectItem value="income">Receita</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Input 
              id="description" 
              type="text" 
              placeholder="Ex: Aluguel, Salário, Conta de Luz"
              {...register("description", { required: "Campo obrigatório" })}
            />
            {errors.description && <p className="text-sm text-red-600">{errors.description.message}</p>}
          </div>

          <div>
            <Label htmlFor="amount">Valor (R$)</Label>
            <Input 
              id="amount" 
              type="number" 
              step="0.01"
              placeholder="0.00"
              {...register("amount", { 
                required: "Campo obrigatório",
                min: { value: 0, message: "Valor deve ser positivo" }
              })}
            />
            {errors.amount && <p className="text-sm text-red-600">{errors.amount.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="recurrence_type">Tipo de Recorrência</Label>
            <Controller
              name="recurrence_type"
              control={control}
              render={({ field }) => (
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value}
                >
                  <SelectTrigger id="recurrence_type">
                    <SelectValue placeholder="Selecione o tipo" />
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
          </div>

          <div>
            <Label htmlFor="start_date">Data de Início</Label>
            <Input 
              id="start_date" 
              type="date"
              {...register("start_date", { required: "Campo obrigatório" })}
            />
            {errors.start_date && <p className="text-sm text-red-600">{errors.start_date.message}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input 
            type="checkbox" 
            id="only_visual" 
            {...register("only_visual")}
            className="form-checkbox rounded text-primary border-gray-300 focus:ring-primary focus:ring-2"
          />
          <Label htmlFor="only_visual" className="text-sm text-muted-foreground">
            <Check className="w-4 h-4 mr-1" />
            Apenas Visual
          </Label>
          <span className="text-xs text-muted-foreground">
            (Não será salvo no banco de dados)
          </span>
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Salvando..." : "Salvar Recorrência"}
        </Button>
      </form>
    </div>
  );
}