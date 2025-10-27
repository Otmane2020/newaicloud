-- Table pour les paramètres du chat
CREATE TABLE IF NOT EXISTS chat_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Style de l'assistant
  assistant_style TEXT DEFAULT 'friendly' CHECK (assistant_style IN ('friendly', 'professional', 'expert', 'casual')),
  tone TEXT DEFAULT 'informal' CHECK (tone IN ('formal', 'informal', 'humorous')),
  
  -- Paramètres de réponse
  default_language TEXT DEFAULT 'fr' CHECK (default_language IN ('fr', 'en', 'es', 'de', 'it')),
  response_length TEXT DEFAULT 'medium' CHECK (response_length IN ('short', 'medium', 'detailed')),
  
  -- Personnalisation avancée
  custom_instructions TEXT,
  save_history BOOLEAN DEFAULT true,
  
  -- Configuration Embed
  embed_enabled BOOLEAN DEFAULT false,
  embed_position TEXT DEFAULT 'bottom-right' CHECK (embed_position IN ('bottom-right', 'bottom-left', 'top-right', 'top-left')),
  embed_welcome_message TEXT DEFAULT 'Bonjour ! Comment puis-je vous aider ?',
  embed_primary_color TEXT DEFAULT '#3b82f6',
  embed_button_text TEXT DEFAULT 'Besoin d''aide ?',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE chat_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own chat settings"
  ON chat_settings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER update_chat_settings_updated_at
  BEFORE UPDATE ON chat_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Table pour le netlinking des articles
CREATE TABLE IF NOT EXISTS blog_netlinking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id UUID REFERENCES blog_articles(id) ON DELETE CASCADE,
  target_url TEXT NOT NULL,
  anchor_text TEXT NOT NULL,
  link_type TEXT CHECK (link_type IN ('internal', 'external')),
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_netlinking_user_id ON blog_netlinking(user_id);
CREATE INDEX IF NOT EXISTS idx_netlinking_article_id ON blog_netlinking(article_id);

-- RLS
ALTER TABLE blog_netlinking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own netlinking"
  ON blog_netlinking
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER update_blog_netlinking_updated_at
  BEFORE UPDATE ON blog_netlinking
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();