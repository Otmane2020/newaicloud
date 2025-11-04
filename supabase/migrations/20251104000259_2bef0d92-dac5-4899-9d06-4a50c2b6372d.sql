-- Add pricing analysis columns to shopify_products table
ALTER TABLE public.shopify_products 
ADD COLUMN IF NOT EXISTS market_price NUMERIC,
ADD COLUMN IF NOT EXISTS smart_price NUMERIC,
ADD COLUMN IF NOT EXISTS ai_reasoning TEXT,
ADD COLUMN IF NOT EXISTS competitors JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS last_pricing_analysis TIMESTAMPTZ;

-- Add comment for clarity
COMMENT ON COLUMN public.shopify_products.market_price IS 'Prix moyen du marché détecté par l''IA';
COMMENT ON COLUMN public.shopify_products.smart_price IS 'Prix optimal suggéré par l''IA';
COMMENT ON COLUMN public.shopify_products.ai_reasoning IS 'Raisonnement de l''IA pour le prix suggéré';
COMMENT ON COLUMN public.shopify_products.competitors IS 'Liste des prix concurrents trouvés';
COMMENT ON COLUMN public.shopify_products.last_pricing_analysis IS 'Date de la dernière analyse de prix IA';