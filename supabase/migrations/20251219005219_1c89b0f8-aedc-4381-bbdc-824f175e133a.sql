-- Add columns for public AEO answer pages
ALTER TABLE public.ai_answers 
ADD COLUMN IF NOT EXISTS slug TEXT,
ADD COLUMN IF NOT EXISTS brand_name TEXT,
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Create unique index on brand_name + slug for URL routing
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_answers_brand_slug 
ON public.ai_answers (brand_name, slug) 
WHERE brand_name IS NOT NULL AND slug IS NOT NULL;

-- Create index for published answers
CREATE INDEX IF NOT EXISTS idx_ai_answers_published 
ON public.ai_answers (is_published, brand_name) 
WHERE is_published = true;

-- Add RLS policy for public read access to published answers
CREATE POLICY "Published answers are publicly readable"
ON public.ai_answers
FOR SELECT
USING (is_published = true);

-- Function to generate slug from question
CREATE OR REPLACE FUNCTION public.generate_answer_slug(question_text TEXT)
RETURNS TEXT AS $$
DECLARE
  slug TEXT;
BEGIN
  -- Lowercase, remove special chars, replace spaces with hyphens
  slug := lower(question_text);
  slug := regexp_replace(slug, '[àáâãäå]', 'a', 'gi');
  slug := regexp_replace(slug, '[èéêë]', 'e', 'gi');
  slug := regexp_replace(slug, '[ìíîï]', 'i', 'gi');
  slug := regexp_replace(slug, '[òóôõö]', 'o', 'gi');
  slug := regexp_replace(slug, '[ùúûü]', 'u', 'gi');
  slug := regexp_replace(slug, '[ç]', 'c', 'gi');
  slug := regexp_replace(slug, '[^a-z0-9\s-]', '', 'gi');
  slug := regexp_replace(slug, '\s+', '-', 'g');
  slug := regexp_replace(slug, '-+', '-', 'g');
  slug := trim(both '-' from slug);
  slug := left(slug, 100);
  RETURN slug;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;