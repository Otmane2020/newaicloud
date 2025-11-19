-- Add columns to track optimization consumption by type
ALTER TABLE usage_tracking 
ADD COLUMN IF NOT EXISTS optimizations_consumed_for_articles INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS optimizations_consumed_for_campaigns INTEGER DEFAULT 0;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_usage_tracking_seller_month ON usage_tracking(seller_id, month);

-- Add comments for documentation
COMMENT ON COLUMN usage_tracking.optimizations_consumed_for_articles IS 'Number of optimizations consumed for article creation (10 per article)';
COMMENT ON COLUMN usage_tracking.optimizations_consumed_for_campaigns IS 'Number of optimizations consumed for campaign creation (10/40/300 based on frequency)';