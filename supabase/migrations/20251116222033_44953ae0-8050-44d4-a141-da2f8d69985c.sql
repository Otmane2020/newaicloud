-- Add new score columns for the 7-category SEO audit system
ALTER TABLE seo_audit_reports 
ADD COLUMN IF NOT EXISTS pages_score integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS articles_score integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS tags_score integer DEFAULT 0;