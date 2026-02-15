ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS subscription_plan TEXT NOT NULL DEFAULT 'free'
CHECK (subscription_plan IN ('free', 'premium', 'total'));

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'trial'
CHECK (subscription_status IN ('active', 'trial', 'past_due', 'canceled'));

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE;
