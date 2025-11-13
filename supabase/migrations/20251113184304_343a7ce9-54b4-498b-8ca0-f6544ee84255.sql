-- Table pour tracker les demandes d'indexation Google Search Console
CREATE TABLE IF NOT EXISTS public.gsc_indexing_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id UUID REFERENCES public.blog_articles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'quota_exceeded')),
  response_data JSONB,
  error_message TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour recherches rapides
CREATE INDEX IF NOT EXISTS idx_gsc_indexing_user_id ON public.gsc_indexing_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_gsc_indexing_article_id ON public.gsc_indexing_requests(article_id);
CREATE INDEX IF NOT EXISTS idx_gsc_indexing_status ON public.gsc_indexing_requests(status);

-- RLS pour gsc_indexing_requests
ALTER TABLE public.gsc_indexing_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own indexing requests"
  ON public.gsc_indexing_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own indexing requests"
  ON public.gsc_indexing_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own indexing requests"
  ON public.gsc_indexing_requests FOR UPDATE
  USING (auth.uid() = user_id);

-- Table pour le cache des données GSC
CREATE TABLE IF NOT EXISTS public.gsc_data_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  cache_type TEXT NOT NULL CHECK (cache_type IN ('insights', 'sitemaps', 'products', 'pages', 'queries')),
  date_range TEXT NOT NULL,
  data JSONB NOT NULL,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '6 hours')
);

-- Index pour recherches rapides sur le cache
CREATE INDEX IF NOT EXISTS idx_gsc_cache_user_domain ON public.gsc_data_cache(user_id, domain);
CREATE INDEX IF NOT EXISTS idx_gsc_cache_type ON public.gsc_data_cache(cache_type);
CREATE INDEX IF NOT EXISTS idx_gsc_cache_expires ON public.gsc_data_cache(expires_at);

-- RLS pour gsc_data_cache
ALTER TABLE public.gsc_data_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cache"
  ON public.gsc_data_cache FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own cache"
  ON public.gsc_data_cache FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cache"
  ON public.gsc_data_cache FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cache"
  ON public.gsc_data_cache FOR DELETE
  USING (auth.uid() = user_id);

-- Fonction pour nettoyer le cache expiré
CREATE OR REPLACE FUNCTION public.cleanup_expired_gsc_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.gsc_data_cache
  WHERE expires_at < NOW();
END;
$$;

-- Trigger pour mettre à jour updated_at sur gsc_indexing_requests
CREATE OR REPLACE FUNCTION public.update_gsc_indexing_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_gsc_indexing_requests_updated_at
  BEFORE UPDATE ON public.gsc_indexing_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gsc_indexing_updated_at();