-- Create social_campaigns table for scheduled posting
CREATE TABLE public.social_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  store_id UUID REFERENCES public.shopify_connections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  frequency TEXT NOT NULL DEFAULT 'daily', -- daily, weekly, monthly
  execution_hour INTEGER DEFAULT 12,
  channels TEXT[] DEFAULT ARRAY['facebook', 'instagram'],
  content_type TEXT NOT NULL DEFAULT 'products', -- products, collections, articles
  product_ids TEXT[],
  collection_ids TEXT[],
  template_style TEXT NOT NULL DEFAULT 'overlay', -- simple, overlay, carousel
  include_logo BOOLEAN DEFAULT true,
  include_link BOOLEAN DEFAULT true,
  custom_prompt TEXT,
  posts_generated INTEGER DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create social_posts table for individual posts
CREATE TABLE public.social_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  store_id UUID REFERENCES public.shopify_connections(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.social_campaigns(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, scheduled, published, failed
  channels TEXT[] DEFAULT ARRAY['facebook'],
  content_type TEXT NOT NULL DEFAULT 'product', -- product, collection, article
  product_id UUID REFERENCES public.shopify_products(id) ON DELETE SET NULL,
  collection_id UUID REFERENCES public.shopify_collections(id) ON DELETE SET NULL,
  article_id UUID REFERENCES public.blog_articles(id) ON DELETE SET NULL,
  caption TEXT,
  image_url TEXT,
  carousel_images TEXT[],
  template_style TEXT DEFAULT 'simple',
  link_url TEXT,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  facebook_post_id TEXT,
  instagram_post_id TEXT,
  error_message TEXT,
  credits_consumed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create social_settings table for logo and preferences
CREATE TABLE public.social_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  logo_url TEXT,
  default_template_style TEXT DEFAULT 'overlay',
  auto_post_articles BOOLEAN DEFAULT false,
  default_channels TEXT[] DEFAULT ARRAY['facebook', 'instagram'],
  brand_color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.social_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for social_campaigns
CREATE POLICY "Users can view their own social campaigns"
ON public.social_campaigns FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own social campaigns"
ON public.social_campaigns FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own social campaigns"
ON public.social_campaigns FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own social campaigns"
ON public.social_campaigns FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for social_posts
CREATE POLICY "Users can view their own social posts"
ON public.social_posts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own social posts"
ON public.social_posts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own social posts"
ON public.social_posts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own social posts"
ON public.social_posts FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for social_settings
CREATE POLICY "Users can view their own social settings"
ON public.social_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own social settings"
ON public.social_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own social settings"
ON public.social_settings FOR UPDATE
USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_social_campaigns_updated_at
BEFORE UPDATE ON public.social_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_social_posts_updated_at
BEFORE UPDATE ON public.social_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_social_settings_updated_at
BEFORE UPDATE ON public.social_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();