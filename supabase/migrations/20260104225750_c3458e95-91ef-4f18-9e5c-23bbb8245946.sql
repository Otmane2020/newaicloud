-- Add app_id column to oauth_states table for multi-app support
ALTER TABLE public.oauth_states 
ADD COLUMN IF NOT EXISTS app_id TEXT DEFAULT 'newai';

-- Add comment for clarity
COMMENT ON COLUMN public.oauth_states.app_id IS 'Identifies which app initiated the OAuth flow (newai, ai-images, etc.)';