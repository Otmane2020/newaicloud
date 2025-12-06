-- Create storage bucket for audio cache if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('audio-cache', 'audio-cache', true, 10485760, ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav'])
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public audio cache read access" ON storage.objects
FOR SELECT USING (bucket_id = 'audio-cache');

-- Allow service role to upload
CREATE POLICY "Service audio upload" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'audio-cache');