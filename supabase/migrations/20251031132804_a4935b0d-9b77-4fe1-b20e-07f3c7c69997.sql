-- Add landing_page_html column to store generated HTML code
ALTER TABLE public.ads_campaigns 
ADD COLUMN IF NOT EXISTS landing_page_html TEXT;