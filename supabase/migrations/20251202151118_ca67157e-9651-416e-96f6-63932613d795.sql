-- Add new columns to social_campaigns for enhanced functionality
ALTER TABLE public.social_campaigns 
ADD COLUMN IF NOT EXISTS posts_per_run integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS post_format text DEFAULT 'image' CHECK (post_format IN ('image', 'carousel', 'video', 'reel')),
ADD COLUMN IF NOT EXISTS music_track text,
ADD COLUMN IF NOT EXISTS voice_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_product_index integer DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN public.social_campaigns.posts_per_run IS 'Number of posts to generate per scheduled run';
COMMENT ON COLUMN public.social_campaigns.post_format IS 'Format: image, carousel, video, or reel';
COMMENT ON COLUMN public.social_campaigns.music_track IS 'Background music track for video/reel';
COMMENT ON COLUMN public.social_campaigns.voice_enabled IS 'Enable ElevenLabs voice for video';
COMMENT ON COLUMN public.social_campaigns.last_product_index IS 'Track which product was last used for rotation';