-- Table for AI Images Shopify connections (separate from main app)
CREATE TABLE public.ai_images_shopify_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  shop_domain TEXT NOT NULL,
  shop_name TEXT,
  access_token TEXT NOT NULL,
  scope TEXT,
  installed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(shop_domain)
);

-- Enable RLS
ALTER TABLE public.ai_images_shopify_connections ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own AI images connections"
  ON public.ai_images_shopify_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI images connections"
  ON public.ai_images_shopify_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage AI images connections"
  ON public.ai_images_shopify_connections FOR ALL
  USING (true)
  WITH CHECK (true);

-- Table for AI Images credits (pay-as-you-go)
CREATE TABLE public.ai_images_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  credits_balance INTEGER NOT NULL DEFAULT 0,
  total_credits_purchased INTEGER NOT NULL DEFAULT 0,
  total_credits_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.ai_images_credits ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own credits"
  ON public.ai_images_credits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage credits"
  ON public.ai_images_credits FOR ALL
  USING (true)
  WITH CHECK (true);

-- Table for credit transactions history
CREATE TABLE public.ai_images_credit_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  transaction_type TEXT NOT NULL, -- 'purchase', 'usage', 'refund'
  credits_amount INTEGER NOT NULL,
  description TEXT,
  shopify_charge_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_images_credit_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own transactions"
  ON public.ai_images_credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage transactions"
  ON public.ai_images_credit_transactions FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to deduct credits
CREATE OR REPLACE FUNCTION public.deduct_ai_image_credits(p_user_id UUID, p_amount INTEGER, p_description TEXT DEFAULT 'Image generation')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Get current balance
  SELECT credits_balance INTO v_current_balance
  FROM ai_images_credits
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  IF v_current_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No credits account found');
  END IF;
  
  IF v_current_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient credits', 'balance', v_current_balance);
  END IF;
  
  -- Deduct credits
  v_new_balance := v_current_balance - p_amount;
  
  UPDATE ai_images_credits
  SET credits_balance = v_new_balance,
      total_credits_used = total_credits_used + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Log transaction
  INSERT INTO ai_images_credit_transactions (user_id, transaction_type, credits_amount, description)
  VALUES (p_user_id, 'usage', -p_amount, p_description);
  
  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);
END;
$$;

-- Function to add credits after purchase
CREATE OR REPLACE FUNCTION public.add_ai_image_credits(p_user_id UUID, p_amount INTEGER, p_shopify_charge_id TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  -- Insert or update credits
  INSERT INTO ai_images_credits (user_id, credits_balance, total_credits_purchased)
  VALUES (p_user_id, p_amount, p_amount)
  ON CONFLICT (user_id)
  DO UPDATE SET
    credits_balance = ai_images_credits.credits_balance + p_amount,
    total_credits_purchased = ai_images_credits.total_credits_purchased + p_amount,
    updated_at = now()
  RETURNING credits_balance INTO v_new_balance;
  
  -- Log transaction
  INSERT INTO ai_images_credit_transactions (user_id, transaction_type, credits_amount, description, shopify_charge_id)
  VALUES (p_user_id, 'purchase', p_amount, 'Credits purchase', p_shopify_charge_id);
  
  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);
END;
$$;