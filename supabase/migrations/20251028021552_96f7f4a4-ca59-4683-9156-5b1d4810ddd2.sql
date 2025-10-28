-- Add missing columns for OAuth support
ALTER TABLE shopify_connections 
ADD COLUMN IF NOT EXISTS store_name TEXT,
ADD COLUMN IF NOT EXISTS connection_type TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS connected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_shopify_connections_user_store 
ON shopify_connections(user_id, store_url);

-- Add unique constraint for preventing duplicate connections
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'shopify_connections_user_store_unique'
  ) THEN
    ALTER TABLE shopify_connections 
    ADD CONSTRAINT shopify_connections_user_store_unique 
    UNIQUE (user_id, store_url);
  END IF;
END $$;