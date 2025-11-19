-- Create table for storing variant pricing analyses
CREATE TABLE IF NOT EXISTS public.variant_pricing_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id TEXT NOT NULL,
  product_id UUID NOT NULL,
  user_id UUID NOT NULL,
  market_price NUMERIC,
  smart_price NUMERIC,
  net_margin NUMERIC,
  net_margin_percentage NUMERIC,
  currency TEXT DEFAULT 'EUR',
  competitors JSONB DEFAULT '[]'::jsonb,
  ai_reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index on variant_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_variant_pricing_variant_id ON public.variant_pricing_analyses(variant_id);

-- Create index on product_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_variant_pricing_product_id ON public.variant_pricing_analyses(product_id);

-- Create index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_variant_pricing_user_id ON public.variant_pricing_analyses(user_id);

-- Enable RLS
ALTER TABLE public.variant_pricing_analyses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own variant analyses"
  ON public.variant_pricing_analyses
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own variant analyses"
  ON public.variant_pricing_analyses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own variant analyses"
  ON public.variant_pricing_analyses
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all variant analyses"
  ON public.variant_pricing_analyses
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_variant_pricing_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_variant_pricing_analyses_updated_at_trigger
  BEFORE UPDATE ON public.variant_pricing_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_variant_pricing_analyses_updated_at();