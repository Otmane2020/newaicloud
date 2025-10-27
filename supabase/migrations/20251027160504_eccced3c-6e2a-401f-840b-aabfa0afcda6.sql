-- Add max_shopify_stores column to subscription_plans
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS max_shopify_stores integer NOT NULL DEFAULT 1;

-- Add shopify_stores_count to usage_tracking
ALTER TABLE public.usage_tracking 
ADD COLUMN IF NOT EXISTS shopify_stores_count integer NOT NULL DEFAULT 0;

-- Update existing plans with shopify store limits
-- Assuming Starter = 1, Pro = 3, Enterprise = 10
UPDATE public.subscription_plans 
SET max_shopify_stores = CASE 
  WHEN name ILIKE '%starter%' OR name ILIKE '%gratuit%' OR name ILIKE '%basic%' THEN 1
  WHEN name ILIKE '%pro%' OR name ILIKE '%premium%' THEN 3
  WHEN name ILIKE '%enterprise%' OR name ILIKE '%illimité%' THEN 10
  ELSE 1
END;