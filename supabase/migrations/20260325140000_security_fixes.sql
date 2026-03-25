-- =====================================================
-- MIGRATION: Correções de Segurança Supabase
-- Data: 2026-03-25
-- =====================================================

-- =====================================================
-- 1. FIX PASSWORD RESET RLS
-- Tabela: password_reset_codes
-- =====================================================

-- Desabilitar RLS temporariamente se existir
ALTER TABLE public.password_reset_codes DISABLE ROW LEVEL SECURITY;

-- Criar política para service_role (backend) - acesso total
DROP POLICY IF EXISTS "Enable service role full access" ON public.password_reset_codes;
CREATE POLICY "Enable service role full access" 
ON public.password_reset_codes 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Criar política para anon - apenas INSERT (para solicitar código)
DROP POLICY IF EXISTS "Enable insert for anon" ON public.password_reset_codes;
CREATE POLICY "Enable insert for anon" 
ON public.password_reset_codes 
FOR INSERT 
TO anon 
WITH CHECK (true);

-- Habilitar RLS
ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. FIX ADMIN PRIVILEGE ESCALATION
-- Tabela: user_roles
-- =====================================================

-- Criar função para verificar se existe admin no sistema
CREATE OR REPLACE FUNCTION public.has_existing_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  admin_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles 
    WHERE role = 'admin' 
    LIMIT 1
  ) INTO admin_exists;
  RETURN COALESCE(admin_exists, FALSE);
END;
$$;

-- Criar função para bloquear auto-promoção a admin
CREATE OR REPLACE FUNCTION public.prevent_self_admin_promotion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Se está tentando inserir como admin
  IF NEW.role = 'admin' THEN
    -- Verificar se é o primeiro admin do sistema
    IF NOT public.has_existing_admin() THEN
      -- Primeiro admin é permitido
      RETURN NEW;
    END IF;
    
    -- Se já existe admin, bloquear tentativa de auto-promoção
    IF NEW.user_id = auth.uid() THEN
      RAISE EXCEPTION 'Você não pode se promover a administrador. Entre em contato com um admin existente.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger na tabela user_roles
DROP TRIGGER IF EXISTS trigger_prevent_self_admin ON public.user_roles;
CREATE TRIGGER trigger_prevent_self_admin
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_admin_promotion();

-- =====================================================
-- 3. VERIFICAÇÃO DE LGPD RLS
-- Tabela: profiles
-- =====================================================

-- Política para usuários lerem apenas seu próprio perfil
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (id = auth.uid());

-- Política para usuários atualizarem apenas seu próprio perfil
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (id = auth.uid());

-- Política para usuários inserirem apenas seu próprio perfil
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated 
WITH CHECK (id = auth.uid());

-- =====================================================
-- 4. MELHORIA DA FUNÇÃO has_role
-- =====================================================

-- Recriar função has_role como STABLE para evitar problemas de performance
CREATE OR REPLACE FUNCTION public.has_role(user_id UUID, required_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
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
  WHERE ur.user_id = has_role.user_id;
  
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
-- NOTAS:
-- 1. Execute este SQL no Supabase Dashboard > SQL Editor
-- 2. O service_role é usado apenas pelo backend (Edge Functions)
-- 3. Aplicar políticas de RLS garante isolamento de dados
-- 4. A trigger impede que um usuário se promova a admin
-- =====================================================
