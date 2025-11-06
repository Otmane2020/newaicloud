-- Add Google Ads and Google Merchant columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS google_ads_oauth_token TEXT,
ADD COLUMN IF NOT EXISTS google_ads_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS google_ads_token_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS google_ads_email TEXT,
ADD COLUMN IF NOT EXISTS google_ads_customer_id TEXT,
ADD COLUMN IF NOT EXISTS google_merchant_account_id TEXT;