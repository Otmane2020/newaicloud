-- Add unique index on shopify_connections to prevent duplicate active stores
DROP INDEX IF EXISTS idx_unique_active_store;
CREATE UNIQUE INDEX idx_unique_active_store ON shopify_connections (store_url) WHERE (is_active = true);