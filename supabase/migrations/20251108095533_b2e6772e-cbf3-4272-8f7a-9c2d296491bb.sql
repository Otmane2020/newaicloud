-- Add folder column to admin_emails table
ALTER TABLE admin_emails ADD COLUMN IF NOT EXISTS folder TEXT DEFAULT 'inbox';

-- Create index for faster folder queries
CREATE INDEX IF NOT EXISTS idx_admin_emails_folder ON admin_emails(folder);

-- Update existing emails: outgoing emails go to 'sent', incoming to 'inbox'
UPDATE admin_emails 
SET folder = CASE 
  WHEN direction = 'outgoing' THEN 'sent'
  WHEN direction = 'incoming' THEN 'inbox'
  ELSE 'inbox'
END
WHERE folder IS NULL OR folder = 'inbox';