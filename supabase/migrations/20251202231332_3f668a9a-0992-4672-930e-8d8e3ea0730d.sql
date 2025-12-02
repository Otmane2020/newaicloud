-- Create creative_history table for storing generated images
CREATE TABLE public.creative_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  store_id UUID REFERENCES public.shopify_connections(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.shopify_products(id) ON DELETE SET NULL,
  product_title TEXT,
  template_id TEXT NOT NULL,
  template_name TEXT,
  image_url TEXT NOT NULL,
  image_format TEXT DEFAULT 'png',
  generation_mode TEXT DEFAULT 'showcase',
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.creative_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own creative history"
ON public.creative_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own creative history"
ON public.creative_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own creative history"
ON public.creative_history FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_creative_history_user_id ON public.creative_history(user_id);
CREATE INDEX idx_creative_history_store_id ON public.creative_history(store_id);
CREATE INDEX idx_creative_history_created_at ON public.creative_history(created_at DESC);