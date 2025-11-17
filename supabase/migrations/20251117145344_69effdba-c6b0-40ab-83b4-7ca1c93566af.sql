-- Migration pour réparer les articles avec store_id NULL
-- Attribuer le store_id actif du user à tous les articles orphelins

UPDATE blog_articles
SET store_id = (
  SELECT sc.id 
  FROM shopify_connections sc
  WHERE sc.user_id = blog_articles.user_id 
  AND sc.is_active = true 
  LIMIT 1
)
WHERE store_id IS NULL
AND user_id IN (
  SELECT DISTINCT user_id 
  FROM shopify_connections 
  WHERE is_active = true
);

-- Log: Afficher le nombre d'articles réparés
-- Cette requête sera exécutée après la migration pour vérifier les résultats