-- Add Vision AI tracking columns to shopify_products
ALTER TABLE shopify_products 
ADD COLUMN IF NOT EXISTS vision_analyzed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS vision_attributes JSONB,
ADD COLUMN IF NOT EXISTS vision_confidence FLOAT;

-- Add Vision AI tracking columns to blog_articles
ALTER TABLE blog_articles 
ADD COLUMN IF NOT EXISTS vision_analyzed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS vision_attributes JSONB,
ADD COLUMN IF NOT EXISTS vision_confidence FLOAT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_vision_analyzed ON shopify_products(vision_analyzed);
CREATE INDEX IF NOT EXISTS idx_articles_vision_analyzed ON blog_articles(vision_analyzed);

-- Add comments
COMMENT ON COLUMN shopify_products.vision_analyzed IS 'Indicates if Gemini Vision AI analyzed the product image';
COMMENT ON COLUMN shopify_products.vision_attributes IS 'Visual attributes extracted by Vision AI (colors, materials, style, etc.)';
COMMENT ON COLUMN shopify_products.vision_confidence IS 'Confidence score from Vision AI analysis (0-1)';

COMMENT ON COLUMN blog_articles.vision_analyzed IS 'Indicates if Gemini Vision AI analyzed the article cover image';
COMMENT ON COLUMN blog_articles.vision_attributes IS 'Visual attributes extracted by Vision AI';
COMMENT ON COLUMN blog_articles.vision_confidence IS 'Confidence score from Vision AI analysis (0-1)';