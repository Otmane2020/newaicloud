-- Add unique constraint to prevent duplicate collections per user
ALTER TABLE shopify_collections 
ADD CONSTRAINT shopify_collections_shopify_id_user_unique 
UNIQUE (shopify_collection_id, user_id);