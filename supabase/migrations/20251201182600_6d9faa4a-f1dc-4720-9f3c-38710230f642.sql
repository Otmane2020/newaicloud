-- Fix store_language for decora-home-officlal store
UPDATE shopify_connections 
SET store_language = 'en' 
WHERE store_url LIKE '%decora-home-officlal%' 
  AND (store_language IS NULL OR store_language = 'fr');