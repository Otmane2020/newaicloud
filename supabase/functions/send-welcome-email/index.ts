import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const welcomeEmailSchema = z.object({
  email: z.string().email().max(255),
  fullName: z.string().trim().min(1).max(100),
  language: z.enum(["fr", "en"]).optional(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const validation = welcomeEmailSchema.safeParse(body);

    if (!validation.success) {
      console.error("Invalid input:", validation.error.errors);
      return new Response(JSON.stringify({ error: "Invalid input data" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { email, fullName, language = "fr" } = validation.data;
    console.log("Sending welcome email to:", email);

    const translations = {
      fr: {
        subject: "Bienvenue sur notre plateforme ! 🚀",
        title: "Bienvenue !",
        greeting: "Bonjour",
        thankYou: "Merci de vous être inscrit sur notre plateforme d'optimisation SEO pour Shopify !",
        message:
          "Nous sommes ravis de vous compter parmi nous. Vous pouvez dès maintenant accéder à toutes nos fonctionnalités pour booster votre visibilité en ligne.",
        button: "Accéder à mon compte",
        signature: "À très bientôt,<br>L'équipe",
        footer: "Optimisez votre SEO Shopify",
        disclaimer: "Si vous n'avez pas créé de compte, vous pouvez ignorer cet email.",
      },
      en: {
        subject: "Welcome to our platform! 🚀",
        title: "Welcome!",
        greeting: "Hello",
        thankYou: "Thank you for signing up to our SEO optimization platform for Shopify!",
        message:
          "We are delighted to have you with us. You can now access all our features to boost your online visibility.",
        button: "Access my account",
        signature: "See you soon,<br>The Team",
        footer: "Optimize your Shopify SEO",
        disclaimer: "If you didn't create an account, you can safely ignore this email.",
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
                  <td style="background: linear-gradient(135deg, #4776E6 0%, #3B82F6 50%, #0EA5E9 100%); padding: 40px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 32px;">${t.title}</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="color: #333333; margin-top: 0;">${t.greeting} ${fullName} 👋</h2>
                    <p style="color: #666666; line-height: 1.6; margin: 20px 0;">${t.thankYou}</p>
                    <p style="color: #666666; line-height: 1.6; margin: 20px 0;">${t.message}</p>
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="https://app.newai.sale/auth" style="display: inline-block; background: linear-gradient(135deg, #4776E6, #3B82F6); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: bold;">${t.button}</a>
                    </div>
                    <p style="color: #666666; margin-top: 30px;">${t.signature}</p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f8f8f8; padding: 20px; text-align: center; font-size: 12px; color: #999999;">
                    <p style="margin: 0;">${t.footer}</p>
                    <p style="margin: 10px 0 0 0;">${t.disclaimer}</p>
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
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Équipe IA <noreply@newai.sale>",
        to: [email],
        subject: t.subject,
        html: emailHtml,
      }),
    });

    const responseText = await resendResponse.text();
    console.log("Resend API status:", resendResponse.status);
    console.log("Resend API response:", responseText);

    if (!resendResponse.ok) {
      throw new Error(`Resend API error ${resendResponse.status}: ${responseText}`);
    }

    const result = JSON.parse(responseText);
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
});
