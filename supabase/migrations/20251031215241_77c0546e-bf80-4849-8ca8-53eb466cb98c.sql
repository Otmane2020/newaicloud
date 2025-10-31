-- Create homepage_seo table to store homepage SEO data and audit results
CREATE TABLE IF NOT EXISTS public.homepage_seo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seo_title TEXT,
  seo_description TEXT,
  last_audit JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT homepage_seo_user_id_unique UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.homepage_seo ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own homepage SEO"
  ON public.homepage_seo
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own homepage SEO"
  ON public.homepage_seo
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own homepage SEO"
  ON public.homepage_seo
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own homepage SEO"
  ON public.homepage_seo
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create homepage_images table for homepage-specific images
CREATE TABLE IF NOT EXISTS public.homepage_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.shopify_connections(id) ON DELETE CASCADE,
  src TEXT NOT NULL,
  alt_text TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for homepage_images
ALTER TABLE public.homepage_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies for homepage_images
CREATE POLICY "Users can view their own homepage images"
  ON public.homepage_images
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own homepage images"
  ON public.homepage_images
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own homepage images"
  ON public.homepage_images
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own homepage images"
  ON public.homepage_images
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_homepage_seo_user_id ON public.homepage_seo(user_id);
CREATE INDEX IF NOT EXISTS idx_homepage_images_user_id ON public.homepage_images(user_id);
CREATE INDEX IF NOT EXISTS idx_homepage_images_store_id ON public.homepage_images(store_id);