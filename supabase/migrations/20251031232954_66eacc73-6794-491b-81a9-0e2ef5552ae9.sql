-- Add missing columns to merchant_feed_settings table
ALTER TABLE merchant_feed_settings 
ADD COLUMN IF NOT EXISTS default_currency TEXT DEFAULT 'EUR',
ADD COLUMN IF NOT EXISTS default_condition TEXT DEFAULT 'new',
ADD COLUMN IF NOT EXISTS default_brand TEXT DEFAULT '';