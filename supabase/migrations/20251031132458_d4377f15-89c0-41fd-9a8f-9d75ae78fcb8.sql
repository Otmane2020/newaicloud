-- Add Shopify page tracking columns to ads_campaigns
ALTER TABLE public.ads_campaigns 
ADD COLUMN IF NOT EXISTS shopify_page_url TEXT,
ADD COLUMN IF NOT EXISTS shopify_page_id TEXT;