-- Create a function to sync main product image (position 1) from product_images to shopify_products
CREATE OR REPLACE FUNCTION public.sync_main_product_image()
RETURNS TRIGGER AS $$
BEGIN
  -- When an image is inserted/updated/deleted at position 1, update the main product image
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND (NEW.position = 1 OR OLD.position = 1) THEN
    UPDATE public.shopify_products
    SET image_url = (
      SELECT src FROM public.product_images 
      WHERE product_id = NEW.product_id 
      ORDER BY position ASC NULLS LAST 
      LIMIT 1
    ),
    updated_at = NOW()
    WHERE id = NEW.product_id;
  ELSIF TG_OP = 'DELETE' AND OLD.position = 1 THEN
    UPDATE public.shopify_products
    SET image_url = (
      SELECT src FROM public.product_images 
      WHERE product_id = OLD.product_id 
      ORDER BY position ASC NULLS LAST 
      LIMIT 1
    ),
    updated_at = NOW()
    WHERE id = OLD.product_id;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to automatically sync main image
DROP TRIGGER IF EXISTS trigger_sync_main_product_image ON public.product_images;

CREATE TRIGGER trigger_sync_main_product_image
AFTER INSERT OR UPDATE OR DELETE ON public.product_images
FOR EACH ROW
EXECUTE FUNCTION public.sync_main_product_image();