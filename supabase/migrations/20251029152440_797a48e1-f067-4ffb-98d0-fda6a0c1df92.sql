-- Add unique constraint on shopify_page_id for upsert operations
-- This allows ON CONFLICT to work properly when importing pages

ALTER TABLE public.shopify_pages
ADD CONSTRAINT shopify_pages_shopify_page_id_key 
UNIQUE (shopify_page_id);