-- ============================================
-- Migration: Correction suppression cascade complète Shopify
-- ============================================

-- 1. Ajouter store_id à blog_netlinking si pas déjà présent
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'blog_netlinking' AND column_name = 'store_id'
  ) THEN
    ALTER TABLE blog_netlinking 
    ADD COLUMN store_id UUID REFERENCES shopify_connections(id) ON DELETE CASCADE;
    
    CREATE INDEX idx_blog_netlinking_store ON blog_netlinking(store_id);
  END IF;
END $$;

-- 2. Ajouter store_id à blog_opportunities si pas déjà présent
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'blog_opportunities' AND column_name = 'store_id'
  ) THEN
    ALTER TABLE blog_opportunities 
    ADD COLUMN store_id UUID REFERENCES shopify_connections(id) ON DELETE CASCADE;
    
    CREATE INDEX idx_blog_opportunities_store ON blog_opportunities(store_id);
  END IF;
END $$;

-- 3. S'assurer que store_id existe sur blog_articles avec ON DELETE CASCADE
DO $$
BEGIN
  -- Supprimer l'ancienne contrainte si elle existe
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'blog_articles_store_id_fkey'
  ) THEN
    ALTER TABLE blog_articles DROP CONSTRAINT blog_articles_store_id_fkey;
  END IF;
  
  -- Recréer avec ON DELETE CASCADE
  ALTER TABLE blog_articles 
  ADD CONSTRAINT blog_articles_store_id_fkey 
  FOREIGN KEY (store_id) REFERENCES shopify_connections(id) ON DELETE CASCADE;
  
  -- Créer l'index si pas déjà présent
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_blog_articles_store'
  ) THEN
    CREATE INDEX idx_blog_articles_store ON blog_articles(store_id);
  END IF;
END $$;

-- 4. Migration des données existantes - Associer au premier store actif
UPDATE blog_articles ba
SET store_id = (
  SELECT sc.id 
  FROM shopify_connections sc
  WHERE sc.user_id = ba.user_id
  LIMIT 1
)
WHERE store_id IS NULL AND user_id IS NOT NULL;

UPDATE blog_netlinking bn
SET store_id = (
  SELECT sc.id 
  FROM shopify_connections sc
  WHERE sc.user_id = bn.user_id
  LIMIT 1
)
WHERE store_id IS NULL AND user_id IS NOT NULL;

UPDATE blog_opportunities bo
SET store_id = (
  SELECT sc.id 
  FROM shopify_connections sc
  WHERE sc.user_id = bo.user_id
  LIMIT 1
)
WHERE store_id IS NULL AND user_id IS NOT NULL;

