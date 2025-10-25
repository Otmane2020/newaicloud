import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResetPasswordRequest {
  email: string;
  resetLink: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, resetLink }: ResetPasswordRequest = await req.json();
    
    console.log('Sending password reset email to:', email);

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
      subject: 'Réinitialisation de votre mot de passe - New AI',
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
            .warning { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Réinitialisation de mot de passe</h1>
            </div>
            <div class="content">
              <h2>Bonjour 👋</h2>
              <p>Vous avez demandé à réinitialiser votre mot de passe pour votre compte New AI.</p>
              <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
              <a href="${resetLink}" class="button">Réinitialiser mon mot de passe</a>
              <div class="warning">
                <strong>⚠️ Important :</strong> Ce lien est valable pendant 1 heure. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
              </div>
              <p>Cordialement,<br>L'équipe New AI</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    await client.close();
    
    console.log('Password reset email sent successfully to:', email);

    return new Response(
      JSON.stringify({ success: true, message: 'Email envoyé avec succès' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error('Error sending reset password email:', error);
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
