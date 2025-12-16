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
  language?: "fr" | "en";
  variables?: {
    full_name?: string;
    plan_name?: string;
  };
}

// Templates bilingues
const templates = {
  onboarding_abandoned: {
    fr: {
      subject: "🎁 Votre essai gratuit vous attend - NewAI",
      html: `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f6f8fb; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 30px 0; }
    .logo { font-size: 32px; font-weight: bold; background: linear-gradient(135deg, #6366f1, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .content { background: white; border-radius: 16px; padding: 40px; margin: 20px 0; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    h1 { color: #1e293b; font-size: 24px; margin-bottom: 20px; }
    .cta { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white !important; padding: 16px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; margin: 25px 0; box-shadow: 0 4px 15px rgba(99,102,241,0.4); }
    .benefits { background: #f8fafc; border-radius: 12px; padding: 24px; margin: 24px 0; }
    .benefit { display: flex; align-items: center; margin: 12px 0; font-size: 15px; }
    .check { color: #22c55e; margin-right: 12px; font-size: 18px; }
    .footer { text-align: center; color: #64748b; font-size: 13px; margin-top: 30px; padding: 20px; }
    .footer a { color: #6366f1; text-decoration: none; }
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
        <h3 style="margin-top:0;">Ce que vous obtenez gratuitement :</h3>
        <div class="benefit"><span class="check">✓</span> Optimisation SEO automatique de vos produits</div>
        <div class="benefit"><span class="check">✓</span> Génération de landing pages par IA</div>
        <div class="benefit"><span class="check">✓</span> Amélioration des textes alternatifs d'images</div>
        <div class="benefit"><span class="check">✓</span> Articles de blog générés automatiquement</div>
        <div class="benefit"><span class="check">✓</span> Aucune carte bancaire requise</div>
      </div>
      <center>
        <a href="https://newai.sale/onboarding" class="cta">Activer mon essai gratuit →</a>
      </center>
      <p style="color: #64748b; font-size: 14px; margin-top: 20px;">
        PS: Cet essai est limité dans le temps. Ne ratez pas l'opportunité !
      </p>
    </div>
    <div class="footer">
      <p>NewAI - L'IA au service de votre e-commerce</p>
      <p><a href="https://newai.sale">newai.sale</a></p>
    </div>
  </div>
</body>
</html>`
    },
    en: {
      subject: "🎁 Your free trial is waiting - NewAI",
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f6f8fb; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 30px 0; }
    .logo { font-size: 32px; font-weight: bold; background: linear-gradient(135deg, #6366f1, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .content { background: white; border-radius: 16px; padding: 40px; margin: 20px 0; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    h1 { color: #1e293b; font-size: 24px; margin-bottom: 20px; }
    .cta { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white !important; padding: 16px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; margin: 25px 0; box-shadow: 0 4px 15px rgba(99,102,241,0.4); }
    .benefits { background: #f8fafc; border-radius: 12px; padding: 24px; margin: 24px 0; }
    .benefit { display: flex; align-items: center; margin: 12px 0; font-size: 15px; }
    .check { color: #22c55e; margin-right: 12px; font-size: 18px; }
    .footer { text-align: center; color: #64748b; font-size: 13px; margin-top: 30px; padding: 20px; }
    .footer a { color: #6366f1; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">NewAI</div>
    </div>
    <div class="content">
      <h1>You're so close to boosting your sales! 🚀</h1>
      <p>We noticed you created an account but haven't activated your free trial yet.</p>
      <p><strong>Good news:</strong> Your 7-day free trial is still waiting for you!</p>
      <div class="benefits">
        <h3 style="margin-top:0;">What you get for free:</h3>
        <div class="benefit"><span class="check">✓</span> Automatic SEO optimization for your products</div>
        <div class="benefit"><span class="check">✓</span> AI-powered landing page generation</div>
        <div class="benefit"><span class="check">✓</span> Image alt text improvement</div>
        <div class="benefit"><span class="check">✓</span> Automatically generated blog articles</div>
        <div class="benefit"><span class="check">✓</span> No credit card required</div>
      </div>
      <center>
        <a href="https://newai.sale/onboarding" class="cta">Activate my free trial →</a>
      </center>
      <p style="color: #64748b; font-size: 14px; margin-top: 20px;">
        PS: This trial is limited time. Don't miss out!
      </p>
    </div>
    <div class="footer">
      <p>NewAI - AI for your e-commerce success</p>
      <p><a href="https://newai.sale">newai.sale</a></p>
    </div>
  </div>
</body>
</html>`
    }
  },
  
  cart_abandoned: {
    fr: {
      subject: "🛒 Votre panier vous attend - NewAI",
      html: `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f6f8fb; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 30px 0; }
    .logo { font-size: 32px; font-weight: bold; background: linear-gradient(135deg, #6366f1, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .content { background: white; border-radius: 16px; padding: 40px; margin: 20px 0; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    h1 { color: #1e293b; font-size: 24px; margin-bottom: 20px; }
    .cta { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white !important; padding: 16px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; margin: 25px 0; box-shadow: 0 4px 15px rgba(99,102,241,0.4); }
    .cart-summary { background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 24px 0; }
    .footer { text-align: center; color: #64748b; font-size: 13px; margin-top: 30px; padding: 20px; }
    .footer a { color: #6366f1; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">NewAI</div>
    </div>
    <div class="content">
      <h1>Vous avez oublié quelque chose ! 🛒</h1>
      <p>Nous avons remarqué que vous n'avez pas finalisé votre inscription.</p>
      <div class="cart-summary">
        <h3 style="margin-top:0;">Votre sélection vous attend :</h3>
        <p>Finalisez votre inscription et commencez à optimiser votre boutique dès maintenant !</p>
      </div>
      <center>
        <a href="https://newai.sale/onboarding" class="cta">Finaliser mon inscription →</a>
      </center>
      <p style="color: #64748b; font-size: 14px;">
        Besoin d'aide ? Répondez à cet email, nous sommes là pour vous !
      </p>
    </div>
    <div class="footer">
      <p>NewAI - L'IA au service de votre e-commerce</p>
      <p><a href="https://newai.sale">newai.sale</a></p>
    </div>
  </div>
</body>
</html>`
    },
    en: {
      subject: "🛒 Your cart is waiting - NewAI",
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f6f8fb; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 30px 0; }
    .logo { font-size: 32px; font-weight: bold; background: linear-gradient(135deg, #6366f1, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .content { background: white; border-radius: 16px; padding: 40px; margin: 20px 0; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    h1 { color: #1e293b; font-size: 24px; margin-bottom: 20px; }
    .cta { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white !important; padding: 16px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; margin: 25px 0; box-shadow: 0 4px 15px rgba(99,102,241,0.4); }
    .cart-summary { background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 24px 0; }
    .footer { text-align: center; color: #64748b; font-size: 13px; margin-top: 30px; padding: 20px; }
    .footer a { color: #6366f1; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">NewAI</div>
    </div>
    <div class="content">
      <h1>You forgot something! 🛒</h1>
      <p>We noticed you didn't complete your registration.</p>
      <div class="cart-summary">
        <h3 style="margin-top:0;">Your selection is waiting:</h3>
        <p>Complete your registration and start optimizing your store now!</p>
      </div>
      <center>
        <a href="https://newai.sale/onboarding" class="cta">Complete my registration →</a>
      </center>
      <p style="color: #64748b; font-size: 14px;">
        Need help? Reply to this email, we're here for you!
      </p>
    </div>
    <div class="footer">
      <p>NewAI - AI for your e-commerce success</p>
      <p><a href="https://newai.sale">newai.sale</a></p>
    </div>
  </div>
</body>
</html>`
    }
  },
  
  reminder_24h: {
    fr: {
      subject: "⏰ Plus que 24h pour profiter de -50% - NewAI",
      html: `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f6f8fb; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 30px 0; }
    .logo { font-size: 32px; font-weight: bold; background: linear-gradient(135deg, #6366f1, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .content { background: white; border-radius: 16px; padding: 40px; margin: 20px 0; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    h1 { color: #1e293b; font-size: 24px; margin-bottom: 20px; }
    .discount { background: linear-gradient(135deg, #ef4444, #f97316); color: white; padding: 24px; border-radius: 12px; text-align: center; margin: 24px 0; }
    .discount-code { font-size: 28px; font-weight: bold; letter-spacing: 3px; margin: 10px 0; }
    .cta { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white !important; padding: 16px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; margin: 25px 0; box-shadow: 0 4px 15px rgba(99,102,241,0.4); }
    .footer { text-align: center; color: #64748b; font-size: 13px; margin-top: 30px; padding: 20px; }
    .footer a { color: #6366f1; text-decoration: none; }
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
        <p style="margin: 0; font-size: 14px;">Code promo</p>
        <div class="discount-code">WELCOME50</div>
        <p style="margin: 8px 0 0 0; font-size: 16px;">-50% sur votre premier mois</p>
      </div>
      <p>Cette offre expire dans <strong>24 heures</strong>. Ne la ratez pas !</p>
      <center>
        <a href="https://newai.sale/onboarding?promo=WELCOME50" class="cta">Profiter de l'offre →</a>
      </center>
    </div>
    <div class="footer">
      <p>NewAI - L'IA au service de votre e-commerce</p>
      <p><a href="https://newai.sale">newai.sale</a></p>
    </div>
  </div>
</body>
</html>`
    },
    en: {
      subject: "⏰ Only 24h left for -50% off - NewAI",
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f6f8fb; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 30px 0; }
    .logo { font-size: 32px; font-weight: bold; background: linear-gradient(135deg, #6366f1, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .content { background: white; border-radius: 16px; padding: 40px; margin: 20px 0; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    h1 { color: #1e293b; font-size: 24px; margin-bottom: 20px; }
    .discount { background: linear-gradient(135deg, #ef4444, #f97316); color: white; padding: 24px; border-radius: 12px; text-align: center; margin: 24px 0; }
    .discount-code { font-size: 28px; font-weight: bold; letter-spacing: 3px; margin: 10px 0; }
    .cta { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white !important; padding: 16px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; margin: 25px 0; box-shadow: 0 4px 15px rgba(99,102,241,0.4); }
    .footer { text-align: center; color: #64748b; font-size: 13px; margin-top: 30px; padding: 20px; }
    .footer a { color: #6366f1; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">NewAI</div>
    </div>
    <div class="content">
      <h1>🎉 Special offer just for you!</h1>
      <p>Because we want to help you succeed, here's an exclusive offer:</p>
      <div class="discount">
        <p style="margin: 0; font-size: 14px;">Promo code</p>
        <div class="discount-code">WELCOME50</div>
        <p style="margin: 8px 0 0 0; font-size: 16px;">50% off your first month</p>
      </div>
      <p>This offer expires in <strong>24 hours</strong>. Don't miss it!</p>
      <center>
        <a href="https://newai.sale/onboarding?promo=WELCOME50" class="cta">Claim my offer →</a>
      </center>
    </div>
    <div class="footer">
      <p>NewAI - AI for your e-commerce success</p>
      <p><a href="https://newai.sale">newai.sale</a></p>
    </div>
  </div>
</body>
</html>`
    }
  }
};

// Detect language from email domain or name
function detectLanguage(email: string, fullName?: string): "fr" | "en" {
  // French TLDs and patterns
  const frenchIndicators = ['.fr', '.be', '.ch', '.ca', '.mc', '.lu'];
  const frenchNames = ['jean', 'marie', 'pierre', 'françois', 'philippe', 'nicolas', 'laurent', 'thierry'];
  
  const emailLower = email.toLowerCase();
  const nameLower = (fullName || '').toLowerCase();
  
  // Check email domain
  for (const indicator of frenchIndicators) {
    if (emailLower.endsWith(indicator)) return 'fr';
  }
  
  // Check name patterns
  for (const name of frenchNames) {
    if (nameLower.includes(name)) return 'fr';
  }
  
  // Default to French for European domains
  if (emailLower.includes('.eu')) return 'fr';
  
  // Default to English for .com, .net, etc.
  if (emailLower.endsWith('.com') || emailLower.endsWith('.net') || emailLower.endsWith('.org')) {
    return 'en';
  }
  
  // Default French
  return 'fr';
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, template, language, variables }: RecoveryEmailRequest = await req.json();

    console.log(`[send-recovery-email] Processing: email=${email}, template=${template}, language=${language}`);

    if (!email || !template) {
      return new Response(JSON.stringify({ error: "email and template are required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const templateGroup = templates[template as keyof typeof templates];
    if (!templateGroup) {
      return new Response(JSON.stringify({ error: "Invalid template" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Determine language: explicit > detected
    const detectedLang = language || detectLanguage(email, variables?.full_name);
    const emailTemplate = templateGroup[detectedLang];
    
    console.log(`[send-recovery-email] Using language: ${detectedLang}`);

    if (!RESEND_API_KEY) {
      console.log("📧 [MOCK] Would send email to:", email, "in language:", detectedLang);
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Email would be sent (no API key configured)",
        mock: true,
        language: detectedLang
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
      console.error(`[send-recovery-email] Resend error: ${errorData}`);
      throw new Error(`Resend API error: ${errorData}`);
    }

    const result = await response.json();
    console.log(`[send-recovery-email] Email sent successfully: ${result.id}`);

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
      sent_at: new Date().toISOString(),
      metadata: { language: detectedLang }
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Email sent successfully",
      id: result.id,
      language: detectedLang
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("[send-recovery-email] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
