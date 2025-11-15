-- Create google_product_taxonomy table
CREATE TABLE IF NOT EXISTS public.google_product_taxonomy (
  id BIGINT PRIMARY KEY,
  full_path TEXT NOT NULL,
  level1 TEXT,
  level2 TEXT,
  level3 TEXT,
  level4 TEXT,
  level5 TEXT,
  depth INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_google_taxonomy_level1 ON public.google_product_taxonomy(level1);
CREATE INDEX IF NOT EXISTS idx_google_taxonomy_full_path ON public.google_product_taxonomy USING gin(to_tsvector('english', full_path));

-- Enable RLS
ALTER TABLE public.google_product_taxonomy ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read taxonomy (it's public data)
CREATE POLICY "Anyone can view taxonomy"
  ON public.google_product_taxonomy
  FOR SELECT
  USING (true);

COMMENT ON TABLE public.google_product_taxonomy IS 'Google Product Taxonomy for automatic category classification';