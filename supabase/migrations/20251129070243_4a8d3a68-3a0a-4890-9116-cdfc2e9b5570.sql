-- Table for scheduled blog articles
CREATE TABLE IF NOT EXISTS public.scheduled_blog_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  meta_description TEXT,
  excerpt TEXT,
  content TEXT,
  category TEXT NOT NULL DEFAULT 'SEO',
  featured_image TEXT,
  read_time INTEGER DEFAULT 5,
  language TEXT NOT NULL DEFAULT 'fr' CHECK (language IN ('fr', 'en')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'generating', 'generated', 'published', 'failed')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  generated_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  error_message TEXT,
  topic_theme TEXT,
  keywords TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduled_blog_articles ENABLE ROW LEVEL SECURITY;

-- Admin can view all scheduled articles
CREATE POLICY "Admin can view scheduled articles"
ON public.scheduled_blog_articles
FOR SELECT
USING (true);

-- Admin can manage scheduled articles
CREATE POLICY "Admin can manage scheduled articles"
ON public.scheduled_blog_articles
FOR ALL
USING (true);

-- Index for efficient querying
CREATE INDEX idx_scheduled_articles_status ON public.scheduled_blog_articles(status);
CREATE INDEX idx_scheduled_articles_scheduled_for ON public.scheduled_blog_articles(scheduled_for);
CREATE INDEX idx_scheduled_articles_language ON public.scheduled_blog_articles(language);

-- Trigger for updated_at
CREATE TRIGGER update_scheduled_blog_articles_updated_at
BEFORE UPDATE ON public.scheduled_blog_articles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();