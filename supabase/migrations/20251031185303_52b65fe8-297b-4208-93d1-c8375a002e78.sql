-- Add unique constraint to blog_netlinking table
ALTER TABLE blog_netlinking 
ADD CONSTRAINT blog_netlinking_user_article_url_unique 
UNIQUE (user_id, article_id, target_url);

-- Add seo_score column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='blog_netlinking' AND column_name='seo_score'
  ) THEN
    ALTER TABLE blog_netlinking ADD COLUMN seo_score INTEGER DEFAULT 50;
  END IF;
END $$;

-- Add target_type column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='blog_netlinking' AND column_name='target_type'
  ) THEN
    ALTER TABLE blog_netlinking ADD COLUMN target_type TEXT;
  END IF;
END $$;