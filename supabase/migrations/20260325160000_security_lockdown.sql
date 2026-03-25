-- =====================================================
-- MIGRATION: Blindagem de Segurança Final
-- Data: 2026-03-25
-- =====================================================

-- =====================================================
-- 1. PROTEÇÃO DA TABELA user_roles
-- =====================================================

-- Habilitar RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Política: Apenas leitura para usuários autenticados
DROP POLICY IF EXISTS "Enable read for authenticated" ON public.user_roles;
CREATE POLICY "Enable read for authenticated"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);

-- Política: INSERT bloqueado para frontend (apenas service_role pode inserir)
DROP POLICY IF EXISTS "Enable insert for service role only" ON public.user_roles;
CREATE POLICY "Enable insert for service role only"
ON public.user_roles
FOR INSERT
TO service_role
WITH CHECK (true);

-- Política: UPDATE bloqueado para frontend (apenas service_role pode atualizar)
DROP POLICY IF EXISTS "Enable update for service role only" ON public.user_roles;
CREATE POLICY "Enable update for service role only"
ON public.user_roles
FOR UPDATE
TO service_role
USING (true);

-- Política: DELETE bloqueado para frontend
DROP POLICY IF EXISTS "Enable delete for service role only" ON public.user_roles;
CREATE POLICY "Enable delete for service role only"
ON public.user_roles
FOR DELETE
TO service_role
USING (true);

-- =====================================================
-- 2. REFATORAR has_role COM SECURITY DEFINER
-- =====================================================

CREATE OR REPLACE FUNCTION public.has_role(check_user_id UUID, required_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
  role_hierarchy JSONB;
  user_level INT;
  required_level INT;
BEGIN
  -- Definir hierarquia de roles (ordem crescente de privilégios)
  role_hierarchy := '{
    "viewer": 1,
    "user": 2,
    "manager": 3,
    "admin": 4
  }'::JSONB;
  
  -- Buscar role do usuário
  SELECT ur.role INTO user_role
  FROM public.user_roles ur
  WHERE ur.user_id = check_user_id;
  
  -- Se usuário não tem role, retornar false
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Obter níveis de privilégio
  user_level := (role_hierarchy ->> user_role)::INT;
  required_level := (role_hierarchy ->> required_role)::INT;
  
  -- Comparar níveis (usuário precisa ter nível >= ao requerido)
  RETURN COALESCE(user_level, 0) >= COALESCE(required_level, 0);
EXCEPTION WHEN OTHERS THEN
  -- Em caso de erro, retorna false por segurança
  RETURN FALSE;
END;
$$;

-- =====================================================
-- 3. RLS NA TABELA password_reset_codes
-- =====================================================

-- Habilitar RLS
ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas
DROP POLICY IF EXISTS "Enable service role full access" ON public.password_reset_codes;
DROP POLICY IF EXISTS "Enable insert for anon" ON public.password_reset_codes;

-- Criar política: Apenas service_role pode acessar
DROP POLICY IF EXISTS "Service role only" ON public.password_reset_codes;
CREATE POLICY "Service role only"
ON public.password_reset_codes
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- 4. PROTEÇÃO DA TABELA profiles
-- =====================================================

-- Garantir que RLS está habilitado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Políticas mais restritivas
DROP POLICY IF EXISTS "Authenticated users can view own profile" ON public.profiles;
CREATE POLICY "Authenticated users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can update own profile" ON public.profiles;
CREATE POLICY "Authenticated users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Service role can insert any profile" ON public.profiles;
CREATE POLICY "Service role can insert any profile"
ON public.profiles
FOR INSERT
TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update any profile" ON public.profiles;
CREATE POLICY "Service role can update any profile"
ON public.profiles
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- 5. CRIAR FUNÇÃO PARA VERIFICAR SE É ADMIN
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles
    WHERE user_id = check_user_id AND role = 'admin'
  ) INTO is_admin;
  
  RETURN COALESCE(is_admin, FALSE);
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$;

-- =====================================================
-- NOTAS:
-- 1. Execute este SQL no Supabase Dashboard > SQL Editor
-- 2. A tabela user_roles agora só pode ser modificada pelo service_role
-- 3. A função has_role agora usa SECURITY DEFINER
-- 4. A tabela password_reset_codes é acessível apenas pelo backend
-- =====================================================
