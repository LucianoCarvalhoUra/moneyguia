-- Add is_received column to incomes table
ALTER TABLE public.incomes ADD COLUMN IF NOT EXISTS is_received boolean NOT NULL DEFAULT false;

-- Create index for better performance on pending incomes
CREATE INDEX IF NOT EXISTS idx_incomes_receive_date_unreceived ON public.incomes(receive_date, is_received) WHERE is_received = false;