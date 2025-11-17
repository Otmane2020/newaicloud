-- Migration: Réparer les articles existants sans store_id
-- Cette migration attribue le store actif de chaque utilisateur aux articles orphelins

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

-- Créer un index pour améliorer les performances des requêtes par store_id
CREATE INDEX IF NOT EXISTS idx_blog_articles_store_id ON blog_articles(store_id);

-- Afficher un rapport des articles qui n'ont pas pu être réparés
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM blog_articles
  WHERE store_id IS NULL;
  
  RAISE NOTICE 'Articles orphelins restants: %', orphan_count;
END $$;