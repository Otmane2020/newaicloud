-- Step 1: Add store_id column to homepage_seo table
ALTER TABLE public.homepage_seo
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.shopify_connections(id) ON DELETE CASCADE;

-- Step 2: Drop the old unique constraint on user_id only (if it exists)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'homepage_seo_user_id_unique'
  ) THEN
    ALTER TABLE public.homepage_seo DROP CONSTRAINT homepage_seo_user_id_unique;
  END IF;
END $$;

-- Step 3: Create new unique constraint on (user_id, store_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'homepage_seo_user_id_store_id_unique'
  ) THEN
    ALTER TABLE public.homepage_seo 
    ADD CONSTRAINT homepage_seo_user_id_store_id_unique 
    UNIQUE (user_id, store_id);
  END IF;
END $$;

-- Step 4: Update RLS policies to include store_id filtering
DROP POLICY IF EXISTS "Users can manage their own homepage SEO" ON public.homepage_seo;

CREATE POLICY "Users can manage their own homepage SEO"
ON public.homepage_seo
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Step 5: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_homepage_seo_store_id ON public.homepage_seo(store_id);
CREATE INDEX IF NOT EXISTS idx_homepage_seo_user_store ON public.homepage_seo(user_id, store_id);