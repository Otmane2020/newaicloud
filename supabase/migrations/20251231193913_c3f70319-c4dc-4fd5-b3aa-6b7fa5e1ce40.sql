-- Update default import_frequency from 'manual' to 'hourly'
ALTER TABLE public.shopify_sync_settings 
ALTER COLUMN import_frequency SET DEFAULT 'hourly';

-- Update existing records that have 'manual' to 'hourly'
UPDATE public.shopify_sync_settings 
SET import_frequency = 'hourly' 
WHERE import_frequency = 'manual';