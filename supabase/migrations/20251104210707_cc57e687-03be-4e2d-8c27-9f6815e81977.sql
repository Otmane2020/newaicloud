-- Add cache columns to blog_opportunities for performance
ALTER TABLE public.blog_opportunities
ADD COLUMN IF NOT EXISTS cache_expires_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS is_cached boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_refreshed_at timestamp with time zone;

-- Add index for cache queries
CREATE INDEX IF NOT EXISTS idx_blog_opportunities_cache ON public.blog_opportunities(user_id, is_cached, cache_expires_at) WHERE is_cached = true;