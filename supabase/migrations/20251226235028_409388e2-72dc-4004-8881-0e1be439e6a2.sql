-- Add new columns to aeo_projects for the enhanced onboarding
ALTER TABLE public.aeo_projects 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS target_audiences TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS competitors TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS brand_color TEXT DEFAULT '#6366f1',
ADD COLUMN IF NOT EXISTS article_url_for_voice TEXT,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_analyzed BOOLEAN DEFAULT false;

-- Create index for faster lookup
CREATE INDEX IF NOT EXISTS idx_aeo_projects_user_onboarding ON public.aeo_projects(user_id, onboarding_completed);