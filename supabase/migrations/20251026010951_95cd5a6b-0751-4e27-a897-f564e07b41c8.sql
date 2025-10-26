-- Add weight/mass fields to shopify_products for AI enrichment
ALTER TABLE shopify_products 
ADD COLUMN IF NOT EXISTS ai_weight NUMERIC,
ADD COLUMN IF NOT EXISTS ai_weight_unit TEXT,
ADD COLUMN IF NOT EXISTS ai_volume NUMERIC,
ADD COLUMN IF NOT EXISTS ai_volume_unit TEXT,
ADD COLUMN IF NOT EXISTS ai_package_dimensions TEXT,
ADD COLUMN IF NOT EXISTS ai_assembly_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_care_instructions TEXT;