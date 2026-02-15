ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS classification_type TEXT
CHECK (classification_type IN ('essencial', 'superfluo', 'longo_prazo'));

ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS recurrence_type TEXT
CHECK (recurrence_type IN ('fixa', 'variavel'));

CREATE OR REPLACE FUNCTION public.reload_schema_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
END;
$$;

REVOKE ALL ON FUNCTION public.reload_schema_cache() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reload_schema_cache() TO authenticated;
