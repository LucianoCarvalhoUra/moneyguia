
-- Add new columns to goals table
ALTER TABLE public.goals 
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'outros',
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;

-- Create goal_contributions table for deposit history
CREATE TABLE IF NOT EXISTS public.goal_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  note text,
  contributed_at date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.goal_contributions ENABLE ROW LEVEL SECURITY;

-- RLS policies for goal_contributions
CREATE POLICY "Users can view their own contributions" ON public.goal_contributions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own contributions" ON public.goal_contributions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own contributions" ON public.goal_contributions FOR DELETE USING (auth.uid() = user_id);
