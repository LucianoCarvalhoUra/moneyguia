-- Create income categories table
CREATE TABLE public.income_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '💰',
  color TEXT NOT NULL DEFAULT 'category-income',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on income_categories
ALTER TABLE public.income_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies for income_categories
CREATE POLICY "Users can view their own income categories"
ON public.income_categories
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own income categories"
ON public.income_categories
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own income categories"
ON public.income_categories
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own income categories"
ON public.income_categories
FOR DELETE
USING (auth.uid() = user_id);

-- Create incomes table
CREATE TABLE public.incomes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category_id UUID REFERENCES public.income_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  receive_date DATE NOT NULL,
  description TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on incomes
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;

-- RLS policies for incomes
CREATE POLICY "Users can view their own incomes"
ON public.incomes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own incomes"
ON public.incomes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own incomes"
ON public.incomes
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own incomes"
ON public.incomes
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at on income_categories
CREATE TRIGGER update_income_categories_updated_at
BEFORE UPDATE ON public.income_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on incomes
CREATE TRIGGER update_incomes_updated_at
BEFORE UPDATE ON public.incomes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();