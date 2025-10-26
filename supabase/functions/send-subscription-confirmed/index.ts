import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, planName, trialEnd, fullName } = await req.json();

    console.log('📧 Sending subscription confirmation email to:', email);

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

    const trialEndDate = trialEnd ? new Date(trialEnd).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }) : null;

    await client.send({
      from: `${Deno.env.get('FROM_NAME')} <${Deno.env.get('FROM_EMAIL')}>`,
      to: email,
      subject: '🎉 Bienvenue sur NewAI ! Votre essai gratuit a commencé',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .trial-box { background: #fff; border: 2px solid #667eea; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Félicitations ${fullName || ''} !</h1>
            </div>
            <div class="content">
              <p>Votre abonnement <strong>${planName}</strong> est maintenant actif.</p>
              
              ${trialEnd ? `
                <div class="trial-box">
                  <h2>✨ Essai gratuit jusqu'au ${trialEndDate}</h2>
                  <p>Profitez de toutes les fonctionnalités premium sans limite pendant 14 jours.</p>
                  <p><strong>Aucun débit ne sera effectué durant cette période.</strong></p>
                </div>
              ` : ''}
              
              <p>Vous pouvez dès maintenant :</p>
              <ul>
                <li>✅ Importer vos produits Shopify</li>
                <li>✅ Optimiser votre SEO avec l'IA</li>
                <li>✅ Générer des articles de blog automatiquement</li>
                <li>✅ Utiliser l'assistant IA pour vos questions</li>
              </ul>
              
              <div style="text-align: center;">
                <a href="https://affable-calm-newai.lovable.app/dashboard" class="button">
                  Accéder à mon Dashboard
                </a>
              </div>
              
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
              
              <p><strong>💳 Gestion de votre facturation</strong></p>
              <p>Toute votre facturation est gérée de manière sécurisée par Stripe. Vous pouvez :</p>
              <ul>
                <li>Modifier votre moyen de paiement</li>
                <li>Consulter vos factures</li>
                <li>Annuler votre abonnement à tout moment</li>
              </ul>
              
              <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
              
              <div class="footer">
                <p>À très bientôt,<br><strong>L'équipe NewAI</strong></p>
                <p style="margin-top: 20px; color: #999;">
                  Cet email a été envoyé automatiquement suite à votre inscription.
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    await client.close();

    console.log('✅ Subscription confirmation email sent successfully');

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('❌ Error sending subscription confirmation email');
    return new Response(
      JSON.stringify({ error: 'Failed to send email' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
