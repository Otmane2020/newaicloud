-- Create shopify_pages table
CREATE TABLE IF NOT EXISTS public.shopify_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.shopify_connections(id) ON DELETE CASCADE,
  shopify_page_id BIGINT,
  title TEXT NOT NULL,
  handle TEXT,
  body_html TEXT,
  seo_title TEXT,
  seo_description TEXT,
  template_suffix TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  optimized BOOLEAN DEFAULT FALSE,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.shopify_pages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own pages"
  ON public.shopify_pages
  FOR ALL
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shopify_pages_user_id ON public.shopify_pages(user_id);
CREATE INDEX IF NOT EXISTS idx_shopify_pages_store_id ON public.shopify_pages(store_id);
CREATE INDEX IF NOT EXISTS idx_shopify_pages_shopify_page_id ON public.shopify_pages(shopify_page_id);

-- Add trigger for updated_at
CREATE TRIGGER update_shopify_pages_updated_at
  BEFORE UPDATE ON public.shopify_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();