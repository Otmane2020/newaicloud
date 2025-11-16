-- Add campaign_id column to blog_articles table
ALTER TABLE blog_articles 
ADD COLUMN campaign_id uuid REFERENCES blog_campaigns(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_blog_articles_campaign_id ON blog_articles(campaign_id);

-- Add articles_generated counter to blog_campaigns
ALTER TABLE blog_campaigns 
ADD COLUMN articles_generated integer DEFAULT 0;

-- Add RLS policy for campaign articles
CREATE POLICY "Users can view articles from their campaigns"
ON blog_articles FOR SELECT
USING (
  campaign_id IN (
    SELECT id FROM blog_campaigns WHERE user_id = auth.uid()
  )
);