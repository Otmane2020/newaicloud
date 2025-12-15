-- Add host column to oauth_states for embedded app support
ALTER TABLE public.oauth_states 
ADD COLUMN IF NOT EXISTS host TEXT;