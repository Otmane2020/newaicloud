-- Create SEO challenges table
CREATE TABLE IF NOT EXISTS public.seo_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  challenge_type TEXT NOT NULL, -- 'daily', 'weekly', 'achievement'
  category TEXT NOT NULL, -- 'optimization', 'ranking', 'traffic', 'quality'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target_value INTEGER NOT NULL,
  current_value INTEGER DEFAULT 0,
  reward_points INTEGER DEFAULT 10,
  difficulty TEXT NOT NULL DEFAULT 'medium', -- 'easy', 'medium', 'hard'
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'completed', 'expired'
  expires_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seo_challenges ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own challenges"
  ON public.seo_challenges
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own challenges"
  ON public.seo_challenges
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert challenges"
  ON public.seo_challenges
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update challenges"
  ON public.seo_challenges
  FOR UPDATE
  USING (true);

-- Create index for performance
CREATE INDEX idx_seo_challenges_user_id ON public.seo_challenges(user_id);
CREATE INDEX idx_seo_challenges_status ON public.seo_challenges(status);
CREATE INDEX idx_seo_challenges_expires_at ON public.seo_challenges(expires_at);

-- Add notification templates for SEO challenges
INSERT INTO public.notification_templates (
  code, name, category, priority,
  title_fr, title_en,
  message_fr, message_en,
  email_subject_fr, email_subject_en,
  email_body_fr, email_body_en,
  action_label_fr, action_label_en,
  action_url,
  send_email, send_in_app, send_browser, is_active
) VALUES
(
  'seo_challenge_new',
  'New SEO Challenge',
  'seo',
  'medium',
  'Nouveau Défi SEO !',
  'New SEO Challenge!',
  'Un nouveau défi vous attend : {{title}}. Objectif : {{target}}',
  'A new challenge awaits: {{title}}. Target: {{target}}',
  'Nouveau Défi SEO - {{title}}',
  'New SEO Challenge - {{title}}',
  '<h2>🎯 Nouveau Défi SEO</h2><p><strong>{{title}}</strong></p><p>{{description}}</p><p>Objectif : <strong>{{target}}</strong></p>',
  '<h2>🎯 New SEO Challenge</h2><p><strong>{{title}}</strong></p><p>{{description}}</p><p>Target: <strong>{{target}}</strong></p>',
  'Voir le défi',
  'View Challenge',
  '/dashboard',
  true, true, true, true
),
(
  'seo_challenge_completed',
  'SEO Challenge Completed',
  'seo',
  'high',
  '🏆 Défi Terminé !',
  '🏆 Challenge Completed!',
  'Félicitations ! Vous avez complété le défi : {{title}}. +{{points}} points',
  'Congratulations! You completed the challenge: {{title}}. +{{points}} points',
  'Défi SEO Complété - {{title}}',
  'SEO Challenge Completed - {{title}}',
  '<h2>🏆 Félicitations !</h2><p>Vous avez complété le défi <strong>{{title}}</strong></p><p>Récompense : <strong>+{{points}} points</strong></p>',
  '<h2>🏆 Congratulations!</h2><p>You completed the challenge <strong>{{title}}</strong></p><p>Reward: <strong>+{{points}} points</strong></p>',
  'Voir mes défis',
  'View My Challenges',
  '/dashboard',
  true, true, true, true
),
(
  'seo_optimization_complete',
  'SEO Optimization Complete',
  'seo',
  'medium',
  'Optimisation Terminée',
  'Optimization Complete',
  '{{count}} produit(s) optimisé(s) avec succès',
  '{{count}} product(s) optimized successfully',
  'Optimisation SEO Terminée',
  'SEO Optimization Complete',
  '<h2>✅ Optimisation Terminée</h2><p><strong>{{count}} produit(s)</strong> ont été optimisés avec succès.</p>',
  '<h2>✅ Optimization Complete</h2><p><strong>{{count}} product(s)</strong> have been optimized successfully.</p>',
  'Voir les produits',
  'View Products',
  '/seo',
  false, true, true, true
)
ON CONFLICT (code) DO UPDATE SET
  title_fr = EXCLUDED.title_fr,
  title_en = EXCLUDED.title_en,
  message_fr = EXCLUDED.message_fr,
  message_en = EXCLUDED.message_en,
  email_subject_fr = EXCLUDED.email_subject_fr,
  email_subject_en = EXCLUDED.email_subject_en,
  email_body_fr = EXCLUDED.email_body_fr,
  email_body_en = EXCLUDED.email_body_en,
  updated_at = now();