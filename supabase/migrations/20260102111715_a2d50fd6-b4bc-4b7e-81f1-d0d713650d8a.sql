-- Add synced_at column to ai_answers table for tracking article synchronization
ALTER TABLE ai_answers ADD COLUMN IF NOT EXISTS synced_at timestamptz;