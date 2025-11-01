-- Update track_referral_signup to award 100 credits to new users
CREATE OR REPLACE FUNCTION public.track_referral_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      
    -- Award 100 credits to the new user
    UPDATE profiles
    SET credits = credits + 100
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$function$;