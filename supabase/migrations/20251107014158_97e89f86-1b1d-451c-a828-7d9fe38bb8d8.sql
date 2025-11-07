-- Table pour suivre les mots-clés
CREATE TABLE IF NOT EXISTS public.gsc_keyword_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  domain TEXT NOT NULL,
  keyword TEXT NOT NULL,
  initial_position DECIMAL NOT NULL,
  current_position DECIMAL NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour l'historique des positions des mots-clés
CREATE TABLE IF NOT EXISTS public.gsc_keyword_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tracking_id UUID NOT NULL REFERENCES public.gsc_keyword_tracking(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  position DECIMAL NOT NULL,
  clicks INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  ctr DECIMAL NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gsc_keyword_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gsc_keyword_history ENABLE ROW LEVEL SECURITY;

-- Policies pour gsc_keyword_tracking
CREATE POLICY "Users can view their own keyword tracking"
ON public.gsc_keyword_tracking
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own keyword tracking"
ON public.gsc_keyword_tracking
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own keyword tracking"
ON public.gsc_keyword_tracking
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own keyword tracking"
ON public.gsc_keyword_tracking
FOR DELETE
USING (auth.uid() = user_id);

-- Policies pour gsc_keyword_history
CREATE POLICY "Users can view keyword history through tracking"
ON public.gsc_keyword_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gsc_keyword_tracking
    WHERE id = gsc_keyword_history.tracking_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert keyword history through tracking"
ON public.gsc_keyword_history
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gsc_keyword_tracking
    WHERE id = gsc_keyword_history.tracking_id
    AND user_id = auth.uid()
  )
);

-- Index pour les performances
CREATE INDEX idx_gsc_keyword_tracking_user_domain ON public.gsc_keyword_tracking(user_id, domain);
CREATE INDEX idx_gsc_keyword_history_tracking_date ON public.gsc_keyword_history(tracking_id, date);

-- Trigger pour updated_at
CREATE TRIGGER update_gsc_keyword_tracking_updated_at
BEFORE UPDATE ON public.gsc_keyword_tracking
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();