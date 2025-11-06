import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  user_id: string;
  template_code?: string;
  title?: string;
  message?: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  action_url?: string;
  action_label?: string;
  metadata?: Record<string, any>;
  language?: 'fr' | 'en';
  force_email?: boolean;
  force_browser?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const {
      user_id,
      template_code,
      title,
      message,
      category,
      priority,
      action_url,
      action_label,
      metadata = {},
      language = 'fr',
      force_email = false,
      force_browser = false
    } = await req.json() as NotificationRequest;

    if (!user_id) {
      throw new Error('user_id is required');
    }

    let notificationData: any = {
      user_id,
      category: category || 'general',
      priority: priority || 'medium',
      metadata,
    };

    let shouldSendEmail = force_email;
    let shouldSendBrowser = force_browser;

    // If template_code is provided, load template
    if (template_code) {
      const { data: template, error: templateError } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('code', template_code)
        .eq('is_active', true)
        .single();

      if (templateError || !template) {
        console.error('Template not found:', template_code);
        throw new Error(`Template not found: ${template_code}`);
      }

      // Replace variables in template
      const replaceVars = (text: string, vars: Record<string, any>) => {
        return Object.entries(vars).reduce((str, [key, value]) => {
          return str.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
        }, text);
      };

      notificationData = {
        ...notificationData,
        template_code,
        title: replaceVars(language === 'fr' ? template.title_fr : template.title_en, metadata),
        message: replaceVars(language === 'fr' ? template.message_fr : template.message_en, metadata),
        action_url: action_url || template.action_url,
        action_label: language === 'fr' ? template.action_label_fr : template.action_label_en,
        category: template.category,
        priority: template.priority,
      };

      shouldSendEmail = shouldSendEmail || template.send_email;
      shouldSendBrowser = shouldSendBrowser || template.send_browser;

      // Store email content if needed
      if (shouldSendEmail) {
        notificationData.email_subject = replaceVars(
          language === 'fr' ? template.email_subject_fr : template.email_subject_en,
          metadata
        );
        notificationData.email_body = replaceVars(
          language === 'fr' ? template.email_body_fr : template.email_body_en,
          metadata
        );
      }
    } else {
      // Custom notification
      if (!title || !message) {
        throw new Error('title and message are required when not using a template');
      }
      notificationData = {
        ...notificationData,
        title,
        message,
        action_url,
        action_label,
      };
    }

    // Insert in-app notification
    const { data: notification, error: insertError } = await supabase
      .from('app_notifications')
      .insert(notificationData)
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting notification:', insertError);
      throw insertError;
    }

    console.log('✅ In-app notification created:', notification.id);

    // Get user email and settings
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', user_id)
      .single();

    const { data: settings } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', user_id)
      .single();

    // Send email if needed
    if (shouldSendEmail && settings?.email_enabled && profile?.email) {
      try {
        const client = new SMTPClient({
          connection: {
            hostname: Deno.env.get('SMTP_HOST')!,
            port: parseInt(Deno.env.get('SMTP_PORT') || '465'),
            tls: true,
            auth: {
              username: Deno.env.get('SMTP_USER')!,
              password: Deno.env.get('SMTP_PASSWORD')!,
            },
          },
        });

        const emailSubject = notificationData.email_subject || notificationData.title;
        const emailBody = notificationData.email_body || `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>${notificationData.title}</h2>
            <p>${notificationData.message}</p>
            ${notificationData.action_url ? `
              <a href="${notificationData.action_url}" style="display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
                ${notificationData.action_label || (language === 'fr' ? 'Voir' : 'View')}
              </a>
            ` : ''}
          </div>
        `;

        await client.send({
          from: `${Deno.env.get('FROM_NAME')} <${Deno.env.get('FROM_EMAIL')}>`,
          to: profile.email,
          subject: emailSubject,
          html: emailBody,
        });

        await client.close();

        // Mark as sent
        await supabase
          .from('app_notifications')
          .update({ sent_email: true })
          .eq('id', notification.id);

        console.log('✅ Email sent to:', profile.email);
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
      }
    }

    // Send browser notification if needed
    if (shouldSendBrowser && settings?.browser_enabled) {
      // Browser notifications are handled client-side via realtime
      await supabase
        .from('app_notifications')
        .update({ sent_browser: true })
        .eq('id', notification.id);

      console.log('✅ Browser notification flagged');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        notification_id: notification.id,
        sent_email: shouldSendEmail && settings?.email_enabled,
        sent_browser: shouldSendBrowser && settings?.browser_enabled
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in send-notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);
