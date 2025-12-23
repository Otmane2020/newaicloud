-- Add metadata column to shopify_pending_connections for storing host and app_id
ALTER TABLE public.shopify_pending_connections 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.shopify_pending_connections.metadata IS 'Stores additional OAuth data like host parameter and app identifier';