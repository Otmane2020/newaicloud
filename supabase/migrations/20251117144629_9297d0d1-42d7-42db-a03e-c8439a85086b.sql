-- Add article tracking to blog_opportunities
ALTER TABLE blog_opportunities
ADD COLUMN IF NOT EXISTS article_id UUID REFERENCES blog_articles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_blog_opportunities_article_id ON blog_opportunities(article_id);

-- Add comment for documentation
COMMENT ON COLUMN blog_opportunities.article_id IS 'Reference to the generated article if created from this opportunity';
COMMENT ON COLUMN blog_opportunities.generated_at IS 'Timestamp when the article was generated from this opportunity';