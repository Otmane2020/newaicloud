-- Add RLS policy for admins to view all Shopify connections
CREATE POLICY "Admins can view all connections" 
ON public.shopify_connections 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));