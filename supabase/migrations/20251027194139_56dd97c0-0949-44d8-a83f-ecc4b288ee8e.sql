
-- Nettoyer les produits des utilisateurs sans connexion Shopify active

-- Supprimer les images des produits orphelins
DELETE FROM product_images 
WHERE product_id IN (
  SELECT sp.id 
  FROM shopify_products sp
  LEFT JOIN shopify_connections sc ON sc.user_id = sp.seller_id AND sc.is_active = true
  WHERE sc.id IS NULL
);

-- Supprimer les variants des produits orphelins
DELETE FROM product_variants 
WHERE product_id IN (
  SELECT sp.id 
  FROM shopify_products sp
  LEFT JOIN shopify_connections sc ON sc.user_id = sp.seller_id AND sc.is_active = true
  WHERE sc.id IS NULL
);

-- Supprimer les produits orphelins
DELETE FROM shopify_products 
WHERE seller_id IN (
  SELECT sp.seller_id 
  FROM shopify_products sp
  LEFT JOIN shopify_connections sc ON sc.user_id = sp.seller_id AND sc.is_active = true
  WHERE sc.id IS NULL
  GROUP BY sp.seller_id
);
