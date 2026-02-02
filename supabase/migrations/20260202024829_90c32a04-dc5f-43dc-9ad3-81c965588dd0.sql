-- Fix: Add NULL validation to delete_user_account() function
-- This prevents silent failures when JWT claims are missing or invalid

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id_to_delete UUID;
BEGIN
  -- Extract user ID from JWT claims
  user_id_to_delete := (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;
  
  -- Validate that we have a valid user ID
  IF user_id_to_delete IS NULL THEN
    RAISE EXCEPTION 'Authentication required - no valid user ID found';
  END IF;

  -- Delete user data from all tables (in order respecting dependencies)
  DELETE FROM public.notification_settings WHERE user_id = user_id_to_delete;
  DELETE FROM public.expenses WHERE user_id = user_id_to_delete;
  DELETE FROM public.incomes WHERE user_id = user_id_to_delete;
  DELETE FROM public.subcategories WHERE user_id = user_id_to_delete;
  DELETE FROM public.income_subcategories WHERE user_id = user_id_to_delete;
  DELETE FROM public.categories WHERE user_id = user_id_to_delete;
  DELETE FROM public.income_categories WHERE user_id = user_id_to_delete;
  DELETE FROM public.credit_cards WHERE user_id = user_id_to_delete;
  DELETE FROM public.bank_accounts WHERE user_id = user_id_to_delete;
  DELETE FROM public.goals WHERE user_id = user_id_to_delete;
  DELETE FROM public.user_roles WHERE user_id = user_id_to_delete;
  DELETE FROM public.profiles WHERE user_id = user_id_to_delete;
END;
$$;