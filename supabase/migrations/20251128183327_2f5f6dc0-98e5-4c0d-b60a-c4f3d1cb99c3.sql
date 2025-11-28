-- Add status column to blog_opportunities table
ALTER TABLE public.blog_opportunities 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Create index for faster filtering by status
CREATE INDEX IF NOT EXISTS idx_blog_opportunities_status ON public.blog_opportunities(status);