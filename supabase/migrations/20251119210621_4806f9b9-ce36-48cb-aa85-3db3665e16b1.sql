-- Add available_scopes column to shopify_connections to track API permissions
ALTER TABLE public.shopify_connections
ADD COLUMN IF NOT EXISTS available_scopes jsonb DEFAULT '{
  "products": true,
  "collections": true,
  "pages": true,
  "articles": true,
  "images": true
}'::jsonb;

COMMENT ON COLUMN public.shopify_connections.available_scopes IS 'Tracks which Shopify API scopes are available for this connection';
