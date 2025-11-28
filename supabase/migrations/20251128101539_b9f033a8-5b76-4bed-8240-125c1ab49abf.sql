-- Table pour stocker les résultats SERP des analyses de prix
CREATE TABLE IF NOT EXISTS public.price_scan_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.shopify_products(id) ON DELETE CASCADE,
  variant_id TEXT,
  user_id UUID NOT NULL,
  store_id UUID REFERENCES public.shopify_connections(id) ON DELETE CASCADE,
  
  -- Vision AI analysis
  vision_title TEXT,
  vision_brand TEXT,
  vision_category TEXT,
  vision_keywords TEXT[],
  vision_segment TEXT,
  
  -- Search query used
  search_query TEXT,
  
  -- Price statistics
  price_min NUMERIC(10,2),
  price_max NUMERIC(10,2),
  price_avg NUMERIC(10,2),
  price_median NUMERIC(10,2),
  currency TEXT DEFAULT 'EUR',
  
  -- Merchants (top 10)
  merchants JSONB DEFAULT '[]'::jsonb,
  
  -- Source counts
  sources_shopping INTEGER DEFAULT 0,
  sources_organic INTEGER DEFAULT 0,
  sources_images INTEGER DEFAULT 0,
  products_found INTEGER DEFAULT 0,
  
  -- Confidence and processing
  confidence NUMERIC(3,2),
  processing_time_ms INTEGER,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  image_url TEXT
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_price_scan_results_product ON public.price_scan_results(product_id);
CREATE INDEX IF NOT EXISTS idx_price_scan_results_user ON public.price_scan_results(user_id);
CREATE INDEX IF NOT EXISTS idx_price_scan_results_created ON public.price_scan_results(created_at DESC);

-- RLS
ALTER TABLE public.price_scan_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own scan results"
ON public.price_scan_results FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scan results"
ON public.price_scan_results FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scan results"
ON public.price_scan_results FOR DELETE
USING (auth.uid() = user_id);

COMMENT ON TABLE public.price_scan_results IS 'Stores SERP price scan results with merchant links and vision AI analysis';