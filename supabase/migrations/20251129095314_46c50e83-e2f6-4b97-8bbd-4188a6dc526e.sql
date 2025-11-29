-- Add DELETE policy for admins on admin_emails table
CREATE POLICY "Admins can delete emails" 
ON public.admin_emails 
FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));