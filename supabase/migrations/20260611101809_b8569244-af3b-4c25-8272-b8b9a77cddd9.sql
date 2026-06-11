ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS settlement_method payment_method,
  ADD COLUMN IF NOT EXISTS settlement_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL;