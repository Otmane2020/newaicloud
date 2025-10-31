-- Create unified content_images table for all image types
CREATE TABLE IF NOT EXISTS content_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES shopify_connections(id) ON DELETE CASCADE,
  
  -- Content source
  content_type TEXT NOT NULL CHECK (content_type IN ('product', 'collection', 'page', 'article')),
  content_id UUID NOT NULL,
  
  -- Image data
  src TEXT NOT NULL,
  alt_text TEXT,
  shopify_image_id BIGINT,
  position INTEGER DEFAULT 0,
  width INTEGER,
  height INTEGER,
  
  -- Optimization tracking
  optimization_count INTEGER DEFAULT 0,
  last_optimization_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  UNIQUE(content_type, content_id, src)
);

-- Create indexes
CREATE INDEX idx_content_images_user ON content_images(user_id);
CREATE INDEX idx_content_images_store ON content_images(store_id);
CREATE INDEX idx_content_images_content ON content_images(content_type, content_id);
CREATE INDEX idx_content_images_alt ON content_images(alt_text) WHERE alt_text IS NULL;

-- Enable RLS
ALTER TABLE content_images ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own content images"
  ON content_images FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own content images"
  ON content_images FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own content images"
  ON content_images FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own content images"
  ON content_images FOR DELETE
  USING (auth.uid() = user_id);

-- Create shopify_collections table if not exists
CREATE TABLE IF NOT EXISTS shopify_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES shopify_connections(id) ON DELETE CASCADE,
  
  shopify_collection_id BIGINT UNIQUE,
  title TEXT NOT NULL,
  handle TEXT,
  body_html TEXT,
  image_url TEXT,
  image_alt TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_shopify_collections_user ON shopify_collections(user_id);
CREATE INDEX idx_shopify_collections_store ON shopify_collections(store_id);

ALTER TABLE shopify_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own collections"
  ON shopify_collections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own collections"
  ON shopify_collections FOR ALL
  USING (auth.uid() = user_id);