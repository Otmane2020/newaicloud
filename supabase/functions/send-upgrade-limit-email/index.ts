import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const upgradeLimitSchema = z.object({
  email: z.string().email().max(255),
  fullName: z.string().trim().min(1).max(100),
  currentPlan: z.string(),
  usageCount: z.number(),
  limitCount: z.number(),
  language: z.enum(["fr", "en"]).optional(),
});

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();

    const validation = upgradeLimitSchema.safeParse(requestBody);
    if (!validation.success) {
      console.error("Invalid input:", validation.error.errors);
      return new Response(JSON.stringify({ error: "Invalid input data" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { email, fullName, currentPlan, usageCount, limitCount, language = "fr" } = validation.data;

    console.log("Sending upgrade limit email to:", email);

    const translations = {
      fr: {
        subject: "Limite d'optimisations atteinte - Passez à un plan supérieur ! 🚀",
        title: "Limite atteinte",
        greeting: "Bonjour",
        message: `Vous avez utilisé <strong>${usageCount}/${limitCount}</strong> optimisations de votre plan <strong>${currentPlan}</strong>.`,
        upgrade: "Pour continuer à optimiser votre boutique Shopify sans limite, passez à un plan supérieur et débloquez plus de fonctionnalités !",
        benefits: "Avantages du plan supérieur :",
        benefit1: "✓ Plus d'optimisations mensuelles",
        benefit2: "✓ Génération d'articles illimitée",
        benefit3: "✓ Support prioritaire",
        benefit4: "✓ Fonctionnalités avancées",
        button: "Voir les plans",
        signature: "À très bientôt,<br>L'équipe New AI",
        footer: "New AI - Optimisez votre SEO Shopify",
      },
      en: {
        subject: "Optimization limit reached - Upgrade now! 🚀",
        title: "Limit Reached",
        greeting: "Hello",
        message: `You have used <strong>${usageCount}/${limitCount}</strong> optimizations from your <strong>${currentPlan}</strong> plan.`,
        upgrade: "To continue optimizing your Shopify store without limits, upgrade to a higher plan and unlock more features!",
        benefits: "Higher plan benefits:",
        benefit1: "✓ More monthly optimizations",
        benefit2: "✓ Unlimited article generation",
        benefit3: "✓ Priority support",
        benefit4: "✓ Advanced features",
        button: "View plans",
        signature: "See you soon,<br>The New AI Team",
        footer: "New AI - Optimize your Shopify SEO",
      },
    };

    const t = translations[language];

    const emailHtml = `
      <!DOCTYPE html>
      <html lang="${language}" style="margin:0;padding:0;">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${t.title}</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            background: #f7f9fc;
            font-family: 'Inter', Arial, sans-serif;
            color: #1a1a1a;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 2px 20px rgba(0,0,0,0.06);
          }
          .header {
            text-align: center;
            padding: 56px 24px 48px;
            background: linear-gradient(135deg, #F59E0B, #EF4444);
            color: white;
          }
          .brand-title {
            font-size: 34px;
            font-weight: 800;
            margin: 0;
            letter-spacing: -0.5px;
            color: #fff;
          }
          .brand-subtitle {
            margin-top: 6px;
            font-size: 15px;
            color: rgba(255,255,255,0.85);
            letter-spacing: 0.5px;
            font-weight: 500;
          }
          .content {
            padding: 40px 30px;
            line-height: 1.6;
          }
          .content h2 {
            font-size: 20px;
            margin-top: 0;
            color: #0d1117;
          }
          .content p {
            margin-bottom: 18px;
            color: #444;
          }
          .cta {
            text-align: center;
            margin: 36px 0 20px;
          }
          .cta a {
            background: linear-gradient(135deg, #F59E0B, #EF4444);
            color: white;
            text-decoration: none;
            padding: 14px 34px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 15px;
            display: inline-block;
          }
          .usage-bar {
            background: #E5E7EB;
            border-radius: 8px;
            height: 12px;
            margin: 20px 0;
            overflow: hidden;
          }
          .usage-fill {
            background: linear-gradient(90deg, #EF4444 0%, #F59E0B 100%);
            height: 100%;
            width: ${(usageCount / limitCount) * 100}%;
          }
          .benefits-box {
            background: #F0F9FF;
            border-left: 4px solid #3B82F6;
            padding: 20px;
            margin: 20px 0;
            border-radius: 6px;
          }
          .benefits-title {
            color: #1e40af;
            font-weight: 600;
            margin-bottom: 12px;
            font-size: 16px;
          }
          .benefit {
            color: #1e40af;
            margin: 8px 0;
            font-size: 15px;
          }
          .footer {
            text-align: center;
            padding: 24px;
            background: #f2f4f7;
            font-size: 13px;
            color: #7a869a;
          }
          .footer a {
            color: #3B82F6;
            text-decoration: none;
          }
          @media (max-width: 480px) {
            .header, .content, .footer {
              padding: 24px 18px;
            }
            .brand-title {
              font-size: 28px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="brand-title">NewAI</h1>
            <p class="brand-subtitle">⚡ ${t.title}</p>
          </div>
          
          <div class="content">
            <h2>${t.greeting} ${fullName} 👋</h2>
            <p>${t.message}</p>
            
            <div class="usage-bar">
              <div class="usage-fill"></div>
            </div>
            
            <p>${t.upgrade}</p>
            
            <div class="benefits-box">
              <div class="benefits-title">${t.benefits}</div>
              <div class="benefit">${t.benefit1}</div>
              <div class="benefit">${t.benefit2}</div>
              <div class="benefit">${t.benefit3}</div>
              <div class="benefit">${t.benefit4}</div>
            </div>
            
            <div class="cta">
              <a href="https://app.newai.sale/pricing" target="_blank">⚡ ${t.button}</a>
            </div>
            
            <p style="text-align:center;color:#7a869a;font-size:13px;margin-top:28px;">
              ${t.signature}
            </p>
          </div>
          
          <div class="footer">
            © 2025 NewAI. Tous droits réservés.<br>
            <a href="mailto:support@newai.sale">support@newai.sale</a>
          </div>
        </div>
      </body>
      </html>
    `;

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "New AI <noreply@newai.sale>",
        to: [email],
        subject: t.subject,
        html: emailHtml,
      }),
    });

    const responseText = await resendResponse.text();
    console.log("Resend API response status:", resendResponse.status);
    console.log("Resend API response:", responseText);

    if (!resendResponse.ok) {
      console.error("Resend API error:", responseText);
      throw new Error(`Resend API error: ${resendResponse.status} - ${responseText}`);
    }

    const result = JSON.parse(responseText);
    console.log("Upgrade limit email sent successfully to:", email);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email envoyé avec succès",
        id: result.id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (error: any) {
    console.error("Email sending failed:", error);

    return new Response(
      JSON.stringify({
        error: "Failed to send email",
        details: error.message || "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
};

serve(handler);
