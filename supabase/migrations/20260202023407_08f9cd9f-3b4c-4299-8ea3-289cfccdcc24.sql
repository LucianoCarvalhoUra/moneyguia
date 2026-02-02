-- Adicionar coluna recurrence_id para vincular despesas recorrentes
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS recurrence_id uuid;

-- Adicionar coluna recurrence_id para vincular receitas recorrentes  
ALTER TABLE public.incomes ADD COLUMN IF NOT EXISTS recurrence_id uuid;

-- Criar índices para melhorar performance das queries em lote
CREATE INDEX IF NOT EXISTS idx_expenses_recurrence_id ON public.expenses(recurrence_id);
CREATE INDEX IF NOT EXISTS idx_incomes_recurrence_id ON public.incomes(recurrence_id);