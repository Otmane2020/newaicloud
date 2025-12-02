-- Create table for Instagram account connections
CREATE TABLE IF NOT EXISTS public.instagram_account_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.shopify_connections(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  account_name TEXT NOT NULL,
  access_token TEXT NOT NULL,
  auto_share_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, account_id)
);

-- Enable RLS
ALTER TABLE public.instagram_account_connections ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own Instagram accounts"
  ON public.instagram_account_connections
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Instagram accounts"
  ON public.instagram_account_connections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Instagram accounts"
  ON public.instagram_account_connections
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Instagram accounts"
  ON public.instagram_account_connections
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add indexes
CREATE INDEX idx_instagram_account_connections_user_id ON public.instagram_account_connections(user_id);
CREATE INDEX idx_instagram_account_connections_store_id ON public.instagram_account_connections(store_id);