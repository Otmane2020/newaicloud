-- Add scheduled_date column to ai_answers for 30-day planning
ALTER TABLE ai_answers 
ADD COLUMN IF NOT EXISTS scheduled_date DATE DEFAULT CURRENT_DATE;

-- Create index for efficient querying by scheduled date
CREATE INDEX IF NOT EXISTS idx_ai_answers_scheduled_date 
ON ai_answers(user_id, platform, scheduled_date);

-- Update existing records to have today's date as scheduled_date
UPDATE ai_answers 
SET scheduled_date = CURRENT_DATE 
WHERE scheduled_date IS NULL;