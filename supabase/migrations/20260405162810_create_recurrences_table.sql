-- =====================================================
-- MIGRATION: Create recurrences table
-- Data: 2026-04-05
-- =====================================================

-- Criar tabela de recorrências
CREATE TABLE IF NOT EXISTS public.recurrences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
  recurrence_type TEXT NOT NULL CHECK (recurrence_type IN ('daily', 'weekly', 'monthly', 'yearly')),
  start_date TIMESTAMPTZ NOT NULL,
  only_visual BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_recurrences_user_id ON public.recurrences(user_id);
CREATE INDEX IF NOT EXISTS idx_recurrences_start_date ON public.recurrences(start_date);
CREATE INDEX IF NOT EXISTS idx_recurrences_only_visual ON public.recurrences(only_visual);

-- Criar política de acesso
DROP POLICY IF EXISTS "Users can view their own recurrences" ON public.recurrences;
CREATE POLICY "Users can view their own recurrences" 
ON public.recurrences 
FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own recurrences" ON public.recurrences;
CREATE POLICY "Users can insert their own recurrences" 
ON public.recurrences 
FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own recurrences" ON public.recurrences;
CREATE POLICY "Users can update their own recurrences" 
ON public.recurrences 
FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own recurrences" ON public.recurrences;
CREATE POLICY "Users can delete their own recurrences" 
ON public.recurrences 
FOR DELETE 
TO authenticated 
USING (user_id = auth.uid());