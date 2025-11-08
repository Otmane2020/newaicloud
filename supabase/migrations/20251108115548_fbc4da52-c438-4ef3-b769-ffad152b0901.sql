-- Set trial_days to 0 for Starter plan to require immediate payment
UPDATE subscription_plans 
SET trial_days = 0 
WHERE id = 'starter';