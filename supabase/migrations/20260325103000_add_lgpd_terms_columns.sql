-- =====================================================
-- MIGRATION: Adicionar colunas de conformidade LGPD
-- Tabela: profiles
-- Data: 2026-03-25
-- =====================================================

-- Adicionar coluna accepted_terms (boolean) para rastrear aceite dos termos
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS accepted_terms BOOLEAN DEFAULT FALSE;

-- Adicionar coluna terms_accepted_at (timestamptz) para registrar quando os termos foram aceitos
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

-- Adicionar coluna terms_version (text) para rastrear qual versão dos termos foi aceita
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS terms_version TEXT DEFAULT '1.0';

-- Comentários para documentação
COMMENT ON COLUMN profiles.accepted_terms IS 'Indica se o usuário aceitou os termos de uso e política de privacidade (LGPD)';
COMMENT ON COLUMN profiles.terms_accepted_at IS 'Data e hora em que o usuário aceitou os termos de uso';
COMMENT ON COLUMN profiles.terms_version IS 'Versão dos termos aceita pelo usuário';

-- =====================================================
-- NOTA: Para aplicar esta migration, execute o SQL 
-- acima no editor SQL do Supabase Dashboard:
-- https://supabase.com/dashboard/project/_/sql
-- =====================================================
