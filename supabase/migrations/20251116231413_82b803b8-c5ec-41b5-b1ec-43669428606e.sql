-- Phase 4: Add columns for specs source tracking
ALTER TABLE shopify_products 
ADD COLUMN IF NOT EXISTS specs_source TEXT DEFAULT 'estimated',
ADD COLUMN IF NOT EXISTS specs_confidence NUMERIC(3,2) DEFAULT 0.5,
ADD COLUMN IF NOT EXISTS serp_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS serp_data JSONB;

COMMENT ON COLUMN shopify_products.specs_source IS 'Source of technical specifications: estimated, image, or serp';
COMMENT ON COLUMN shopify_products.specs_confidence IS 'Confidence score for specifications (0-1)';
COMMENT ON COLUMN shopify_products.serp_verified IS 'Whether specifications have been verified via SERP search';
COMMENT ON COLUMN shopify_products.serp_data IS 'Raw SERP data for reference';