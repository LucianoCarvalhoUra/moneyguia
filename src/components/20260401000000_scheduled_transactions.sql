-- =====================================================
-- MIGRATION: Agendamento de Transações e Baixa Automática
-- Data: 2026-04-01
-- =====================================================

-- 1. Preferência de Baixa Automática no Perfil
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS auto_liquidation BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.profiles.auto_liquidation IS 'Define se o sistema deve confirmar automaticamente transações agendadas na data prevista';

-- 2. Colunas de Agendamento em Despesas
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS is_scheduled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS scheduled_date DATE;

-- 3. Colunas de Agendamento em Receitas
ALTER TABLE public.incomes 
ADD COLUMN IF NOT EXISTS is_scheduled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS scheduled_date DATE;