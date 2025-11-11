-- Create landing_page_history table to store versions
CREATE TABLE IF NOT EXISTS public.landing_page_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.shopify_products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  landing_page_html TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_current BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE public.landing_page_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own landing page history"
ON public.landing_page_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own landing page history"
ON public.landing_page_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own landing page history"
ON public.landing_page_history
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_landing_page_history_product_id ON public.landing_page_history(product_id);
CREATE INDEX IF NOT EXISTS idx_landing_page_history_user_id ON public.landing_page_history(user_id);

-- Create function to auto-increment version number
CREATE OR REPLACE FUNCTION public.get_next_version_number(p_product_id UUID)
RETURNS INTEGER AS $$
DECLARE
  next_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO next_version
  FROM public.landing_page_history
  WHERE product_id = p_product_id;
  
  RETURN next_version;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;