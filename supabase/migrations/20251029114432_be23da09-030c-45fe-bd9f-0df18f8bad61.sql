-- Add api_key column to shopify_connections table
ALTER TABLE shopify_connections 
ADD COLUMN api_key TEXT;

-- Add comments for clarity
COMMENT ON COLUMN shopify_connections.api_key IS 'Shopify API Key (32 caractères hexadécimaux pour connexions manuelles)';
COMMENT ON COLUMN shopify_connections.access_token IS 'Shopify API Secret (commence par shpss_ ou shpat_) ou OAuth access token';