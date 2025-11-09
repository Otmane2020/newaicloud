-- Create product_landing_pages table
CREATE TABLE IF NOT EXISTS public.product_landing_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.shopify_products(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL,
  html_content TEXT NOT NULL,
  config JSONB DEFAULT '{}'::jsonb,
  shopify_page_id TEXT,
  shopify_page_url TEXT,
  last_synced_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_landing_pages_product_id ON public.product_landing_pages(product_id);
CREATE INDEX IF NOT EXISTS idx_product_landing_pages_seller_id ON public.product_landing_pages(seller_id);
CREATE INDEX IF NOT EXISTS idx_product_landing_pages_product_active ON public.product_landing_pages(product_id, is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.product_landing_pages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own landing pages"
  ON public.product_landing_pages
  FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Users can create landing pages for their products"
  ON public.product_landing_pages
  FOR INSERT
  WITH CHECK (
    auth.uid() = seller_id AND
    EXISTS (
      SELECT 1 FROM public.shopify_products
      WHERE id = product_id AND seller_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own landing pages"
  ON public.product_landing_pages
  FOR UPDATE
  USING (auth.uid() = seller_id);

CREATE POLICY "Users can delete their own landing pages"
  ON public.product_landing_pages
  FOR DELETE
  USING (auth.uid() = seller_id);

-- Trigger to update updated_at
CREATE TRIGGER update_product_landing_pages_updated_at
  BEFORE UPDATE ON public.product_landing_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();