-- This migration secures the system_settings table by enabling Row Level Security (RLS)
-- and ensuring only users with the 'admin' role can access or modify the settings.

-- Enable RLS on the system_settings table.
-- This is the primary step to enforce data access policies.
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create a comprehensive policy for administrators.
-- This policy grants full CRUD (Create, Read, Update, Delete) permissions
-- to any user who has the 'admin' role, as verified by the `has_role` function.
-- The `USING` clause applies to SELECT, UPDATE, and DELETE operations.
-- The `WITH CHECK` clause applies to INSERT and UPDATE operations.
CREATE POLICY "Admins can manage system settings"
ON public.system_settings
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));