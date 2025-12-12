-- Table pour tracker les visites de pages
CREATE TABLE public.page_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  page_path TEXT NOT NULL,
  page_title TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  traffic_source TEXT DEFAULT 'direct',
  user_agent TEXT,
  device_type TEXT DEFAULT 'desktop',
  country TEXT,
  city TEXT,
  session_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  duration_seconds INTEGER DEFAULT 0,
  is_bounce BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les paniers abandonnés
CREATE TABLE public.abandoned_carts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  session_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  full_name TEXT,
  plan_id TEXT,
  plan_name TEXT,
  billing_period TEXT,
  cart_value NUMERIC DEFAULT 0,
  step_reached TEXT DEFAULT 'view_plans',
  last_action TEXT,
  recovery_email_sent BOOLEAN DEFAULT false,
  recovery_email_sent_at TIMESTAMP WITH TIME ZONE,
  converted BOOLEAN DEFAULT false,
  converted_at TIMESTAMP WITH TIME ZONE,
  utm_source TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes pour les requêtes fréquentes
CREATE INDEX idx_page_visits_created_at ON public.page_visits(created_at DESC);
CREATE INDEX idx_page_visits_traffic_source ON public.page_visits(traffic_source);
CREATE INDEX idx_page_visits_visitor_id ON public.page_visits(visitor_id);
CREATE INDEX idx_abandoned_carts_created_at ON public.abandoned_carts(created_at DESC);
CREATE INDEX idx_abandoned_carts_converted ON public.abandoned_carts(converted);

-- Enable RLS
ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abandoned_carts ENABLE ROW LEVEL SECURITY;

-- Policies pour page_visits (insertion publique, lecture admin)
CREATE POLICY "Anyone can insert page visits"
ON public.page_visits
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view all page visits"
ON public.page_visits
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policies pour abandoned_carts (insertion publique, lecture admin)
CREATE POLICY "Anyone can insert abandoned carts"
ON public.abandoned_carts
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update their own cart by visitor_id"
ON public.abandoned_carts
FOR UPDATE
USING (true);

CREATE POLICY "Admins can view all abandoned carts"
ON public.abandoned_carts
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update abandoned carts"
ON public.abandoned_carts
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger pour updated_at
CREATE TRIGGER update_abandoned_carts_updated_at
BEFORE UPDATE ON public.abandoned_carts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();