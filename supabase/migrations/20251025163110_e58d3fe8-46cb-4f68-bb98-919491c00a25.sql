-- Add encryption fields to shopify_connections table
ALTER TABLE public.shopify_connections 
ADD COLUMN IF NOT EXISTS encrypted_token TEXT,
ADD COLUMN IF NOT EXISTS token_iv TEXT,
ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT false;

-- Create index for faster encrypted token lookups
CREATE INDEX IF NOT EXISTS idx_shopify_connections_encrypted 
ON public.shopify_connections(user_id, is_encrypted) 
WHERE is_encrypted = true;

COMMENT ON COLUMN public.shopify_connections.encrypted_token IS 'AES-256-GCM encrypted Shopify access token (base64 encoded)';
COMMENT ON COLUMN public.shopify_connections.token_iv IS 'Initialization vector for token encryption (base64 encoded)';
COMMENT ON COLUMN public.shopify_connections.is_encrypted IS 'Flag indicating whether the token is encrypted';
