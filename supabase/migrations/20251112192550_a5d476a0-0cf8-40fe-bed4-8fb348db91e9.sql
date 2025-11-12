-- Table d'historique pour les images de collections générées par IA
CREATE TABLE IF NOT EXISTS public.collection_image_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID NOT NULL REFERENCES public.shopify_collections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  version_number INTEGER NOT NULL,
  optimization_type TEXT NOT NULL,
  original_url TEXT,
  optimized_url TEXT NOT NULL,
  ai_prompt TEXT,
  ai_model TEXT,
  resolution TEXT,
  quality_score INTEGER,
  is_current BOOLEAN DEFAULT FALSE,
  restored_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_collection_image_history_collection ON public.collection_image_history(collection_id);
CREATE INDEX idx_collection_image_history_user ON public.collection_image_history(user_id);
CREATE INDEX idx_collection_image_history_current ON public.collection_image_history(is_current) WHERE is_current = TRUE;

-- RLS policies
ALTER TABLE public.collection_image_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own collection image history"
  ON public.collection_image_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own collection image history"
  ON public.collection_image_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collection image history"
  ON public.collection_image_history FOR UPDATE
  USING (auth.uid() = user_id);

-- Table d'historique pour les images d'articles générées par IA
CREATE TABLE IF NOT EXISTS public.article_image_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL REFERENCES public.blog_articles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  version_number INTEGER NOT NULL,
  optimization_type TEXT NOT NULL,
  original_url TEXT,
  optimized_url TEXT NOT NULL,
  ai_prompt TEXT,
  ai_model TEXT,
  resolution TEXT,
  quality_score INTEGER,
  is_current BOOLEAN DEFAULT FALSE,
  restored_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_article_image_history_article ON public.article_image_history(article_id);
CREATE INDEX idx_article_image_history_user ON public.article_image_history(user_id);
CREATE INDEX idx_article_image_history_current ON public.article_image_history(is_current) WHERE is_current = TRUE;

-- RLS policies
ALTER TABLE public.article_image_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own article image history"
  ON public.article_image_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own article image history"
  ON public.article_image_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own article image history"
  ON public.article_image_history FOR UPDATE
  USING (auth.uid() = user_id);

-- Fonction helper pour obtenir le prochain numéro de version
CREATE OR REPLACE FUNCTION public.get_next_collection_image_version(p_collection_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO next_version
  FROM public.collection_image_history
  WHERE collection_id = p_collection_id;
  
  RETURN next_version;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_next_article_image_version(p_article_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO next_version
  FROM public.article_image_history
  WHERE article_id = p_article_id;
  
  RETURN next_version;
END;
$$;