-- Add missing columns for Google Shopping optimization
ALTER TABLE shopify_products
ADD COLUMN IF NOT EXISTS google_brand text,
ADD COLUMN IF NOT EXISTS optimized_title text,
ADD COLUMN IF NOT EXISTS optimized_description text;

-- Create table for merchant feed settings
CREATE TABLE IF NOT EXISTS public.merchant_feed_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_name text NOT NULL,
  auto_update_enabled boolean DEFAULT false,
  gtin_country_code text DEFAULT 'FR',
  last_feed_generated_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.merchant_feed_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for merchant_feed_settings
CREATE POLICY "Users can manage their own feed settings"
ON public.merchant_feed_settings
FOR ALL
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_merchant_feed_settings_updated_at
BEFORE UPDATE ON public.merchant_feed_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();