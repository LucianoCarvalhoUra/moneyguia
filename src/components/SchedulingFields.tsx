import { Label } from "@/components/ui/label";
import { DateInputBR } from "@/components/ui/date-input-br";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarClock } from "lucide-react";
import { UseFormReturn } from "react-hook-form";

interface SchedulingFieldsProps {
  form: UseFormReturn<any>;
  baseDateFieldName: string; // 'due_date' ou 'receive_date'
}

export function SchedulingFields({ form, baseDateFieldName }: SchedulingFieldsProps) {
  const isScheduled = form.watch("is_scheduled");
  const baseDate = form.watch(baseDateFieldName);

  return (
    <div className="space-y-4 p-4 border rounded-xl bg-slate-50/50 mt-4">
      <div className="flex items-center space-x-2">
        <Checkbox 
          id="is_scheduled" 
          checked={isScheduled}
          onCheckedChange={(checked) => form.setValue("is_scheduled", checked)}
        />
        <Label htmlFor="is_scheduled" className="flex items-center gap-2 cursor-pointer">
          <CalendarClock className="h-4 w-4 text-primary" />
          Agendar esta transação
        </Label>
      </div>

      {isScheduled && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
          <Label htmlFor="scheduled_date">Agendar para</Label>
          <DateInputBR
            id="scheduled_date"
            value={form.watch("scheduled_date") || ""}
            onChange={(iso) => form.setValue("scheduled_date", iso, { shouldValidate: true })}
          />
          {form.formState.errors.scheduled_date && (
            <p className="text-xs text-red-500 mt-1">
              {form.formState.errors.scheduled_date.message as string}
            </p>
          )}
        </div>
      )}
    </div>
  );
}