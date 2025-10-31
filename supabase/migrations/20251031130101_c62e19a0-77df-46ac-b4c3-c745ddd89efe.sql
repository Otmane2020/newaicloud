-- Add highlights field to ads_campaigns table
ALTER TABLE ads_campaigns
ADD COLUMN IF NOT EXISTS highlights jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN ads_campaigns.highlights IS 'Array of highlight objects with text property for showcasing key features (e.g., Google reviews, showroom size, delivery time, quality certifications)';

-- Add store summary field for store type campaigns
ALTER TABLE ads_campaigns
ADD COLUMN IF NOT EXISTS store_summary text;

COMMENT ON COLUMN ads_campaigns.store_summary IS 'AI-generated summary of store information for store-type campaigns';