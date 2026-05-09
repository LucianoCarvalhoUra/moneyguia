CREATE TABLE public.transaction_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  type TEXT NOT NULL DEFAULT 'both' CHECK (type IN ('expense','income','both')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transaction_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own groups" ON public.transaction_groups FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own groups" ON public.transaction_groups FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own groups" ON public.transaction_groups FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own groups" ON public.transaction_groups FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_transaction_groups_updated_at
BEFORE UPDATE ON public.transaction_groups
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.expenses ADD COLUMN group_id UUID;
ALTER TABLE public.incomes ADD COLUMN group_id UUID;

CREATE INDEX idx_expenses_group_id ON public.expenses(group_id);
CREATE INDEX idx_incomes_group_id ON public.incomes(group_id);