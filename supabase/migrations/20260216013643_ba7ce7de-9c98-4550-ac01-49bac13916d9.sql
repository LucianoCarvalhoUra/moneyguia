
-- Create enum for plan types
CREATE TYPE public.plan_type AS ENUM ('free', 'pro', 'premium');

-- Create subscription plans table (admin-managed)
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan_type public.plan_type NOT NULL UNIQUE,
  price_monthly NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_yearly NUMERIC(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  max_expenses_per_month INT,
  max_incomes_per_month INT,
  max_categories INT,
  max_credit_cards INT,
  max_bank_accounts INT,
  has_ai_classification BOOLEAN NOT NULL DEFAULT false,
  has_advanced_reports BOOLEAN NOT NULL DEFAULT false,
  has_export BOOLEAN NOT NULL DEFAULT false,
  has_goals BOOLEAN NOT NULL DEFAULT false,
  has_notifications BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user subscriptions table
CREATE TABLE public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired', 'trial')),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Plans are readable by everyone (public pricing)
CREATE POLICY "Plans are viewable by everyone"
ON public.subscription_plans FOR SELECT
USING (true);

-- Only admins can manage plans
CREATE POLICY "Admins can manage plans"
ON public.subscription_plans FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Users can view their own subscription
CREATE POLICY "Users can view own subscription"
ON public.user_subscriptions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own subscription
CREATE POLICY "Users can create own subscription"
ON public.user_subscriptions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own subscription
CREATE POLICY "Users can update own subscription"
ON public.user_subscriptions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default plans
INSERT INTO public.subscription_plans (name, plan_type, price_monthly, price_yearly, description, max_expenses_per_month, max_incomes_per_month, max_categories, max_credit_cards, max_bank_accounts, has_ai_classification, has_advanced_reports, has_export, has_goals, has_notifications, features) VALUES
('Plano Gratuito', 'free', 0, 0, 'Para quem está começando a organizar suas finanças.', 30, 10, 5, 1, 1, false, false, false, false, true,
  '["Controle manual de receitas e despesas", "Até 30 despesas por mês", "Até 10 receitas por mês", "5 categorias", "1 conta bancária", "1 cartão de crédito", "Alertas de vencimento"]'::jsonb),
('Plano Pro', 'pro', 29.90, 239.90, 'Para quem quer acelerar a organização financeira.', NULL, NULL, 20, 5, 5, true, true, false, true, true,
  '["Tudo do Plano Gratuito", "Despesas e receitas ilimitadas", "Até 20 categorias", "5 contas bancárias", "5 cartões de crédito", "Classificação com IA", "Relatórios avançados", "Metas financeiras"]'::jsonb),
('Plano Premium', 'premium', 59.90, 479.90, 'Para quem precisa de controle total e colaborativo.', NULL, NULL, NULL, NULL, NULL, true, true, true, true, true,
  '["Tudo do Plano Pro", "Categorias ilimitadas", "Contas e cartões ilimitados", "Exportação de relatórios", "Suporte prioritário"]'::jsonb);

-- Function to get user's current plan
CREATE OR REPLACE FUNCTION public.get_user_plan(p_user_id UUID)
RETURNS public.plan_type
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT sp.plan_type 
     FROM public.user_subscriptions us
     JOIN public.subscription_plans sp ON sp.id = us.plan_id
     WHERE us.user_id = p_user_id 
       AND us.status IN ('active', 'trial')
       AND (us.expires_at IS NULL OR us.expires_at > now())
     LIMIT 1),
    'free'::public.plan_type
  )
$$;
