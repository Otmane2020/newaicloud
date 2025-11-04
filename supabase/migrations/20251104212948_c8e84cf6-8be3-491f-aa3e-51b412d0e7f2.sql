-- Add collection filtering options to merchant_feed_settings
ALTER TABLE public.merchant_feed_settings
ADD COLUMN IF NOT EXISTS filter_mode TEXT DEFAULT 'all',
ADD COLUMN IF NOT EXISTS included_collections UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS excluded_collections UUID[] DEFAULT '{}';

COMMENT ON COLUMN public.merchant_feed_settings.filter_mode IS 'Mode de filtrage: all, include, exclude';
COMMENT ON COLUMN public.merchant_feed_settings.included_collections IS 'Collections à inclure dans le flux (mode include)';
COMMENT ON COLUMN public.merchant_feed_settings.excluded_collections IS 'Collections à exclure du flux (mode exclude)';