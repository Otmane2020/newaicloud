-- Add unique constraint on user_id and src to avoid duplicate homepage images
ALTER TABLE public.homepage_images 
ADD CONSTRAINT homepage_images_user_id_src_unique UNIQUE (user_id, src);