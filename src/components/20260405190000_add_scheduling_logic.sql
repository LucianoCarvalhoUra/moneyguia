-- =====================================================
-- MIGRATION: Lógica de Agendamento e Baixa Automática
-- Data: 2026-04-05
-- =====================================================

-- Adicionar configuração de auto_liquidation ao perfil
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS auto_liquidation BOOLEAN DEFAULT false;

-- Adicionar colunas de agendamento em incomes (receitas)
ALTER TABLE public.incomes 
ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_scheduled BOOLEAN DEFAULT false;

-- Adicionar colunas de agendamento em expenses (despesas)
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_scheduled BOOLEAN DEFAULT false;