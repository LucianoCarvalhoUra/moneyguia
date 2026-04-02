-- =====================================================
-- MIGRATION: Admin pode ver todos os perfis
-- Data: 2026-04-02
-- =====================================================

-- Criar política para admins verem todos os perfis
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (
  public.has_role(auth.uid(), 'admin') = TRUE OR
  (auth.jwt() ->> 'email') = 'lucianocarvalhoura@gmail.com'
);

-- Criar política para admins atualizarem todos os perfis (gestão de licenças)
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (
  public.has_role(auth.uid(), 'admin') = TRUE OR
  (auth.jwt() ->> 'email') = 'lucianocarvalhoura@gmail.com'
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') = TRUE OR
  (auth.jwt() ->> 'email') = 'lucianocarvalhoura@gmail.com'
);

-- Criar política para admins verem todas as assinaturas
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.user_subscriptions;
CREATE POLICY "Admins can view all subscriptions" 
ON public.user_subscriptions 
FOR SELECT 
TO authenticated 
USING (
  public.has_role(auth.uid(), 'admin') = TRUE OR
  (auth.jwt() ->> 'email') = 'lucianocarvalhoura@gmail.com'
);

-- Criar política para admins atualizarem todas as assinaturas
DROP POLICY IF EXISTS "Admins can update all subscriptions" ON public.user_subscriptions;
CREATE POLICY "Admins can update all subscriptions" 
ON public.user_subscriptions 
FOR ALL 
TO authenticated 
USING (
  public.has_role(auth.uid(), 'admin') = TRUE OR
  (auth.jwt() ->> 'email') = 'lucianocarvalhoura@gmail.com'
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') = TRUE OR
  (auth.jwt() ->> 'email') = 'lucianocarvalhoura@gmail.com'
);