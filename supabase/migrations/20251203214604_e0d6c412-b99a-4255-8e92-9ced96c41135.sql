-- Table temporaire pour stocker les pages Facebook pendant OAuth
CREATE TABLE public.oauth_pending_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL,
  pages_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '15 minutes'
);

-- Index pour les recherches par session_id
CREATE INDEX idx_oauth_pending_pages_session ON public.oauth_pending_pages(session_id);

-- Index pour le nettoyage des entrées expirées
CREATE INDEX idx_oauth_pending_pages_expires ON public.oauth_pending_pages(expires_at);

-- RLS pour sécuriser l'accès
ALTER TABLE public.oauth_pending_pages ENABLE ROW LEVEL SECURITY;

-- Policy pour permettre l'insertion par edge functions (service role)
CREATE POLICY "Service role can manage oauth_pending_pages"
ON public.oauth_pending_pages
FOR ALL
USING (true)
WITH CHECK (true);

-- Fonction pour nettoyer les entrées expirées
CREATE OR REPLACE FUNCTION public.cleanup_expired_oauth_pages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.oauth_pending_pages
  WHERE expires_at < NOW();
END;
$$;