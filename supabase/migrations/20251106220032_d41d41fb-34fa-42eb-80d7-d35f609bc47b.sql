-- Table pour stocker les données Google Search Console
CREATE TABLE IF NOT EXISTS public.google_search_console_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  date DATE NOT NULL,
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  ctr NUMERIC(10, 4) DEFAULT 0,
  position NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, domain, date)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_gsc_data_user_domain_date ON public.google_search_console_data(user_id, domain, date DESC);

-- RLS policies
ALTER TABLE public.google_search_console_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own GSC data"
  ON public.google_search_console_data
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own GSC data"
  ON public.google_search_console_data
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own GSC data"
  ON public.google_search_console_data
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own GSC data"
  ON public.google_search_console_data
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_gsc_data_updated_at
  BEFORE UPDATE ON public.google_search_console_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Ajouter les colonnes pour Google Merchant Center OAuth dans profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS google_merchant_oauth_token TEXT,
ADD COLUMN IF NOT EXISTS google_merchant_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS google_merchant_token_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS google_merchant_email TEXT;