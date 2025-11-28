-- Table for Google Ads search terms data
CREATE TABLE IF NOT EXISTS public.google_ads_search_terms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id TEXT,
  campaign_id TEXT,
  campaign_name TEXT,
  adgroup_id TEXT,
  adgroup_name TEXT,
  search_term TEXT NOT NULL,
  keyword TEXT,
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  ctr NUMERIC(5,4) DEFAULT 0,
  avg_cpc NUMERIC(12,2) DEFAULT 0,
  cost_micros BIGINT DEFAULT 0,
  conversions NUMERIC(10,2) DEFAULT 0,
  conversion_rate NUMERIC(5,4) DEFAULT 0,
  conversion_value NUMERIC(12,2) DEFAULT 0,
  date DATE NOT NULL,
  match_type TEXT,
  is_added_keyword BOOLEAN DEFAULT false,
  is_excluded BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for Google Ads ROAS tracking
CREATE TABLE IF NOT EXISTS public.google_ads_roas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  ad_cost NUMERIC(12,2) DEFAULT 0,
  installs INTEGER DEFAULT 0,
  signups INTEGER DEFAULT 0,
  paid_users INTEGER DEFAULT 0,
  revenue NUMERIC(12,2) DEFAULT 0,
  roas NUMERIC(8,4) DEFAULT 0,
  campaign_id TEXT,
  campaign_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date, campaign_id)
);

-- Table for Google Ads negative keywords
CREATE TABLE IF NOT EXISTS public.google_ads_negative_keywords (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  campaign_id TEXT,
  adgroup_id TEXT,
  keyword TEXT NOT NULL,
  match_type TEXT DEFAULT 'BROAD',
  reason TEXT,
  is_applied BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_at TIMESTAMPTZ
);

-- Table for AI-suggested keywords (positive)
CREATE TABLE IF NOT EXISTS public.google_ads_suggested_keywords (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  campaign_id TEXT,
  adgroup_id TEXT,
  keyword TEXT NOT NULL,
  suggested_match_type TEXT DEFAULT 'EXACT',
  search_volume INTEGER,
  competition TEXT,
  suggested_bid NUMERIC(12,2),
  is_added BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  added_at TIMESTAMPTZ
);

-- Table for AI strategy recommendations
CREATE TABLE IF NOT EXISTS public.google_ads_strategies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  strategy_type TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  impact_score INTEGER,
  difficulty TEXT,
  current_value JSONB,
  suggested_value JSONB,
  is_applied BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_google_ads_search_terms_user_date ON public.google_ads_search_terms(user_id, date);
CREATE INDEX IF NOT EXISTS idx_google_ads_search_terms_campaign ON public.google_ads_search_terms(campaign_id);
CREATE INDEX IF NOT EXISTS idx_google_ads_roas_user_date ON public.google_ads_roas(user_id, date);
CREATE INDEX IF NOT EXISTS idx_google_ads_negative_keywords_user ON public.google_ads_negative_keywords(user_id);
CREATE INDEX IF NOT EXISTS idx_google_ads_suggested_keywords_user ON public.google_ads_suggested_keywords(user_id);

-- Enable RLS
ALTER TABLE public.google_ads_search_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_ads_roas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_ads_negative_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_ads_suggested_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_ads_strategies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for search terms
CREATE POLICY "Users can view own search terms" ON public.google_ads_search_terms
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own search terms" ON public.google_ads_search_terms
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own search terms" ON public.google_ads_search_terms
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all search terms" ON public.google_ads_search_terms
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for ROAS
CREATE POLICY "Users can view own ROAS" ON public.google_ads_roas
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ROAS" ON public.google_ads_roas
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all ROAS" ON public.google_ads_roas
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for negative keywords
CREATE POLICY "Users can manage own negative keywords" ON public.google_ads_negative_keywords
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all negative keywords" ON public.google_ads_negative_keywords
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for suggested keywords
CREATE POLICY "Users can manage own suggested keywords" ON public.google_ads_suggested_keywords
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all suggested keywords" ON public.google_ads_suggested_keywords
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for strategies
CREATE POLICY "Users can manage own strategies" ON public.google_ads_strategies
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all strategies" ON public.google_ads_strategies
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));