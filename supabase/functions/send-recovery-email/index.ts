import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "NewAI <noreply@newai.sale>";

interface RecoveryEmailRequest {
  email: string;
  template: string;
}

const templates = {
  onboarding_abandoned: {
    subject: "🎁 Votre essai gratuit vous attend - NewAI",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 20px 0; }
    .logo { font-size: 28px; font-weight: bold; color: #6366f1; }
    .content { background: #f8fafc; border-radius: 12px; padding: 30px; margin: 20px 0; }
    .cta { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
    .benefits { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .benefit { display: flex; align-items: center; margin: 10px 0; }
    .check { color: #22c55e; margin-right: 10px; }
    .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">NewAI</div>
    </div>
    
    <div class="content">
      <h1>Vous êtes si proche de booster vos ventes ! 🚀</h1>
      
      <p>Nous avons remarqué que vous avez créé un compte mais n'avez pas encore activé votre essai gratuit.</p>
      
      <p><strong>Bonne nouvelle :</strong> Votre essai gratuit de 7 jours vous attend toujours !</p>
      
      <div class="benefits">
        <h3>Ce que vous obtenez gratuitement :</h3>
        <div class="benefit"><span class="check">✓</span> Optimisation SEO automatique de vos produits</div>
        <div class="benefit"><span class="check">✓</span> Génération de landing pages par IA</div>
        <div class="benefit"><span class="check">✓</span> Amélioration des textes alternatifs d'images</div>
        <div class="benefit"><span class="check">✓</span> Articles de blog générés automatiquement</div>
        <div class="benefit"><span class="check">✓</span> Aucune carte bancaire requise pour essayer</div>
      </div>
      
      <center>
        <a href="https://newai.sale/onboarding" class="cta">
          Activer mon essai gratuit →
        </a>
      </center>
      
      <p style="color: #64748b; font-size: 14px;">
        PS: Cet essai est limité dans le temps. Ne ratez pas l'opportunité d'améliorer votre boutique !
      </p>
    </div>
    
    <div class="footer">
      <p>NewAI - L'IA au service de votre e-commerce</p>
      <p><a href="https://newai.sale">newai.sale</a></p>
    </div>
  </div>
</body>
</html>
    `
  },
  
  reminder_24h: {
    subject: "⏰ Plus que 24h pour profiter de -50% - NewAI",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 20px 0; }
    .logo { font-size: 28px; font-weight: bold; color: #6366f1; }
    .content { background: #f8fafc; border-radius: 12px; padding: 30px; margin: 20px 0; }
    .discount { background: linear-gradient(135deg, #ef4444, #f97316); color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
    .discount-code { font-size: 24px; font-weight: bold; letter-spacing: 2px; }
    .cta { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
    .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">NewAI</div>
    </div>
    
    <div class="content">
      <h1>🎉 Offre spéciale pour vous !</h1>
      
      <p>Parce que nous voulons vous aider à réussir, voici une offre exclusive :</p>
      
      <div class="discount">
        <p style="margin: 0;">Code promo</p>
        <div class="discount-code">WELCOME50</div>
        <p style="margin: 5px 0 0 0;">-50% sur votre premier mois</p>
      </div>
      
      <p>Cette offre expire dans <strong>24 heures</strong>. Ne la ratez pas !</p>
      
      <center>
        <a href="https://newai.sale/onboarding?promo=WELCOME50" class="cta">
          Profiter de l'offre →
        </a>
      </center>
    </div>
    
    <div class="footer">
      <p>NewAI - L'IA au service de votre e-commerce</p>
      <p><a href="https://newai.sale">newai.sale</a></p>
    </div>
  </div>
</body>
</html>
    `
  }
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, template }: RecoveryEmailRequest = await req.json();

    if (!email || !template) {
      return new Response(JSON.stringify({ error: "email and template are required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const emailTemplate = templates[template as keyof typeof templates];
    if (!emailTemplate) {
      return new Response(JSON.stringify({ error: "Invalid template" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (!RESEND_API_KEY) {
      console.log("📧 [MOCK] Would send email to:", email);
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Email would be sent (no API key configured)",
        mock: true 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Send email via Resend
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [email],
        subject: emailTemplate.subject,
        html: emailTemplate.html,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Resend API error: ${errorData}`);
    }

    const result = await response.json();

    // Log the email
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    await supabaseClient.from('email_logs').insert({
      recipient_email: email,
      subject: emailTemplate.subject,
      template_code: template,
      status: 'sent',
      sent_at: new Date().toISOString()
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Email sent successfully",
      id: result.id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error sending recovery email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
