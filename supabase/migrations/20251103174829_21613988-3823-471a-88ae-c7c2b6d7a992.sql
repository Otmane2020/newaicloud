-- Add shipping_cost column to shopify_products table
ALTER TABLE shopify_products 
ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC;