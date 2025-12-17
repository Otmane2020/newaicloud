-- ✅ CORRECTION 2 — Ajouter category à ai_answers pour analytics
ALTER TABLE ai_answers ADD COLUMN IF NOT EXISTS category text;

-- Index pour analytics par catégorie
CREATE INDEX IF NOT EXISTS idx_ai_answers_category ON ai_answers(category);