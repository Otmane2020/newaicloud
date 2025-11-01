-- Create promotional_articles table for NewAI marketing content
CREATE TABLE IF NOT EXISTS public.promotional_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  meta_description TEXT,
  excerpt TEXT,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  featured_image TEXT,
  read_time INTEGER DEFAULT 5,
  published BOOLEAN DEFAULT false,
  views INTEGER DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.promotional_articles ENABLE ROW LEVEL SECURITY;

-- Public can view published articles
CREATE POLICY "Anyone can view published promotional articles"
ON public.promotional_articles
FOR SELECT
USING (published = true);

-- Create index on slug for fast lookups
CREATE INDEX idx_promotional_articles_slug ON public.promotional_articles(slug);

-- Create index on category for filtering
CREATE INDEX idx_promotional_articles_category ON public.promotional_articles(category);

-- Create index on published_at for sorting
CREATE INDEX idx_promotional_articles_published_at ON public.promotional_articles(published_at DESC);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_promotional_articles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_promotional_articles_updated_at
BEFORE UPDATE ON public.promotional_articles
FOR EACH ROW
EXECUTE FUNCTION update_promotional_articles_updated_at();