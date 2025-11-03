-- Phase 1: Corriger le check constraint de content_images pour inclure 'homepage'
ALTER TABLE content_images 
DROP CONSTRAINT IF EXISTS content_images_content_type_check;

ALTER TABLE content_images 
ADD CONSTRAINT content_images_content_type_check 
CHECK (content_type IN ('product', 'collection', 'page', 'article', 'homepage'));

-- Phase 2: Créer la table seo_audit_history
CREATE TABLE IF NOT EXISTS seo_audit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES shopify_connections(id) ON DELETE CASCADE,
  
  -- Audit data
  score INTEGER NOT NULL,
  grade TEXT,
  breakdown JSONB,
  issues JSONB,
  warnings JSONB,
  strengths JSONB,
  recommendations JSONB,
  elements JSONB,
  analyzed_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_seo_audit_history_user_id ON seo_audit_history(user_id);
CREATE INDEX IF NOT EXISTS idx_seo_audit_history_created_at ON seo_audit_history(created_at DESC);

-- RLS Policies pour seo_audit_history
ALTER TABLE seo_audit_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own audit history"
  ON seo_audit_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own audit history"
  ON seo_audit_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Phase 3: Ajouter contrainte unique sur seo_audit_reports.user_id
ALTER TABLE seo_audit_reports 
ADD CONSTRAINT seo_audit_reports_user_id_unique 
UNIQUE (user_id);