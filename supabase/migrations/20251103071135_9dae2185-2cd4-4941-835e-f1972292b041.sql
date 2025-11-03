-- Add store_language column to shopify_connections
ALTER TABLE shopify_connections 
ADD COLUMN IF NOT EXISTS store_language VARCHAR(2) DEFAULT 'fr';

-- Create an index for language queries
CREATE INDEX IF NOT EXISTS idx_shopify_connections_language 
ON shopify_connections(store_language);

-- Add comment
COMMENT ON COLUMN shopify_connections.store_language IS 
'ISO 639-1 language code (fr, en, de, es, it, etc.) for SEO content generation';