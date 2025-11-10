-- Create function to get next version number for image history
CREATE OR REPLACE FUNCTION public.get_next_image_version(p_image_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  max_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO max_version
  FROM public.product_image_history
  WHERE image_id = p_image_id;
  
  RETURN max_version;
END;
$$;