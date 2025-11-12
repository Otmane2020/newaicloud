-- Enable RLS on product_variants table
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own product variants
CREATE POLICY "Users can view their own product variants"
ON product_variants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM shopify_products
    WHERE shopify_products.id = product_variants.product_id
    AND shopify_products.seller_id = auth.uid()
  )
);

-- Policy: Users can insert variants for their own products
CREATE POLICY "Users can insert variants for their own products"
ON product_variants
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM shopify_products
    WHERE shopify_products.id = product_variants.product_id
    AND shopify_products.seller_id = auth.uid()
  )
);

-- Policy: Users can update their own product variants
CREATE POLICY "Users can update their own product variants"
ON product_variants
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM shopify_products
    WHERE shopify_products.id = product_variants.product_id
    AND shopify_products.seller_id = auth.uid()
  )
);

-- Policy: Users can delete their own product variants
CREATE POLICY "Users can delete their own product variants"
ON product_variants
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM shopify_products
    WHERE shopify_products.id = product_variants.product_id
    AND shopify_products.seller_id = auth.uid()
  )
);