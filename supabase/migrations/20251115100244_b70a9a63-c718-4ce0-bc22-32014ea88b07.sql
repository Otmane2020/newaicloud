-- Optimiser la suppression en cascade pour éviter les timeouts
-- Version finale avec vérifications complètes

-- 1. Supprimer TOUS les triggers et fonctions liés
DROP TRIGGER IF EXISTS delete_shopify_connection_cascade_trigger ON shopify_connections;
DROP TRIGGER IF EXISTS before_delete_shopify_connection ON shopify_connections;
DROP TRIGGER IF EXISTS on_shopify_connection_delete ON shopify_connections;
DROP FUNCTION IF EXISTS delete_shopify_connection_cascade() CASCADE;

-- 2. Nettoyer les données orphelines AVANT d'ajouter les contraintes
DO $$
BEGIN
  -- Import jobs (a toujours store_id)
  DELETE FROM import_jobs 
  WHERE store_id IS NOT NULL 
    AND store_id NOT IN (SELECT id FROM shopify_connections);

  -- Sync logs
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sync_logs' AND column_name = 'store_id') THEN
    DELETE FROM sync_logs 
    WHERE store_id IS NOT NULL 
      AND store_id NOT IN (SELECT id FROM shopify_connections);
  END IF;

  -- Sync history
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sync_history' AND column_name = 'store_id') THEN
    DELETE FROM sync_history 
    WHERE store_id IS NOT NULL 
      AND store_id NOT IN (SELECT id FROM shopify_connections);
  END IF;

  -- Blog articles
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blog_articles' AND column_name = 'store_id') THEN
    DELETE FROM blog_articles 
    WHERE store_id IS NOT NULL 
      AND store_id NOT IN (SELECT id FROM shopify_connections);
  END IF;

  -- Blog netlinking
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blog_netlinking' AND column_name = 'store_id') THEN
    DELETE FROM blog_netlinking 
    WHERE store_id IS NOT NULL 
      AND store_id NOT IN (SELECT id FROM shopify_connections);
  END IF;

  -- Blog opportunities
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blog_opportunities' AND column_name = 'store_id') THEN
    DELETE FROM blog_opportunities 
    WHERE store_id IS NOT NULL 
      AND store_id NOT IN (SELECT id FROM shopify_connections);
  END IF;

  -- Content images
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_images' AND column_name = 'store_id') THEN
    DELETE FROM content_images 
    WHERE store_id IS NOT NULL 
      AND store_id NOT IN (SELECT id FROM shopify_connections);
  END IF;

  -- Product landing pages
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_landing_pages' AND column_name = 'store_id') THEN
    DELETE FROM product_landing_pages 
    WHERE store_id IS NOT NULL 
      AND store_id NOT IN (SELECT id FROM shopify_connections);
  END IF;
END $$;

