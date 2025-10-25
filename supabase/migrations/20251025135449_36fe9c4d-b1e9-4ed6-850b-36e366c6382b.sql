-- Modify shopify_variant_id to bigint and add UNIQUE constraint
ALTER TABLE public.product_variants 
  ALTER COLUMN shopify_variant_id TYPE bigint USING shopify_variant_id::bigint;

ALTER TABLE public.product_variants 
  ADD CONSTRAINT product_variants_shopify_variant_id_key UNIQUE (shopify_variant_id);

-- Add UNIQUE constraint on product_images
ALTER TABLE public.product_images 
  ADD CONSTRAINT product_images_shopify_image_id_key UNIQUE (shopify_image_id);

-- Create import_jobs table for real-time progress tracking
CREATE TABLE public.import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  store_id uuid,
  status text NOT NULL DEFAULT 'pending',
  current_page integer DEFAULT 0,
  total_pages integer DEFAULT 0,
  products_processed integer DEFAULT 0,
  error_message text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on import_jobs
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for import_jobs
CREATE POLICY "Users can view own import jobs"
  ON public.import_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own import jobs"
  ON public.import_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own import jobs"
  ON public.import_jobs FOR UPDATE
  USING (auth.uid() = user_id);