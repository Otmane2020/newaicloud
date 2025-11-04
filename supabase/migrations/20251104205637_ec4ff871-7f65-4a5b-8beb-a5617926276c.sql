-- Add broken link detection columns to blog_netlinking table
ALTER TABLE public.blog_netlinking
ADD COLUMN IF NOT EXISTS is_broken boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_checked_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS http_status_code integer,
ADD COLUMN IF NOT EXISTS error_message text,
ADD COLUMN IF NOT EXISTS broken_since timestamp with time zone;

-- Add index for faster queries on broken links
CREATE INDEX IF NOT EXISTS idx_blog_netlinking_broken ON public.blog_netlinking(user_id, is_broken) WHERE is_broken = true;
CREATE INDEX IF NOT EXISTS idx_blog_netlinking_last_checked ON public.blog_netlinking(user_id, last_checked_at);