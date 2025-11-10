-- Add landing_page_html column to shopify_products table
ALTER TABLE public.shopify_products 
ADD COLUMN IF NOT EXISTS landing_page_html TEXT;