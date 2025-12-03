-- Add social media columns to promotional_articles
ALTER TABLE public.promotional_articles 
ADD COLUMN IF NOT EXISTS social_channels TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS social_status TEXT DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS facebook_post_id TEXT,
ADD COLUMN IF NOT EXISTS gsc_indexed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS social_published_at TIMESTAMPTZ;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_promotional_articles_social_status ON public.promotional_articles(social_status);
CREATE INDEX IF NOT EXISTS idx_promotional_articles_gsc_indexed ON public.promotional_articles(gsc_indexed);