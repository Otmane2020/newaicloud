-- Add missing shopify_image_id column to shopify_collections
ALTER TABLE shopify_collections 
ADD COLUMN IF NOT EXISTS shopify_image_id TEXT;

-- Mark the current stuck sync as failed
UPDATE sync_history 
SET status = 'failed',
    completed_at = NOW(),
    error_message = 'Sync interrompu - colonne shopify_image_id manquante',
    duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000
WHERE status = 'running' 
  AND started_at < NOW() - INTERVAL '5 minutes';