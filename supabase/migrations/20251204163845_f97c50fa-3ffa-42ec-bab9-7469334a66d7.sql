-- Create a function to check if email exists in auth.users
CREATE OR REPLACE FUNCTION public.check_user_email_exists(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM auth.users WHERE email = LOWER(p_email));
END;
$$;