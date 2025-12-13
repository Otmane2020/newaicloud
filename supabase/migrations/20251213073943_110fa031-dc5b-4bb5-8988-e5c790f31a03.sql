-- Add email tracking columns to potential_customers if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'potential_customers' AND column_name = 'first_email_sent_at') THEN
    ALTER TABLE public.potential_customers ADD COLUMN first_email_sent_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'potential_customers' AND column_name = 'second_email_sent_at') THEN
    ALTER TABLE public.potential_customers ADD COLUMN second_email_sent_at TIMESTAMPTZ;
  END IF;
END $$;