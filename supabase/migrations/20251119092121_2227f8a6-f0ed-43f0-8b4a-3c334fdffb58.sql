-- Add store_id to homepage_seo if not exists and update unique constraint
DO $$ 
BEGIN
  -- Add store_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'homepage_seo' 
    AND column_name = 'store_id'
  ) THEN
    ALTER TABLE public.homepage_seo 
    ADD COLUMN store_id uuid REFERENCES public.shopify_connections(id) ON DELETE CASCADE;
  END IF;

  -- Drop old unique constraint on user_id only
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'homepage_seo_user_id_unique'
    AND table_name = 'homepage_seo'
  ) THEN
    ALTER TABLE public.homepage_seo 
    DROP CONSTRAINT homepage_seo_user_id_unique;
  END IF;

  -- Add new unique constraint on user_id + store_id combination
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'homepage_seo_user_id_store_id_unique'
    AND table_name = 'homepage_seo'
  ) THEN
    ALTER TABLE public.homepage_seo 
    ADD CONSTRAINT homepage_seo_user_id_store_id_unique UNIQUE (user_id, store_id);
  END IF;
END $$;