-- Create email_templates table for pre-configured email templates
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  html_body TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for email templates
CREATE POLICY "Admins can view templates"
  ON public.email_templates FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create templates"
  ON public.email_templates FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update templates"
  ON public.email_templates FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete templates"
  ON public.email_templates FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default templates
INSERT INTO public.email_templates (name, subject, body, html_body, category, variables) VALUES
(
  'Bienvenue',
  'Bienvenue sur NewAI, {{nom}} !',
  'Bonjour {{nom}},

Bienvenue sur NewAI ! Nous sommes ravis de vous compter parmi nos utilisateurs.

Votre compte est actuellement sur le plan {{plan}}.

Si vous avez des questions, n''hésitez pas à nous contacter.

Cordialement,
L''équipe NewAI',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb;">Bienvenue sur NewAI, {{nom}} !</h2>
    <p>Bonjour <strong>{{nom}}</strong>,</p>
    <p>Nous sommes ravis de vous compter parmi nos utilisateurs.</p>
    <p>Votre compte est actuellement sur le plan <strong>{{plan}}</strong>.</p>
    <p>Si vous avez des questions, n''hésitez pas à nous contacter.</p>
    <p>Cordialement,<br><strong>L''équipe NewAI</strong></p>
  </div>',
  'onboarding',
  '["nom", "plan", "email"]'::jsonb
),
(
  'Réponse Support',
  'Re: {{subject}}',
  'Bonjour {{nom}},

Merci de nous avoir contacté concernant {{subject}}.

Nous avons bien reçu votre demande et notre équipe l''examine actuellement.

Nous reviendrons vers vous sous 24-48h.

Cordialement,
L''équipe Support NewAI',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb;">Re: {{subject}}</h2>
    <p>Bonjour <strong>{{nom}}</strong>,</p>
    <p>Merci de nous avoir contacté concernant <strong>{{subject}}</strong>.</p>
    <p>Nous avons bien reçu votre demande et notre équipe l''examine actuellement.</p>
    <p>Nous reviendrons vers vous sous 24-48h.</p>
    <p>Cordialement,<br><strong>L''équipe Support NewAI</strong></p>
  </div>',
  'support',
  '["nom", "email", "subject"]'::jsonb
),
(
  'Upgrade Plan',
  'Passez au plan supérieur - Offre spéciale',
  'Bonjour {{nom}},

Vous êtes actuellement sur le plan {{plan}}.

Nous avons une offre spéciale pour vous permettre de passer au plan supérieur avec -20% pendant 3 mois !

Contactez-nous pour en savoir plus.

Cordialement,
L''équipe NewAI',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 10px;">
    <h2 style="color: white;">🚀 Offre Spéciale Upgrade !</h2>
    <p>Bonjour <strong>{{nom}}</strong>,</p>
    <p>Vous êtes actuellement sur le plan <strong>{{plan}}</strong>.</p>
    <p style="font-size: 18px; font-weight: bold; background: rgba(255,255,255,0.2); padding: 15px; border-radius: 5px; text-align: center;">
      -20% pendant 3 mois sur le plan supérieur !
    </p>
    <p>Contactez-nous pour en savoir plus.</p>
    <p>Cordialement,<br><strong>L''équipe NewAI</strong></p>
  </div>',
  'sales',
  '["nom", "plan", "email"]'::jsonb
);

-- Add trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add email_opened_at and email_replied_at to admin_emails for stats
ALTER TABLE public.admin_emails 
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS response_time_seconds INTEGER;