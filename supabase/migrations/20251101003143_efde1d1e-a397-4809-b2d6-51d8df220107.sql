-- Create referrals table to track user referrals
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_email TEXT,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  referral_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed_up', 'activated', 'rewarded')),
  credits_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  activated_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT unique_referrer_code UNIQUE (referrer_id, referral_code)
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Users can view their own referrals
CREATE POLICY "Users can view their own referrals"
ON public.referrals
FOR SELECT
USING (auth.uid() = referrer_id);

-- Users can create their own referrals
CREATE POLICY "Users can create referrals"
ON public.referrals
FOR INSERT
WITH CHECK (auth.uid() = referrer_id);

-- System can update referrals (for tracking sign-ups and activation)
CREATE POLICY "System can update referrals"
ON public.referrals
FOR UPDATE
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_code ON public.referrals(referral_code);
CREATE INDEX idx_referrals_status ON public.referrals(status);

-- Add credits column to profiles if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'credits') THEN
    ALTER TABLE public.profiles ADD COLUMN credits INTEGER DEFAULT 0;
  END IF;
END $$;

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 8 character alphanumeric code
    code := UPPER(substring(md5(random()::text || user_id::text) from 1 for 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM referrals WHERE referral_code = code) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN code;
END;
$$;

-- Create referral tracking trigger
CREATE OR REPLACE FUNCTION track_referral_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user signed up with a referral code (stored in user metadata)
  IF NEW.raw_user_meta_data->>'referral_code' IS NOT NULL THEN
    -- Update the referral record
    UPDATE referrals
    SET 
      referred_user_id = NEW.id,
      referred_email = NEW.email,
      status = 'signed_up'
    WHERE referral_code = NEW.raw_user_meta_data->>'referral_code'
      AND status = 'pending';
      
    -- Award 10 credits to the new user
    UPDATE profiles
    SET credits = credits + 10
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger when new user signs up
CREATE TRIGGER on_user_signup_referral
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION track_referral_signup();