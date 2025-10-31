-- Create ads_campaigns table
CREATE TABLE public.ads_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('product', 'collection', 'store')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused')),
  landing_page_url TEXT,
  headline TEXT,
  subheadline TEXT,
  cta_text TEXT,
  products_count INTEGER DEFAULT 0,
  collections_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ads_campaigns ENABLE ROW LEVEL SECURITY;

-- Create policies for ads_campaigns
CREATE POLICY "Users can view their own campaigns"
ON public.ads_campaigns
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own campaigns"
ON public.ads_campaigns
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns"
ON public.ads_campaigns
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaigns"
ON public.ads_campaigns
FOR DELETE
USING (auth.uid() = user_id);

-- Create ads_campaign_collections table
CREATE TABLE public.ads_campaign_collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.ads_campaigns(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES public.shopify_collections(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, collection_id)
);

-- Enable Row Level Security
ALTER TABLE public.ads_campaign_collections ENABLE ROW LEVEL SECURITY;

-- Create policies for ads_campaign_collections
CREATE POLICY "Users can view their campaign collections"
ON public.ads_campaign_collections
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.ads_campaigns
    WHERE ads_campaigns.id = ads_campaign_collections.campaign_id
    AND ads_campaigns.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create campaign collections"
ON public.ads_campaign_collections
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ads_campaigns
    WHERE ads_campaigns.id = ads_campaign_collections.campaign_id
    AND ads_campaigns.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete campaign collections"
ON public.ads_campaign_collections
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.ads_campaigns
    WHERE ads_campaigns.id = ads_campaign_collections.campaign_id
    AND ads_campaigns.user_id = auth.uid()
  )
);

-- Create ads_campaign_products table
CREATE TABLE public.ads_campaign_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.ads_campaigns(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.shopify_products(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, product_id)
);

-- Enable Row Level Security
ALTER TABLE public.ads_campaign_products ENABLE ROW LEVEL SECURITY;

-- Create policies for ads_campaign_products
CREATE POLICY "Users can view their campaign products"
ON public.ads_campaign_products
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.ads_campaigns
    WHERE ads_campaigns.id = ads_campaign_products.campaign_id
    AND ads_campaigns.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create campaign products"
ON public.ads_campaign_products
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ads_campaigns
    WHERE ads_campaigns.id = ads_campaign_products.campaign_id
    AND ads_campaigns.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete campaign products"
ON public.ads_campaign_products
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.ads_campaigns
    WHERE ads_campaigns.id = ads_campaign_products.campaign_id
    AND ads_campaigns.user_id = auth.uid()
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_ads_campaigns_updated_at
BEFORE UPDATE ON public.ads_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();