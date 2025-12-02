-- Create table for Facebook page connections
CREATE TABLE IF NOT EXISTS public.facebook_page_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.shopify_connections(id) ON DELETE CASCADE,
  page_id TEXT NOT NULL,
  page_name TEXT NOT NULL,
  page_access_token TEXT NOT NULL,
  auto_share_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, page_id)
);

-- Enable RLS
ALTER TABLE public.facebook_page_connections ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own Facebook pages"
  ON public.facebook_page_connections
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Facebook pages"
  ON public.facebook_page_connections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Facebook pages"
  ON public.facebook_page_connections
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Facebook pages"
  ON public.facebook_page_connections
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add index
CREATE INDEX idx_facebook_page_connections_user_id ON public.facebook_page_connections(user_id);
CREATE INDEX idx_facebook_page_connections_store_id ON public.facebook_page_connections(store_id);