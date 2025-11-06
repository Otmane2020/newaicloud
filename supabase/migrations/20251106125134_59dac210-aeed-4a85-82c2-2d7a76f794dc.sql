-- Create notification_templates table
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  title_fr TEXT NOT NULL,
  title_en TEXT NOT NULL,
  message_fr TEXT NOT NULL,
  message_en TEXT NOT NULL,
  email_subject_fr TEXT,
  email_subject_en TEXT,
  email_body_fr TEXT,
  email_body_en TEXT,
  action_label_fr TEXT,
  action_label_en TEXT,
  action_url TEXT,
  send_email BOOLEAN DEFAULT false,
  send_in_app BOOLEAN DEFAULT true,
  send_browser BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create app_notifications table (unified notifications)
CREATE TABLE IF NOT EXISTS app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_code TEXT REFERENCES notification_templates(code),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  category TEXT NOT NULL,
  action_url TEXT,
  action_label TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT false,
  is_completed BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  sent_email BOOLEAN DEFAULT false,
  sent_browser BOOLEAN DEFAULT false,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_app_notifications_user_id ON app_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_app_notifications_is_read ON app_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_app_notifications_created_at ON app_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_templates_code ON notification_templates(code);

-- Enable RLS
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_templates (read-only for authenticated users)
CREATE POLICY "Users can view active templates"
  ON notification_templates FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS Policies for app_notifications
CREATE POLICY "Users can view their own notifications"
  ON app_notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON app_notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON app_notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role can insert notifications
CREATE POLICY "Service role can insert notifications"
  ON app_notifications FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_app_notifications_updated_at
  BEFORE UPDATE ON app_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default notification templates
INSERT INTO notification_templates (code, name, category, priority, title_fr, title_en, message_fr, message_en, email_subject_fr, email_subject_en, email_body_fr, email_body_en, action_label_fr, action_label_en, action_url, send_email, send_in_app) VALUES
('bulk_optimization_complete', 'Optimisation en masse terminée', 'optimization', 'high', 
  'Optimisation terminée ! 🎉', 'Optimization Complete! 🎉',
  '{{count}} produits ont été optimisés avec succès. Vos changements sont prêts à être synchronisés avec Shopify.', 
  '{{count}} products have been successfully optimized. Your changes are ready to be synced with Shopify.',
  '✅ Optimisation terminée : {{count}} produits', '✅ Optimization Complete: {{count}} products',
  '<p>Bonjour,</p><p>Votre optimisation en masse est terminée !</p><p><strong>{{count}} produits</strong> ont été optimisés avec succès.</p><p>Vos modifications sont prêtes à être synchronisées avec Shopify.</p>',
  '<p>Hello,</p><p>Your bulk optimization is complete!</p><p><strong>{{count}} products</strong> have been successfully optimized.</p><p>Your changes are ready to be synced with Shopify.</p>',
  'Voir les produits', 'View Products', '/products', true, true),

('quota_warning', 'Alerte quota', 'usage', 'high',
  '⚠️ Quota presque atteint', '⚠️ Quota Almost Reached',
  'Vous avez utilisé {{usage}}% de votre quota mensuel. Pensez à mettre à niveau votre plan pour continuer.',
  'You have used {{usage}}% of your monthly quota. Consider upgrading your plan to continue.',
  '⚠️ Votre quota est presque atteint ({{usage}}%)', '⚠️ Your quota is almost reached ({{usage}}%)',
  '<p>Bonjour,</p><p>Vous avez utilisé <strong>{{usage}}%</strong> de votre quota mensuel.</p><p>Pensez à mettre à niveau votre plan pour continuer à bénéficier de toutes les fonctionnalités.</p>',
  '<p>Hello,</p><p>You have used <strong>{{usage}}%</strong> of your monthly quota.</p><p>Consider upgrading your plan to continue benefiting from all features.</p>',
  'Mettre à niveau', 'Upgrade', '/subscription', true, true),

('quota_exceeded', 'Quota dépassé', 'usage', 'high',
  '🚫 Quota mensuel atteint', '🚫 Monthly Quota Reached',
  'Vous avez atteint votre quota mensuel. Mettez à niveau votre plan pour continuer.',
  'You have reached your monthly quota. Upgrade your plan to continue.',
  '🚫 Quota mensuel atteint', '🚫 Monthly Quota Reached',
  '<p>Bonjour,</p><p>Vous avez atteint votre quota mensuel.</p><p>Pour continuer à utiliser toutes les fonctionnalités, veuillez mettre à niveau votre plan.</p>',
  '<p>Hello,</p><p>You have reached your monthly quota.</p><p>To continue using all features, please upgrade your plan.</p>',
  'Mettre à niveau', 'Upgrade', '/subscription', true, true),

('sync_complete', 'Synchronisation terminée', 'sync', 'medium',
  '✅ Synchronisation Shopify terminée', '✅ Shopify Sync Complete',
  '{{count}} produits ont été synchronisés avec Shopify avec succès.',
  '{{count}} products have been successfully synced with Shopify.',
  '✅ Synchronisation Shopify : {{count}} produits', '✅ Shopify Sync: {{count}} products',
  '<p>Bonjour,</p><p>La synchronisation avec Shopify est terminée.</p><p><strong>{{count}} produits</strong> ont été synchronisés avec succès.</p>',
  '<p>Hello,</p><p>The Shopify sync is complete.</p><p><strong>{{count}} products</strong> have been successfully synced.</p>',
  'Voir les produits', 'View Products', '/products', false, true),

('seo_audit_ready', 'Audit SEO prêt', 'seo', 'medium',
  '📊 Votre audit SEO est prêt', '📊 Your SEO Audit is Ready',
  'Votre audit SEO complet est disponible. Découvrez les recommandations pour améliorer votre visibilité.',
  'Your complete SEO audit is available. Discover recommendations to improve your visibility.',
  '📊 Audit SEO disponible', '📊 SEO Audit Available',
  '<p>Bonjour,</p><p>Votre audit SEO complet est maintenant disponible.</p><p>Découvrez les recommandations personnalisées pour améliorer votre visibilité en ligne.</p>',
  '<p>Hello,</p><p>Your complete SEO audit is now available.</p><p>Discover personalized recommendations to improve your online visibility.</p>',
  'Voir l''audit', 'View Audit', '/seo?tab=audit', false, true),

('article_generated', 'Article généré', 'blog', 'low',
  '✍️ Nouvel article généré', '✍️ New Article Generated',
  'Un nouvel article de blog a été généré : "{{title}}"',
  'A new blog article has been generated: "{{title}}"',
  '✍️ Nouvel article : {{title}}', '✍️ New Article: {{title}}',
  '<p>Bonjour,</p><p>Un nouvel article de blog a été généré pour vous :</p><p><strong>{{title}}</strong></p><p>Vous pouvez le consulter et le publier depuis votre tableau de bord.</p>',
  '<p>Hello,</p><p>A new blog article has been generated for you:</p><p><strong>{{title}}</strong></p><p>You can review and publish it from your dashboard.</p>',
  'Voir l''article', 'View Article', '/blog/articles', false, true);

-- Enable realtime for app_notifications
ALTER PUBLICATION supabase_realtime ADD TABLE app_notifications;