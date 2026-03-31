-- =====================================================
-- CSAT Module: campaigns + responses
-- =====================================================

CREATE TABLE IF NOT EXISTS public.csat_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.csat_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.csat_campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, user_id)
);

-- Only one active campaign at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_csat_campaigns_only_one_active
  ON public.csat_campaigns (is_active)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_csat_responses_campaign_id ON public.csat_responses(campaign_id);
CREATE INDEX IF NOT EXISTS idx_csat_responses_is_public ON public.csat_responses(is_public);

-- updated_at triggers
DROP TRIGGER IF EXISTS update_csat_campaigns_updated_at ON public.csat_campaigns;
CREATE TRIGGER update_csat_campaigns_updated_at
BEFORE UPDATE ON public.csat_campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_csat_responses_updated_at ON public.csat_responses;
CREATE TRIGGER update_csat_responses_updated_at
BEFORE UPDATE ON public.csat_responses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- RLS
-- =====================================================

ALTER TABLE public.csat_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csat_responses ENABLE ROW LEVEL SECURITY;

-- Campaigns
DROP POLICY IF EXISTS "Authenticated can read campaigns" ON public.csat_campaigns;
CREATE POLICY "Authenticated can read campaigns"
ON public.csat_campaigns
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can manage campaigns" ON public.csat_campaigns;
CREATE POLICY "Admins can manage campaigns"
ON public.csat_campaigns
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Responses: public can read only published testimonials
DROP POLICY IF EXISTS "Public can read published CSAT responses" ON public.csat_responses;
CREATE POLICY "Public can read published CSAT responses"
ON public.csat_responses
FOR SELECT
USING (is_public = true);

-- Authenticated users can create only their own response
DROP POLICY IF EXISTS "Authenticated can insert own CSAT responses" ON public.csat_responses;
CREATE POLICY "Authenticated can insert own CSAT responses"
ON public.csat_responses
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- User can read own response (admin can read everything via separate policy)
DROP POLICY IF EXISTS "Users can read own CSAT responses" ON public.csat_responses;
CREATE POLICY "Users can read own CSAT responses"
ON public.csat_responses
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admin full management
DROP POLICY IF EXISTS "Admins can manage CSAT responses" ON public.csat_responses;
CREATE POLICY "Admins can manage CSAT responses"
ON public.csat_responses
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