-- 3. Ajouter store_id aux tables qui ne l'ont pas et configurer CASCADE
DO $$ 
BEGIN
  -- Blog articles
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blog_articles' AND column_name = 'store_id') THEN
    ALTER TABLE blog_articles DROP CONSTRAINT IF EXISTS blog_articles_store_id_fkey;
    ALTER TABLE blog_articles ADD CONSTRAINT blog_articles_store_id_fkey 
      FOREIGN KEY (store_id) REFERENCES shopify_connections(id) ON DELETE CASCADE;
  END IF;

  -- Blog netlinking
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blog_netlinking' AND column_name = 'store_id') THEN
    ALTER TABLE blog_netlinking DROP CONSTRAINT IF EXISTS blog_netlinking_store_id_fkey;
    ALTER TABLE blog_netlinking ADD CONSTRAINT blog_netlinking_store_id_fkey 
      FOREIGN KEY (store_id) REFERENCES shopify_connections(id) ON DELETE CASCADE;
  END IF;

  -- Blog opportunities
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blog_opportunities' AND column_name = 'store_id') THEN
    ALTER TABLE blog_opportunities DROP CONSTRAINT IF EXISTS blog_opportunities_store_id_fkey;
    ALTER TABLE blog_opportunities ADD CONSTRAINT blog_opportunities_store_id_fkey 
      FOREIGN KEY (store_id) REFERENCES shopify_connections(id) ON DELETE CASCADE;
  END IF;

  -- Blog campaigns - ajouter la colonne si elle n'existe pas
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blog_campaigns' AND column_name = 'store_id') THEN
    ALTER TABLE blog_campaigns ADD COLUMN store_id UUID;
  END IF;
  ALTER TABLE blog_campaigns DROP CONSTRAINT IF EXISTS blog_campaigns_store_id_fkey;
  ALTER TABLE blog_campaigns ADD CONSTRAINT blog_campaigns_store_id_fkey 
    FOREIGN KEY (store_id) REFERENCES shopify_connections(id) ON DELETE CASCADE;

  -- Content images
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_images' AND column_name = 'store_id') THEN
    ALTER TABLE content_images DROP CONSTRAINT IF EXISTS content_images_store_id_fkey;
    ALTER TABLE content_images ADD CONSTRAINT content_images_store_id_fkey 
      FOREIGN KEY (store_id) REFERENCES shopify_connections(id) ON DELETE CASCADE;
  END IF;

  -- Shopify collections
  ALTER TABLE shopify_collections DROP CONSTRAINT IF EXISTS shopify_collections_store_id_fkey;
  ALTER TABLE shopify_collections ADD CONSTRAINT shopify_collections_store_id_fkey 
    FOREIGN KEY (store_id) REFERENCES shopify_connections(id) ON DELETE CASCADE;

  -- Shopify products
  ALTER TABLE shopify_products DROP CONSTRAINT IF EXISTS shopify_products_store_id_fkey;
  ALTER TABLE shopify_products ADD CONSTRAINT shopify_products_store_id_fkey 
    FOREIGN KEY (store_id) REFERENCES shopify_connections(id) ON DELETE CASCADE;

  -- Shopify pages
  ALTER TABLE shopify_pages DROP CONSTRAINT IF EXISTS shopify_pages_store_id_fkey;
  ALTER TABLE shopify_pages ADD CONSTRAINT shopify_pages_store_id_fkey 
    FOREIGN KEY (store_id) REFERENCES shopify_connections(id) ON DELETE CASCADE;

  -- Product landing pages
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_landing_pages' AND column_name = 'store_id') THEN
    ALTER TABLE product_landing_pages DROP CONSTRAINT IF EXISTS product_landing_pages_store_id_fkey;
    ALTER TABLE product_landing_pages ADD CONSTRAINT product_landing_pages_store_id_fkey 
      FOREIGN KEY (store_id) REFERENCES shopify_connections(id) ON DELETE CASCADE;
  END IF;

  -- Import jobs
  ALTER TABLE import_jobs DROP CONSTRAINT IF EXISTS import_jobs_store_id_fkey;
  ALTER TABLE import_jobs ADD CONSTRAINT import_jobs_store_id_fkey 
    FOREIGN KEY (store_id) REFERENCES shopify_connections(id) ON DELETE CASCADE;

  -- Sync logs
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sync_logs' AND column_name = 'store_id') THEN
    ALTER TABLE sync_logs DROP CONSTRAINT IF EXISTS sync_logs_store_id_fkey;
    ALTER TABLE sync_logs ADD CONSTRAINT sync_logs_store_id_fkey 
      FOREIGN KEY (store_id) REFERENCES shopify_connections(id) ON DELETE CASCADE;
  END IF;

  -- Sync history
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sync_history' AND column_name = 'store_id') THEN
    ALTER TABLE sync_history DROP CONSTRAINT IF EXISTS sync_history_store_id_fkey;
    ALTER TABLE sync_history ADD CONSTRAINT sync_history_store_id_fkey 
      FOREIGN KEY (store_id) REFERENCES shopify_connections(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 4. Créer des index pour accélérer les suppressions en cascade (avec vérifications)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blog_articles' AND column_name = 'store_id') THEN
    CREATE INDEX IF NOT EXISTS idx_blog_articles_store_cascade ON blog_articles(store_id) WHERE store_id IS NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blog_netlinking' AND column_name = 'store_id') THEN
    CREATE INDEX IF NOT EXISTS idx_blog_netlinking_store_cascade ON blog_netlinking(store_id) WHERE store_id IS NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blog_opportunities' AND column_name = 'store_id') THEN
    CREATE INDEX IF NOT EXISTS idx_blog_opportunities_store_cascade ON blog_opportunities(store_id) WHERE store_id IS NOT NULL;
  END IF;

  CREATE INDEX IF NOT EXISTS idx_blog_campaigns_store_cascade ON blog_campaigns(store_id) WHERE store_id IS NOT NULL;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_images' AND column_name = 'store_id') THEN
    CREATE INDEX IF NOT EXISTS idx_content_images_store_cascade ON content_images(store_id) WHERE store_id IS NOT NULL;
  END IF;

  CREATE INDEX IF NOT EXISTS idx_shopify_collections_store_cascade ON shopify_collections(store_id);
  CREATE INDEX IF NOT EXISTS idx_shopify_products_store_cascade ON shopify_products(store_id);
  CREATE INDEX IF NOT EXISTS idx_shopify_pages_store_cascade ON shopify_pages(store_id);

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_landing_pages' AND column_name = 'store_id') THEN
    CREATE INDEX IF NOT EXISTS idx_product_landing_pages_store_cascade ON product_landing_pages(store_id) WHERE store_id IS NOT NULL;
  END IF;

  CREATE INDEX IF NOT EXISTS idx_import_jobs_store_cascade ON import_jobs(store_id);

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sync_logs' AND column_name = 'store_id') THEN
    CREATE INDEX IF NOT EXISTS idx_sync_logs_store_cascade ON sync_logs(store_id) WHERE store_id IS NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sync_history' AND column_name = 'store_id') THEN
    CREATE INDEX IF NOT EXISTS idx_sync_history_store_cascade ON sync_history(store_id) WHERE store_id IS NOT NULL;
  END IF;
END $$;