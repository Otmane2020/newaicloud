-- Table pour stocker les opportunités d'articles de blog détectées
CREATE TABLE IF NOT EXISTS public.blog_opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_title TEXT NOT NULL,
  meta_description TEXT,
  intro_excerpt TEXT,
  type TEXT NOT NULL, -- category-guide, comparison, focus, trend, buying-guide
  primary_keywords TEXT[],
  secondary_keywords TEXT[],
  estimated_word_count INTEGER DEFAULT 2000,
  difficulty TEXT DEFAULT 'medium', -- easy, medium, hard
  seo_opportunity_score INTEGER DEFAULT 0,
  structure JSONB,
  product_ids UUID[],
  language TEXT DEFAULT 'fr',
  status TEXT DEFAULT 'identified', -- identified, published, rejected
  article_id UUID REFERENCES public.blog_articles(id) ON DELETE SET NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blog_opportunities ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own opportunities
CREATE POLICY "Users can manage their own opportunities"
ON public.blog_opportunities
FOR ALL
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_blog_opportunities_updated_at
BEFORE UPDATE ON public.blog_opportunities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();