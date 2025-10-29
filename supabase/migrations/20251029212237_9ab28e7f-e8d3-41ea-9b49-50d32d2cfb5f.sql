-- Create translations table for centralized translation management
CREATE TABLE translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  language TEXT NOT NULL,
  value TEXT NOT NULL,
  context TEXT,
  ai_generated BOOLEAN DEFAULT FALSE,
  reviewed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(key, language)
);

-- Create indexes for performance
CREATE INDEX idx_translations_key_lang ON translations(key, language);
CREATE INDEX idx_translations_language ON translations(language);

-- Enable RLS
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read translations
CREATE POLICY "Anyone can read translations"
  ON translations FOR SELECT
  USING (true);

-- Policy: Only admins can modify translations
CREATE POLICY "Only admins can modify translations"
  ON translations FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE translations;