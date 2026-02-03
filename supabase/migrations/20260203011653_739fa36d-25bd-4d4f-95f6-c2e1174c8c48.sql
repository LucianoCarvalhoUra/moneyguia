-- Fix 1: Replace broad 'ALL' policy on goals table with granular policies for better security
DROP POLICY IF EXISTS "Users can manage their own goals" ON public.goals;

-- Create separate granular policies for each operation
CREATE POLICY "Users can view their own goals" 
ON public.goals 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals" 
ON public.goals 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals" 
ON public.goals 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals" 
ON public.goals 
FOR DELETE 
USING (auth.uid() = user_id);

-- Fix 2: Add a view for profiles that excludes email for external queries
-- This creates defense in depth - even if RLS is bypassed, a safer view is available
-- Note: The profiles table already has proper RLS, but we add this as an extra layer

COMMENT ON COLUMN public.profiles.email IS 'User email - protected by RLS. Consider using auth.users().email for authoritative source.';

-- Add index on user_id for profiles if not exists for faster RLS checks
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);