-- Update trial_days for professional and enterprise-199 plans to 14 days
UPDATE subscription_plans 
SET trial_days = 14 
WHERE id IN ('professional', 'enterprise-199');

-- Create Stripe prices for multiplied plans in your Stripe dashboard, then update these IDs
-- For now, I'll comment these out as you'll need to create the actual prices in Stripe first
-- UPDATE subscription_plans SET stripe_price_id_monthly = 'price_1XXX', stripe_price_id_yearly = 'price_1YYY' WHERE id = 'pro-98';
-- etc...
