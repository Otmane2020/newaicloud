-- Add policy to allow admins to view all Facebook pages
CREATE POLICY "Admins can view all Facebook pages"
ON public.facebook_page_connections
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Add policy to allow admins to view all Instagram accounts
CREATE POLICY "Admins can view all Instagram accounts"
ON public.instagram_account_connections
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);