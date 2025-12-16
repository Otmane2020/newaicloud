-- Drop the existing constraint and recreate with 'read' included
ALTER TABLE admin_emails DROP CONSTRAINT IF EXISTS admin_emails_status_check;

ALTER TABLE admin_emails ADD CONSTRAINT admin_emails_status_check 
  CHECK (status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text, 'received'::text, 'read'::text]));