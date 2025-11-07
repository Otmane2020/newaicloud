import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resetPasswordSchema = z.object({
  email: z.string().email().max(255),
  resetLink: z.string().url(),
  language: z.enum(["fr", "en"]).optional(),
});

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();

    const validation = resetPasswordSchema.safeParse(requestBody);
    if (!validation.success) {
      console.error("Invalid input:", validation.error.errors);
      return new Response(JSON.stringify({ error: "Invalid input data" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { email, resetLink, language = "fr" } = validation.data;

    console.log("Sending password reset email to:", email);

    const translations = {
      fr: {
        subject: "Réinitialisation de votre mot de passe New AI",
        title: "Réinitialisation du mot de passe",
        greeting: "Bonjour",
        message: "Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe.",
        button: "Réinitialiser mon mot de passe",
        expiryNote: "Ce lien expire dans 1 heure.",
        noRequest: "Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email en toute sécurité.",
        signature: "À très bientôt,<br>L'équipe New AI",
        footer: "New AI - Optimisez votre SEO Shopify",
      },
      en: {
        subject: "Reset your New AI password",
        title: "Password Reset",
        greeting: "Hello",
        message: "You requested a password reset. Click the button below to create a new password.",
        button: "Reset my password",
        expiryNote: "This link expires in 1 hour.",
        noRequest: "If you didn't request this reset, you can safely ignore this email.",
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
                  <td style="background: linear-gradient(135deg, #4776E6 0%, #3B82F6 50%, #0EA5E9 100%); padding: 40px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 32px;">${t.title}</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="color: #333333; margin-top: 0;">${t.greeting} 👋</h2>
                    <p style="color: #666666; line-height: 1.6; margin: 20px 0;">${t.message}</p>
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #4776E6, #3B82F6); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: bold;">${t.button}</a>
                    </div>
                    <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px 16px; margin: 20px 0; border-radius: 6px;">
                      <p style="color: #92400E; font-size: 14px; margin: 0;">⏰ ${t.expiryNote}</p>
                    </div>
                    <p style="color: #999999; font-size: 14px; margin-top: 20px;">${t.noRequest}</p>
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
    console.log("Reset password email sent successfully to:", email);

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
