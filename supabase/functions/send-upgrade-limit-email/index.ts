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
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .sender-info { display: flex; align-items: center; gap: 12px; padding: 20px; background: white; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
          .sender-avatar { width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #4776E6 0%, #3B82F6 50%, #0EA5E9 100%); display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }
          .sender-avatar svg { width: 28px; height: 28px; }
          .sender-details { flex: 1; }
          .sender-name { font-weight: 600; color: #1e293b; font-size: 16px; margin: 0; }
          .sender-email { color: #64748b; font-size: 14px; margin: 2px 0 0 0; }
          .header { background: linear-gradient(135deg, #F59E0B 0%, #EF4444 50%, #DC2626 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0; }
          .logo-container { display: inline-flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 20px; }
          .logo-icon { width: 56px; height: 56px; border-radius: 14px; background: rgba(255, 255, 255, 0.2); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15); }
          .logo-icon svg { width: 32px; height: 32px; }
          .logo-text { font-size: 32px; font-weight: 700; color: white; letter-spacing: -0.5px; }
          .content { background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
          .button { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #F59E0B 0%, #EF4444 100%); color: white; text-decoration: none; border-radius: 8px; margin: 25px 0; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3); }
          .button:hover { background: linear-gradient(135deg, #D97706 0%, #DC2626 100%); }
          .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 14px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
          .footer a { color: #3B82F6; text-decoration: none; }
          .greeting { color: #1e293b; font-size: 24px; margin-bottom: 20px; }
          .message { color: #475569; font-size: 16px; margin-bottom: 15px; }
          .benefits-box { background: #F0F9FF; border-left: 4px solid #3B82F6; padding: 20px; margin: 20px 0; border-radius: 6px; }
          .benefits-title { color: #1e40af; font-weight: 600; margin-bottom: 12px; font-size: 16px; }
          .benefit { color: #1e40af; margin: 8px 0; font-size: 15px; }
          .usage-bar { background: #E5E7EB; border-radius: 8px; height: 12px; margin: 20px 0; overflow: hidden; }
          .usage-fill { background: linear-gradient(90deg, #EF4444 0%, #F59E0B 100%); height: 100%; width: ${(usageCount / limitCount) * 100}%; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="sender-info">
            <div class="sender-avatar">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="sender-details">
              <p class="sender-name">New AI</p>
              <p class="sender-email">noreply@newai.sale</p>
            </div>
          </div>

          <div class="header">
            <div class="logo-container">
              <div class="logo-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <span class="logo-text">NewAI</span>
            </div>
            <h1 style="margin: 0; font-size: 28px; font-weight: 700;">${t.title}</h1>
          </div>

          <div class="content">
            <h2 class="greeting">${t.greeting} ${fullName} 👋</h2>
            <p class="message">${t.message}</p>
            
            <div class="usage-bar">
              <div class="usage-fill"></div>
            </div>

            <p class="message">${t.upgrade}</p>

            <div class="benefits-box">
              <div class="benefits-title">${t.benefits}</div>
              <div class="benefit">${t.benefit1}</div>
              <div class="benefit">${t.benefit2}</div>
              <div class="benefit">${t.benefit3}</div>
              <div class="benefit">${t.benefit4}</div>
            </div>

            <div style="text-align: center;">
              <a href="https://newai.sale/pricing" class="button">${t.button}</a>
            </div>

            <p style="color: #475569; margin-top: 30px;">${t.signature}</p>
          </div>

          <div class="footer">
            <p>${t.footer} • <a href="https://newai.sale">newai.sale</a></p>
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
