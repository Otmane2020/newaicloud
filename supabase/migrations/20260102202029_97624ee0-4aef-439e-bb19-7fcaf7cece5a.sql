-- Table de configuration du calendrier AEO
CREATE TABLE public.aeo_publication_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  store_id UUID REFERENCES public.shopify_connections(id) ON DELETE CASCADE,
  
  -- Configuration du calendrier
  qa_per_day INTEGER DEFAULT 1 CHECK (qa_per_day >= 1 AND qa_per_day <= 5),
  pillar_frequency TEXT DEFAULT 'weekly' CHECK (pillar_frequency IN ('daily', 'weekly', 'bi-weekly', 'monthly')),
  pillar_day_of_week INTEGER DEFAULT 1 CHECK (pillar_day_of_week >= 0 AND pillar_day_of_week <= 6),
  publication_hour INTEGER DEFAULT 9 CHECK (publication_hour >= 0 AND publication_hour <= 23),
  
  -- Liens Q&A vers Articles Piliers
  link_qa_to_pillar BOOLEAN DEFAULT true,
  
  -- Statut
  is_active BOOLEAN DEFAULT false,
  last_qa_published_at TIMESTAMPTZ,
  last_pillar_published_at TIMESTAMPTZ,
  next_qa_scheduled_at TIMESTAMPTZ,
  next_pillar_scheduled_at TIMESTAMPTZ,
  
  -- Stats
  total_qa_published INTEGER DEFAULT 0,
  total_pillars_published INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, store_id)
);

-- Table des articles piliers AEO
CREATE TABLE public.aeo_pillar_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  store_id UUID REFERENCES public.shopify_connections(id) ON DELETE CASCADE,
  
  -- Contenu
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  content TEXT,
  meta_description TEXT,
  keywords TEXT[],
  
  -- Liens vers Q&A associés
  linked_qa_ids UUID[],
  
  -- Statut
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  
  -- Article blog référence
  article_id UUID REFERENCES public.blog_articles(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.aeo_publication_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aeo_pillar_articles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for aeo_publication_calendar
CREATE POLICY "Users can view their own calendar config"
ON public.aeo_publication_calendar FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own calendar config"
ON public.aeo_publication_calendar FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar config"
ON public.aeo_publication_calendar FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar config"
ON public.aeo_publication_calendar FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for aeo_pillar_articles
CREATE POLICY "Users can view their own pillar articles"
ON public.aeo_pillar_articles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own pillar articles"
ON public.aeo_pillar_articles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pillar articles"
ON public.aeo_pillar_articles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pillar articles"
ON public.aeo_pillar_articles FOR DELETE
USING (auth.uid() = user_id);

-- Trigger pour updated_at
CREATE TRIGGER update_aeo_publication_calendar_updated_at
  BEFORE UPDATE ON public.aeo_publication_calendar
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_aeo_pillar_articles_updated_at
  BEFORE UPDATE ON public.aeo_pillar_articles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();