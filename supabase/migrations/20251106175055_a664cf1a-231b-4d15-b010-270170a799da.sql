-- Add column to store Google Search Console email
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS google_console_email text;