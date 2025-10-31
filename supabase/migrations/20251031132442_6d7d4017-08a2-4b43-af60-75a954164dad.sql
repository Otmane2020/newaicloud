-- Add design_style column to ads_campaigns table
ALTER TABLE public.ads_campaigns 
ADD COLUMN IF NOT EXISTS design_style TEXT DEFAULT 'modern';