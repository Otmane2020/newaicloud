-- Add RLS policy for landing_page_history
-- Allow users to view their own landing page versions or versions of products they own

-- Enable RLS if not already enabled
ALTER TABLE landing_page_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can view landing page history" ON landing_page_history;

-- Create policy for SELECT: users can see their own versions OR versions of products they own
CREATE POLICY "Users can view landing page history"
ON landing_page_history
FOR SELECT
USING (
  user_id = auth.uid() 
  OR 
  EXISTS (
    SELECT 1 FROM shopify_products 
    WHERE shopify_products.id = landing_page_history.product_id 
    AND shopify_products.seller_id = auth.uid()
  )
);

-- Create policy for INSERT: users can only insert with their own user_id
CREATE POLICY "Users can insert their own landing page history"
ON landing_page_history
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM shopify_products 
    WHERE shopify_products.id = landing_page_history.product_id 
    AND shopify_products.seller_id = auth.uid()
  )
);

-- Create policy for UPDATE: users can update their own versions or versions of products they own
CREATE POLICY "Users can update landing page history"
ON landing_page_history
FOR UPDATE
USING (
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM shopify_products 
    WHERE shopify_products.id = landing_page_history.product_id 
    AND shopify_products.seller_id = auth.uid()
  )
);