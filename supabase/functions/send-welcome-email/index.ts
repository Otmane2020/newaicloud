import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WelcomeEmailRequest {
  email: string;
  fullName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName }: WelcomeEmailRequest = await req.json();
    
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

    await client.send({
      from: `${Deno.env.get('FROM_NAME')} <${Deno.env.get('FROM_EMAIL')}>`,
      to: email,
      subject: 'Bienvenue sur New AI !',
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
              <h1>Bienvenue sur New AI !</h1>
            </div>
            <div class="content">
              <h2>Bonjour ${fullName || 'cher utilisateur'} 👋</h2>
              <p>Merci de vous être inscrit sur New AI, votre plateforme d'optimisation SEO pour Shopify !</p>
              <p>Nous sommes ravis de vous compter parmi nous. Vous pouvez dès maintenant accéder à toutes nos fonctionnalités pour booster votre visibilité en ligne.</p>
              <a href="${Deno.env.get('SUPABASE_URL')?.replace('https://nekqqlhrjgmyudmmewas.supabase.co', 'https://affable-calm-newai.lovable.app')}/dashboard" class="button">Accéder à mon compte</a>
              <p>À très bientôt,<br>L'équipe New AI</p>
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
    console.error('Error sending welcome email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
