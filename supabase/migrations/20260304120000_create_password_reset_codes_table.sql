CREATE TABLE IF NOT EXISTS public.password_reset_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT password_reset_codes_code_format CHECK (code ~ '^[0-9]{6}$')
);

CREATE INDEX IF NOT EXISTS idx_password_reset_codes_email
  ON public.password_reset_codes (email);

CREATE INDEX IF NOT EXISTS idx_password_reset_codes_code
  ON public.password_reset_codes (code);

CREATE INDEX IF NOT EXISTS idx_password_reset_codes_expires_at
  ON public.password_reset_codes (expires_at);

ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;
