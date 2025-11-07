import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const welcomeEmailSchema = z.object({
  email: z.string().email().max(255),
  fullName: z.string().trim().min(1).max(100),
  language: z.enum(['fr', 'en']).optional(),
});

interface WelcomeEmailRequest {
  email: string;
  fullName: string;
  language?: 'fr' | 'en';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    
    // Validate input
    const validation = welcomeEmailSchema.safeParse(requestBody);
    if (!validation.success) {
      console.error('Invalid input:', validation.error.errors);
      return new Response(
        JSON.stringify({ error: 'Invalid input data' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    const { email, fullName, language = 'fr' } = validation.data;
    
    console.log('Sending welcome email to:', email);

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

    const translations = {
      fr: {
        subject: 'Bienvenue sur New AI !',
        title: 'Bienvenue sur New AI !',
        greeting: 'Bonjour',
        thankYou: 'Merci de vous être inscrit sur New AI, votre plateforme d\'optimisation SEO pour Shopify !',
        message: 'Nous sommes ravis de vous compter parmi nous. Vous pouvez dès maintenant accéder à toutes nos fonctionnalités pour booster votre visibilité en ligne.',
        button: 'Accéder à mon compte',
        signature: 'À très bientôt,<br>L\'équipe New AI'
      },
      en: {
        subject: 'Welcome to New AI!',
        title: 'Welcome to New AI!',
        greeting: 'Hello',
        thankYou: 'Thank you for signing up to New AI, your SEO optimization platform for Shopify!',
        message: 'We are delighted to have you with us. You can now access all our features to boost your online visibility.',
        button: 'Access my account',
        signature: 'See you soon,<br>The New AI Team'
      }
    };

    const t = translations[language];

    await client.send({
      from: `${Deno.env.get('FROM_NAME')} <${Deno.env.get('FROM_EMAIL')}>`,
      to: email,
      subject: t.subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${t.title}</h1>
            </div>
            <div class="content">
              <h2>${t.greeting} ${fullName || (language === 'fr' ? 'cher utilisateur' : 'dear user')} 👋</h2>
              <p>${t.thankYou}</p>
              <p>${t.message}</p>
              <a href="${Deno.env.get('SUPABASE_URL')?.replace('https://nekqqlhrjgmyudmmewas.supabase.co', 'https://affable-calm-newai.lovable.app')}/dashboard" class="button">${t.button}</a>
              <p>${t.signature}</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    await client.close();
    
    console.log('Welcome email sent successfully to:', email);

    return new Response(
      JSON.stringify({ success: true, message: 'Email envoyé avec succès' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error: any) {
    // Log detailed error for debugging
    console.error('Email sending failed:', error.message || error);
    console.error('SMTP config check:', {
      hasHost: !!Deno.env.get('SMTP_HOST'),
      hasPort: !!Deno.env.get('SMTP_PORT'),
      hasUser: !!Deno.env.get('SMTP_USER'),
      hasPassword: !!Deno.env.get('SMTP_PASSWORD'),
      hasFromName: !!Deno.env.get('FROM_NAME'),
      hasFromEmail: !!Deno.env.get('FROM_EMAIL'),
    });
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send email',
        details: error.message || 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
