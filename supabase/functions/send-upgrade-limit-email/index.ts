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
      <html lang="${language}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${t.title}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="background: linear-gradient(135deg, #F59E0B 0%, #EF4444 50%, #DC2626 100%); padding: 40px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 32px;">${t.title}</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="color: #333333; margin-top: 0;">${t.greeting} ${fullName} 👋</h2>
                    <p style="color: #666666; line-height: 1.6; margin: 20px 0;">${t.message}</p>
                    <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; margin: 20px 0; border-radius: 6px;">
                      <p style="color: #92400E; font-size: 14px; margin: 0;"><strong>${usageCount} / ${limitCount}</strong> optimisations utilisées</p>
                    </div>
                    <p style="color: #666666; line-height: 1.6; margin: 20px 0;">${t.upgrade}</p>
                    <div style="background-color: #F0F9FF; border-left: 4px solid #3B82F6; padding: 16px; margin: 20px 0; border-radius: 6px;">
                      <p style="color: #1e40af; font-weight: 600; margin: 0 0 10px 0;">${t.benefits}</p>
                      <p style="color: #1e40af; margin: 5px 0;">${t.benefit1}</p>
                      <p style="color: #1e40af; margin: 5px 0;">${t.benefit2}</p>
                      <p style="color: #1e40af; margin: 5px 0;">${t.benefit3}</p>
                      <p style="color: #1e40af; margin: 5px 0;">${t.benefit4}</p>
                    </div>
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="https://app.newai.sale/subscription" style="display: inline-block; background: linear-gradient(135deg, #F59E0B, #EF4444); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: bold;">${t.button}</a>
                    </div>
                    <p style="color: #666666; margin-top: 30px;">${t.signature}</p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f8f8f8; padding: 20px; text-align: center; font-size: 12px; color: #999999;">
                    <p style="margin: 0;">${t.footer}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
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
