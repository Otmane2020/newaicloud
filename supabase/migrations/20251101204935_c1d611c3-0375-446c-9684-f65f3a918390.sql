-- Create storage bucket for generated images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'generated-images',
  'generated-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
);

-- Enable RLS on storage.objects
CREATE POLICY "Users can upload their own generated images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'generated-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view generated images"
ON storage.objects FOR SELECT
USING (bucket_id = 'generated-images');

CREATE POLICY "Users can delete their own generated images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'generated-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);