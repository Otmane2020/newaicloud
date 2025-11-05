-- Add EUR pricing columns to subscription_plans
ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS stripe_price_id_monthly_eur text,
ADD COLUMN IF NOT EXISTS stripe_price_id_yearly_eur text,
ADD COLUMN IF NOT EXISTS price_monthly_eur numeric(10,2),
ADD COLUMN IF NOT EXISTS price_yearly_eur numeric(10,2);

-- Add comment for clarity
COMMENT ON COLUMN subscription_plans.stripe_price_id_monthly_eur IS 'Stripe price ID for monthly EUR billing';
COMMENT ON COLUMN subscription_plans.stripe_price_id_yearly_eur IS 'Stripe price ID for yearly EUR billing';
COMMENT ON COLUMN subscription_plans.price_monthly_eur IS 'Monthly price in EUR';
COMMENT ON COLUMN subscription_plans.price_yearly_eur IS 'Yearly price in EUR';

-- Populate EUR prices with same values as USD (price parity strategy)
-- For existing plans, copy USD prices to EUR columns
UPDATE subscription_plans
SET 
  price_monthly_eur = price_monthly,
  price_yearly_eur = price_yearly
WHERE price_monthly_eur IS NULL OR price_yearly_eur IS NULL;