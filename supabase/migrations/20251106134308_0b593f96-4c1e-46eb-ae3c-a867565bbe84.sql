-- Create product_image_history table for version tracking
CREATE TABLE IF NOT EXISTS product_image_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES shopify_products(id) ON DELETE CASCADE,
  image_id UUID NOT NULL REFERENCES product_images(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Type d'optimisation
  optimization_type TEXT NOT NULL CHECK (optimization_type IN ('white_background', 'ai_background', 'title_description')),
  
  -- Versions d'images
  original_url TEXT NOT NULL,
  optimized_url TEXT NOT NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  
  -- Métadonnées
  ai_model TEXT,
  ai_prompt TEXT,
  resolution TEXT,
  file_size_kb INTEGER,
  
  -- Qualité et status
  quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
  is_current BOOLEAN DEFAULT true,
  is_downloaded BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  restored_at TIMESTAMPTZ,
  
  UNIQUE(image_id, version_number)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_image_history_product ON product_image_history(product_id);
CREATE INDEX IF NOT EXISTS idx_image_history_image ON product_image_history(image_id);
CREATE INDEX IF NOT EXISTS idx_image_history_user ON product_image_history(user_id);
CREATE INDEX IF NOT EXISTS idx_image_history_current ON product_image_history(is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_image_history_type ON product_image_history(optimization_type);

-- Enable RLS
ALTER TABLE product_image_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own image history"
  ON product_image_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own image history"
  ON product_image_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own image history"
  ON product_image_history FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own image history"
  ON product_image_history FOR DELETE
  USING (auth.uid() = user_id);

-- Function to get next version number for an image
CREATE OR REPLACE FUNCTION get_next_image_version(p_image_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE(
    (SELECT MAX(version_number) + 1 FROM product_image_history WHERE image_id = p_image_id),
    1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;