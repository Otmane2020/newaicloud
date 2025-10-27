-- Create trigger function to cascade delete all related data when a shopify connection is deleted
CREATE OR REPLACE FUNCTION delete_shopify_connection_cascade()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete import jobs first
  DELETE FROM import_jobs WHERE store_id = OLD.id;
  
  -- Delete sync logs
  DELETE FROM sync_logs WHERE store_id = OLD.id;
  
  -- Delete product images (via products)
  DELETE FROM product_images 
  WHERE product_id IN (
    SELECT id FROM shopify_products WHERE store_id = OLD.id
  );
  
  -- Delete product variants (via products)
  DELETE FROM product_variants 
  WHERE product_id IN (
    SELECT id FROM shopify_products WHERE store_id = OLD.id
  );
  
  -- Delete shopify pages
  DELETE FROM shopify_pages WHERE store_id = OLD.id;
  
  -- Delete shopify products
  DELETE FROM shopify_products WHERE store_id = OLD.id;
  
  -- Also delete products without store_id but belonging to the same user
  -- This handles legacy products with NULL store_id
  DELETE FROM product_images 
  WHERE product_id IN (
    SELECT id FROM shopify_products 
    WHERE seller_id = OLD.user_id AND store_id IS NULL
  );
  
  DELETE FROM product_variants 
  WHERE product_id IN (
    SELECT id FROM shopify_products 
    WHERE seller_id = OLD.user_id AND store_id IS NULL
  );
  
  DELETE FROM shopify_products 
  WHERE seller_id = OLD.user_id AND store_id IS NULL;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS before_delete_shopify_connection ON shopify_connections;
CREATE TRIGGER before_delete_shopify_connection
  BEFORE DELETE ON shopify_connections
  FOR EACH ROW
  EXECUTE FUNCTION delete_shopify_connection_cascade();