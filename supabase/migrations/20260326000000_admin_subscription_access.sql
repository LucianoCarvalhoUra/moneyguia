-- Permissão para Administradores gerenciarem assinaturas de qualquer usuário
-- Isso resolve o erro 400/401 ao tentar alterar planos de terceiros

DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.user_subscriptions;

CREATE POLICY "Admins can manage all subscriptions"
ON public.user_subscriptions
FOR ALL 
TO authenticated
USING (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
)
WITH CHECK (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
);