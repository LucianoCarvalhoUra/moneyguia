-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update roles"
ON public.user_roles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Add DELETE policy for profiles (needed for user deletion)
CREATE POLICY "Users can delete their own profile"
ON public.profiles
FOR DELETE
USING (auth.uid() = user_id);

-- Add DELETE policy for notification_settings (needed for user deletion)
CREATE POLICY "Users can delete their own notification settings"
ON public.notification_settings
FOR DELETE
USING (auth.uid() = user_id);

-- Create function to delete all user data (for profile deletion)
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id_to_delete UUID := (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;
BEGIN
  -- Delete all user data (CASCADE will handle most, but explicit for safety)
  DELETE FROM public.notification_settings WHERE user_id = user_id_to_delete;
  DELETE FROM public.expenses WHERE user_id = user_id_to_delete;
  DELETE FROM public.incomes WHERE user_id = user_id_to_delete;
  DELETE FROM public.subcategories WHERE user_id = user_id_to_delete;
  DELETE FROM public.categories WHERE user_id = user_id_to_delete;
  DELETE FROM public.income_subcategories WHERE user_id = user_id_to_delete;
  DELETE FROM public.income_categories WHERE user_id = user_id_to_delete;
  DELETE FROM public.credit_cards WHERE user_id = user_id_to_delete;
  DELETE FROM public.bank_accounts WHERE user_id = user_id_to_delete;
  DELETE FROM public.user_roles WHERE user_id = user_id_to_delete;
  DELETE FROM public.profiles WHERE user_id = user_id_to_delete;
END;
$$;