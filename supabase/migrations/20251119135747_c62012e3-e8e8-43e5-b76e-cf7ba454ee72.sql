-- Add field to track if user has already used their lifetime trial
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_used_trial boolean DEFAULT false;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_has_used_trial ON profiles(has_used_trial);

-- Remove trial from Starter plan (should never have trial)
UPDATE subscription_plans 
SET trial_days = 0 
WHERE id = 'starter';

-- Comment for clarity
COMMENT ON COLUMN profiles.has_used_trial IS 'Tracks if user has already claimed their one-time lifetime 14-day trial';