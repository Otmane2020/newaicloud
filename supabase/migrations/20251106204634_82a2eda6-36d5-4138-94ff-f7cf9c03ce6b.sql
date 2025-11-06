-- Créer table de cache pour analyses Vision AI
CREATE TABLE IF NOT EXISTS public.vision_ai_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL UNIQUE,
  analysis_result TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index pour recherche rapide par URL
CREATE INDEX IF NOT EXISTS idx_vision_cache_image_url ON public.vision_ai_cache(image_url);

-- Index pour nettoyage des vieux caches (optionnel, garder cache pendant 30 jours)
CREATE INDEX IF NOT EXISTS idx_vision_cache_created_at ON public.vision_ai_cache(created_at);

-- RLS policies
ALTER TABLE public.vision_ai_cache ENABLE ROW LEVEL SECURITY;

-- Permettre lecture à tous les utilisateurs authentifiés
CREATE POLICY "Allow authenticated users to read vision cache"
  ON public.vision_ai_cache
  FOR SELECT
  TO authenticated
  USING (true);

-- Permettre insertion à tous les utilisateurs authentifiés
CREATE POLICY "Allow authenticated users to insert vision cache"
  ON public.vision_ai_cache
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Fonction pour nettoyer automatiquement les caches de plus de 30 jours
CREATE OR REPLACE FUNCTION public.cleanup_old_vision_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM public.vision_ai_cache
  WHERE created_at < now() - interval '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;