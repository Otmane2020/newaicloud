-- Add store_id column to shopify_sync_settings
ALTER TABLE shopify_sync_settings
  ADD COLUMN IF NOT EXISTS store_id uuid;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_shopify_sync_settings_user_store
  ON shopify_sync_settings (user_id, store_id);

-- Backfill store_id from sync_history for existing records
UPDATE shopify_sync_settings s
SET store_id = h.store_id
FROM (
  SELECT DISTINCT ON (user_id) user_id, store_id
  FROM sync_history
  WHERE store_id IS NOT NULL
  ORDER BY user_id, started_at DESC
) h
WHERE s.user_id = h.user_id
  AND s.store_id IS NULL;

-- For any remaining NULL store_id, link to first connection
UPDATE shopify_sync_settings s
SET store_id = c.id
FROM (
  SELECT DISTINCT ON (user_id) user_id, id
  FROM shopify_connections
  ORDER BY user_id, created_at ASC
) c
WHERE s.user_id = c.user_id
  AND s.store_id IS NULL;

-- Add unique constraint to prevent duplicates per store
ALTER TABLE shopify_sync_settings
ADD CONSTRAINT shopify_sync_settings_user_store_unique
UNIQUE (user_id, store_id);