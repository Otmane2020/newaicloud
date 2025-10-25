-- Create usage_tracking table
CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  products_count INTEGER DEFAULT 0,
  optimizations_count INTEGER DEFAULT 0,
  articles_count INTEGER DEFAULT 0,
  chat_responses_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(seller_id, month)
);

-- Enable RLS
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own usage"
  ON public.usage_tracking
  FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Users can insert their own usage"
  ON public.usage_tracking
  FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Users can update their own usage"
  ON public.usage_tracking
  FOR UPDATE
  USING (auth.uid() = seller_id);

-- Create function to update usage tracking
CREATE OR REPLACE FUNCTION public.increment_usage(
  p_seller_id UUID,
  p_field TEXT,
  p_increment INTEGER DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month DATE;
BEGIN
  v_month := DATE_TRUNC('month', CURRENT_DATE);
  
  -- Insert or update usage tracking
  INSERT INTO public.usage_tracking (seller_id, month, products_count, optimizations_count, articles_count, chat_responses_count)
  VALUES (
    p_seller_id,
    v_month,
    CASE WHEN p_field = 'products_count' THEN p_increment ELSE 0 END,
    CASE WHEN p_field = 'optimizations_count' THEN p_increment ELSE 0 END,
    CASE WHEN p_field = 'articles_count' THEN p_increment ELSE 0 END,
    CASE WHEN p_field = 'chat_responses_count' THEN p_increment ELSE 0 END
  )
  ON CONFLICT (seller_id, month)
  DO UPDATE SET
    products_count = CASE 
      WHEN p_field = 'products_count' THEN usage_tracking.products_count + p_increment
      ELSE usage_tracking.products_count
    END,
    optimizations_count = CASE 
      WHEN p_field = 'optimizations_count' THEN usage_tracking.optimizations_count + p_increment
      ELSE usage_tracking.optimizations_count
    END,
    articles_count = CASE 
      WHEN p_field = 'articles_count' THEN usage_tracking.articles_count + p_increment
      ELSE usage_tracking.articles_count
    END,
    chat_responses_count = CASE 
      WHEN p_field = 'chat_responses_count' THEN usage_tracking.chat_responses_count + p_increment
      ELSE usage_tracking.chat_responses_count
    END,
    updated_at = now();
END;
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_usage_tracking_updated_at
  BEFORE UPDATE ON public.usage_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_usage_tracking_seller_month ON public.usage_tracking(seller_id, month);