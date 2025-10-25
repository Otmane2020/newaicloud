-- Create shopify_products table with all specified fields
CREATE TABLE IF NOT EXISTS public.shopify_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.shopify_connections(id) ON DELETE SET NULL,
  shopify_id bigint UNIQUE,
  title text NOT NULL,
  description text,
  vendor text,
  product_type text,
  handle text,
  status text DEFAULT 'draft',
  tags text,
  image_url text,
  price numeric,
  compare_at_price numeric,
  inventory_quantity integer DEFAULT 0,
  raw_data jsonb,
  shop_name text,
  currency text DEFAULT 'EUR',
  
  -- SEO fields
  seo_title text,
  seo_description text,
  seo_synced_to_shopify boolean DEFAULT false,
  last_seo_sync_at timestamptz,
  seo_sync_error text,
  
  -- AI Vision Analysis fields
  ai_vision_analysis text,
  ai_color text,
  ai_material text,
  ai_texture text,
  ai_pattern text,
  ai_finish text,
  ai_shape text,
  ai_design_elements text,
  ai_lighting_type text,
  ai_background_style text,
  ai_presentation_quality integer,
  ai_condition_notes text,
  ai_craftsmanship_level text,
  ai_vision_model text,
  ai_vision_confidence integer,
  ai_vision_timestamp timestamptz,
  
  -- Dimensions
  length numeric,
  length_unit text,
  width numeric,
  width_unit text,
  height numeric,
  height_unit text,
  other_dimensions jsonb,
  
  -- Smart dimensions
  smart_length numeric,
  smart_length_unit text,
  smart_width numeric,
  smart_width_unit text,
  smart_height numeric,
  smart_height_unit text,
  smart_depth numeric,
  smart_depth_unit text,
  smart_diameter numeric,
  smart_diameter_unit text,
  smart_weight numeric,
  smart_weight_unit text,
  smart_seat_height numeric,
  smart_seat_height_unit text,
  dimensions_text text,
  dimensions_source text,
  
  -- Categorization
  category text,
  sub_category text,
  room text,
  style text,
  functionality text,
  characteristics text,
  
  -- Google Merchant fields
  google_product_category text,
  google_gender text,
  google_age_group text,
  google_mpn text,
  google_gtin text,
  google_condition text DEFAULT 'new',
  google_custom_product boolean DEFAULT false,
  google_custom_label_0 text,
  google_custom_label_1 text,
  google_custom_label_2 text,
  google_custom_label_3 text,
  google_custom_label_4 text,
  google_availability text,
  google_brand text,
  google_synced_at timestamptz,
  
  -- Enrichment tracking
  enrichment_status text DEFAULT 'pending',
  last_enriched_at timestamptz,
  enrichment_error text,
  
  -- Chat search field
  chat_text text,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  imported_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shopify_products_seller_id ON public.shopify_products(seller_id);
CREATE INDEX IF NOT EXISTS idx_shopify_products_store_id ON public.shopify_products(store_id);
CREATE INDEX IF NOT EXISTS idx_shopify_products_shopify_id ON public.shopify_products(shopify_id);
CREATE INDEX IF NOT EXISTS idx_shopify_products_status ON public.shopify_products(status);
CREATE INDEX IF NOT EXISTS idx_shopify_products_created_at ON public.shopify_products(created_at DESC);

-- Enable RLS
ALTER TABLE public.shopify_products ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shopify_products
CREATE POLICY "Users can view their own products"
  ON public.shopify_products
  FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Users can insert their own products"
  ON public.shopify_products
  FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Users can update their own products"
  ON public.shopify_products
  FOR UPDATE
  USING (auth.uid() = seller_id);

CREATE POLICY "Users can delete their own products"
  ON public.shopify_products
  FOR DELETE
  USING (auth.uid() = seller_id);

-- Update product_variants to reference shopify_products
ALTER TABLE public.product_variants DROP CONSTRAINT IF EXISTS product_variants_product_id_fkey;
ALTER TABLE public.product_variants 
  ADD CONSTRAINT product_variants_product_id_fkey 
  FOREIGN KEY (product_id) 
  REFERENCES public.shopify_products(id) 
  ON DELETE CASCADE;

-- Add new AI fields to product_variants
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS shopify_variant_id bigint;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS currency text;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS weight numeric;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS weight_unit text;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS barcode text;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS raw_data jsonb;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS ai_color text;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS ai_material text;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS ai_texture text;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS ai_pattern text;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS ai_finish text;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS ai_shape text;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS ai_design_elements text;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS ai_vision_analysis text;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS ai_product_name text;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS ai_vision_model text;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS ai_vision_confidence integer;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS ai_vision_timestamp timestamptz;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS ai_enrichment_status text DEFAULT 'pending';

-- Create product_images table if not exists, or update it
CREATE TABLE IF NOT EXISTS public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.shopify_products(id) ON DELETE CASCADE,
  shopify_image_id bigint,
  src text NOT NULL,
  position integer DEFAULT 0,
  alt_text text,
  width integer,
  height integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for product_images
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_position ON public.product_images(product_id, position);

-- Enable RLS on product_images
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_images
CREATE POLICY "Users can view images of their products"
  ON public.product_images
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.shopify_products 
    WHERE shopify_products.id = product_images.product_id 
    AND shopify_products.seller_id = auth.uid()
  ));

CREATE POLICY "Users can insert images for their products"
  ON public.product_images
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.shopify_products 
    WHERE shopify_products.id = product_images.product_id 
    AND shopify_products.seller_id = auth.uid()
  ));

CREATE POLICY "Users can update images of their products"
  ON public.product_images
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.shopify_products 
    WHERE shopify_products.id = product_images.product_id 
    AND shopify_products.seller_id = auth.uid()
  ));

CREATE POLICY "Users can delete images of their products"
  ON public.product_images
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.shopify_products 
    WHERE shopify_products.id = product_images.product_id 
    AND shopify_products.seller_id = auth.uid()
  ));

-- Create sync_logs table for tracking imports
CREATE TABLE IF NOT EXISTS public.sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.shopify_connections(id) ON DELETE SET NULL,
  store_name text NOT NULL,
  operation_type text NOT NULL DEFAULT 'import',
  status text NOT NULL DEFAULT 'in_progress',
  products_processed integer DEFAULT 0,
  products_added integer DEFAULT 0,
  products_updated integer DEFAULT 0,
  variants_processed integer DEFAULT 0,
  images_processed integer DEFAULT 0,
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- Create index for sync_logs
CREATE INDEX IF NOT EXISTS idx_sync_logs_seller_id ON public.sync_logs(seller_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at ON public.sync_logs(started_at DESC);

-- Enable RLS on sync_logs
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sync_logs
CREATE POLICY "Users can view their own sync logs"
  ON public.sync_logs
  FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Users can insert their own sync logs"
  ON public.sync_logs
  FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

-- Create trigger for updated_at on shopify_products
CREATE OR REPLACE FUNCTION update_shopify_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_shopify_products_updated_at_trigger
  BEFORE UPDATE ON public.shopify_products
  FOR EACH ROW
  EXECUTE FUNCTION update_shopify_products_updated_at();

-- Create trigger for updated_at on product_images
CREATE TRIGGER update_product_images_updated_at_trigger
  BEFORE UPDATE ON public.product_images
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();