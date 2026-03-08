ALTER TABLE public.incomes ADD COLUMN IF NOT EXISTS installments integer DEFAULT NULL;
ALTER TABLE public.incomes ADD COLUMN IF NOT EXISTS current_installment integer DEFAULT NULL;