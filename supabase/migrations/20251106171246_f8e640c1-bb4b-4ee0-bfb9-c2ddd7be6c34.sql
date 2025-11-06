-- Add Google OAuth token to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS google_oauth_token TEXT,
ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS google_token_expires_at TIMESTAMP WITH TIME ZONE;

-- Create table for Google Search Console domains
CREATE TABLE IF NOT EXISTS public.google_search_console_domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  domain TEXT NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, domain)
);

-- Enable RLS
ALTER TABLE public.google_search_console_domains ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own domains"
ON public.google_search_console_domains
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create table for Search Console data cache
CREATE TABLE IF NOT EXISTS public.google_search_console_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  domain TEXT NOT NULL,
  date DATE NOT NULL,
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  ctr DOUBLE PRECISION DEFAULT 0,
  position DOUBLE PRECISION DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, domain, date)
);

-- Enable RLS
ALTER TABLE public.google_search_console_data ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own search console data"
ON public.google_search_console_data
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert search console data"
ON public.google_search_console_data
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service role can update search console data"
ON public.google_search_console_data
FOR UPDATE
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_gsc_domains_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_gsc_domains_timestamp
BEFORE UPDATE ON public.google_search_console_domains
FOR EACH ROW
EXECUTE FUNCTION public.update_gsc_domains_updated_at();
