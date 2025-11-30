-- Table for uploaded video clips
CREATE TABLE video_clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  category TEXT DEFAULT 'demo',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for video ad projects
CREATE TABLE video_ad_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  template_type TEXT DEFAULT 'storytelling',
  storyboard JSONB DEFAULT '[]'::jsonb,
  effects_config JSONB DEFAULT '{}'::jsonb,
  texts JSONB DEFAULT '{}'::jsonb,
  format TEXT DEFAULT '9:16',
  status TEXT DEFAULT 'draft',
  exported_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE video_clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_ad_projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for video_clips
CREATE POLICY "Users can manage own clips" ON video_clips
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for video_ad_projects
CREATE POLICY "Users can manage own projects" ON video_ad_projects
  FOR ALL USING (auth.uid() = user_id);

-- Storage bucket for video clips
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'video-clips',
  'video-clips',
  true,
  104857600,
  ARRAY['video/mp4', 'video/webm', 'video/quicktime']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload video clips"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'video-clips' AND auth.role() = 'authenticated');

CREATE POLICY "Public can view video clips"
ON storage.objects FOR SELECT
USING (bucket_id = 'video-clips');

CREATE POLICY "Users can delete own video clips"
ON storage.objects FOR DELETE
USING (bucket_id = 'video-clips' AND auth.uid()::text = (storage.foldername(name))[1]);