-- Table for tracking Shopify billing subscriptions in pending state
CREATE TABLE IF NOT EXISTS public.shopify_pending_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_domain TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  shopify_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  activated_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, shop_domain)
);

-- Add billing_provider and shopify_subscription_id to profiles if not exists
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'billing_provider') THEN
    ALTER TABLE public.profiles ADD COLUMN billing_provider TEXT DEFAULT 'stripe';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'shopify_subscription_id') THEN
    ALTER TABLE public.profiles ADD COLUMN shopify_subscription_id TEXT;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.shopify_pending_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own pending subscriptions"
ON public.shopify_pending_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pending subscriptions"
ON public.shopify_pending_subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending subscriptions"
ON public.shopify_pending_subscriptions
FOR UPDATE
USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_shopify_pending_subs_user ON public.shopify_pending_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_shopify_pending_subs_shop ON public.shopify_pending_subscriptions(shop_domain);
CREATE INDEX IF NOT EXISTS idx_shopify_pending_subs_status ON public.shopify_pending_subscriptions(status);