-- 5. Mettre à jour le trigger de suppression en cascade
CREATE OR REPLACE FUNCTION public.delete_shopify_connection_cascade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Delete import jobs first
  DELETE FROM import_jobs WHERE store_id = OLD.id;
  
  -- Delete sync logs
  DELETE FROM sync_logs WHERE store_id = OLD.id;
  
  -- Delete blog-related data (explicit pour être sûr)
  DELETE FROM blog_netlinking WHERE store_id = OLD.id;
  DELETE FROM blog_opportunities WHERE store_id = OLD.id;
  DELETE FROM blog_articles WHERE store_id = OLD.id;
  
  -- Delete content images
  DELETE FROM content_images WHERE store_id = OLD.id;
  
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
  
  -- Delete collections (CASCADE s'en charge normalement mais explicite)
  DELETE FROM shopify_collections WHERE store_id = OLD.id;
  
  -- Delete shopify pages
  DELETE FROM shopify_pages WHERE store_id = OLD.id;
  
  -- Delete shopify products
  DELETE FROM shopify_products WHERE store_id = OLD.id;
  
  -- Also delete products without store_id but belonging to the same user
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
  
  -- Update usage counters for current month AND all future months
  UPDATE usage_tracking
  SET 
    products_count = (
      SELECT COUNT(*) 
      FROM shopify_products 
      WHERE seller_id = OLD.user_id
    ),
    shopify_stores_count = GREATEST(0, shopify_stores_count - 1),
    updated_at = now()
  WHERE seller_id = OLD.user_id 
    AND month >= DATE_TRUNC('month', CURRENT_DATE);
  
  RETURN OLD;
END;
$function$;

-- 6. Améliorer cleanup_orphaned_data() pour inclure les données blog
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_data()
RETURNS TABLE(cleanup_type text, items_cleaned integer, details jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_orphaned_products INTEGER;
  v_orphaned_images INTEGER;
  v_orphaned_variants INTEGER;
  v_orphaned_content_images INTEGER;
  v_orphaned_blog_articles INTEGER;
  v_orphaned_blog_netlinking INTEGER;
  v_orphaned_blog_opportunities INTEGER;
BEGIN
  -- 1. Supprimer les produits sans store_id et sans seller_id valide
  WITH deleted_products AS (
    DELETE FROM public.shopify_products
    WHERE (store_id IS NULL AND seller_id NOT IN (SELECT id FROM auth.users))
       OR (store_id IS NOT NULL AND store_id NOT IN (SELECT id FROM public.shopify_connections))
    RETURNING id
  )
  SELECT COUNT(*) INTO v_orphaned_products FROM deleted_products;

  -- 2. Supprimer les images de produits sans produit parent
  WITH deleted_images AS (
    DELETE FROM public.product_images
    WHERE product_id NOT IN (SELECT id FROM public.shopify_products)
    RETURNING id
  )
  SELECT COUNT(*) INTO v_orphaned_images FROM deleted_images;

  -- 3. Supprimer les variantes de produits sans produit parent
  WITH deleted_variants AS (
    DELETE FROM public.product_variants
    WHERE product_id NOT IN (SELECT id FROM public.shopify_products)
    RETURNING id
  )
  SELECT COUNT(*) INTO v_orphaned_variants FROM deleted_variants;

  -- 4. Supprimer les content_images sans contenu parent
  WITH deleted_content_images AS (
    DELETE FROM public.content_images
    WHERE (content_type = 'article' AND content_id NOT IN (SELECT id FROM public.blog_articles))
       OR (content_type = 'page' AND content_id NOT IN (SELECT id FROM public.shopify_pages))
       OR (store_id IS NOT NULL AND store_id NOT IN (SELECT id FROM public.shopify_connections))
    RETURNING id
  )
  SELECT COUNT(*) INTO v_orphaned_content_images FROM deleted_content_images;

  -- 5. Supprimer les articles blog sans store valide
  WITH deleted_blog_articles AS (
    DELETE FROM public.blog_articles
    WHERE store_id IS NOT NULL 
      AND store_id NOT IN (SELECT id FROM public.shopify_connections)
    RETURNING id
  )
  SELECT COUNT(*) INTO v_orphaned_blog_articles FROM deleted_blog_articles;

  -- 6. Supprimer le netlinking sans article ou store valide
  WITH deleted_netlinking AS (
    DELETE FROM public.blog_netlinking
    WHERE (article_id IS NOT NULL AND article_id NOT IN (SELECT id FROM public.blog_articles))
       OR (store_id IS NOT NULL AND store_id NOT IN (SELECT id FROM public.shopify_connections))
    RETURNING id
  )
  SELECT COUNT(*) INTO v_orphaned_blog_netlinking FROM deleted_netlinking;

  -- 7. Supprimer les opportunités blog sans store valide
  WITH deleted_opportunities AS (
    DELETE FROM public.blog_opportunities
    WHERE store_id IS NOT NULL 
      AND store_id NOT IN (SELECT id FROM public.shopify_connections)
    RETURNING id
  )
  SELECT COUNT(*) INTO v_orphaned_blog_opportunities FROM deleted_opportunities;

  -- Retourner les résultats
  RETURN QUERY SELECT 
    'orphaned_products'::TEXT, 
    v_orphaned_products,
    jsonb_build_object('description', 'Produits sans boutique ou utilisateur valide')::JSONB;
  
  RETURN QUERY SELECT 
    'orphaned_images'::TEXT, 
    v_orphaned_images,
    jsonb_build_object('description', 'Images sans produit parent')::JSONB;
  
  RETURN QUERY SELECT 
    'orphaned_variants'::TEXT, 
    v_orphaned_variants,
    jsonb_build_object('description', 'Variantes sans produit parent')::JSONB;
  
  RETURN QUERY SELECT 
    'orphaned_content_images'::TEXT, 
    v_orphaned_content_images,
    jsonb_build_object('description', 'Images de contenu sans parent')::JSONB;

  RETURN QUERY SELECT 
    'orphaned_blog_articles'::TEXT, 
    v_orphaned_blog_articles,
    jsonb_build_object('description', 'Articles blog sans store valide')::JSONB;

  RETURN QUERY SELECT 
    'orphaned_blog_netlinking'::TEXT, 
    v_orphaned_blog_netlinking,
    jsonb_build_object('description', 'Netlinking sans article ou store valide')::JSONB;

  RETURN QUERY SELECT 
    'orphaned_blog_opportunities'::TEXT, 
    v_orphaned_blog_opportunities,
    jsonb_build_object('description', 'Opportunités blog sans store valide')::JSONB;
END;
$function$;