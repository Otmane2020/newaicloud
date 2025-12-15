-- Add has_landing_page column to shopify_products table
ALTER TABLE public.shopify_products 
ADD COLUMN IF NOT EXISTS has_landing_page boolean DEFAULT false;