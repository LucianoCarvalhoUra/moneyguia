-- =====================================================
-- MIGRATION: Cálculo Automático de Expiração de Assinatura
-- Data: 2026-03-25
-- =====================================================

CREATE OR REPLACE FUNCTION public.calculate_subscription_expiry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Define expires_at se estiver nulo, baseado no starts_at e no billing_cycle
  IF NEW.expires_at IS NULL AND NEW.starts_at IS NOT NULL THEN
    IF NEW.billing_cycle = 'yearly' THEN
      NEW.expires_at := NEW.starts_at + INTERVAL '1 year';
    ELSE
      NEW.expires_at := NEW.starts_at + INTERVAL '1 month';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_calculate_expiry ON public.user_subscriptions;
CREATE TRIGGER trigger_calculate_expiry
  BEFORE INSERT OR UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_subscription_expiry();