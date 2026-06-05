ALTER TABLE public.payments
ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS payer_email text;

ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS payment_lookup_token uuid;

UPDATE public.payments
SET payment_lookup_token = gen_random_uuid()
WHERE payment_lookup_token IS NULL;

ALTER TABLE public.payments
ALTER COLUMN payment_lookup_token SET DEFAULT gen_random_uuid(),
ALTER COLUMN payment_lookup_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS payments_payment_lookup_token_uidx
ON public.payments (payment_lookup_token);

DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;

CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();