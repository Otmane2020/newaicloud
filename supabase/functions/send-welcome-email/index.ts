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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();

    const validation = welcomeEmailSchema.safeParse(requestBody);
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
        subject: "Bienvenue sur New AI ! 🚀",
        title: "Bienvenue sur New AI !",
        greeting: "Bonjour",
        thankYou: "Merci de vous être inscrit sur New AI, votre plateforme d'optimisation SEO pour Shopify !",
        message:
          "Nous sommes ravis de vous compter parmi nous. Vous pouvez dès maintenant accéder à toutes nos fonctionnalités pour booster votre visibilité en ligne.",
        button: "Accéder à mon compte",
        signature: "À très bientôt,<br>L'équipe New AI",
      },
      en: {
        subject: "Welcome to New AI! 🚀",
        title: "Welcome to New AI!",
        greeting: "Hello",
        thankYou: "Thank you for signing up to New AI, your SEO optimization platform for Shopify!",
        message:
          "We are delighted to have you with us. You can now access all our features to boost your online visibility.",
        button: "Access my account",
        signature: "See you soon,<br>The New AI Team",
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
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0; }
          .content { background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
          .button { display: inline-block; padding: 14px 32px; background: #667eea; color: white; text-decoration: none; border-radius: 8px; margin: 25px 0; font-weight: 600; font-size: 16px; }
          .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 14px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
          .greeting { color: #1e293b; font-size: 24px; margin-bottom: 20px; }
          .message { color: #475569; font-size: 16px; margin-bottom: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 32px; font-weight: 700;">${t.title}</h1>
          </div>
          <div class="content">
            <h2 class="greeting">${t.greeting} ${fullName} 👋</h2>
            <p class="message">${t.thankYou}</p>
            <p class="message">${t.message}</p>
            <div style="text-align: center;">
              <a href="https://affable-calm-newai.lovable.app/dashboard" class="button">${t.button}</a>
            </div>
            <p style="color: #475569; margin-top: 30px;">${t.signature}</p>
          </div>
          <div class="footer">
            <p>New AI - Optimisez votre SEO Shopify • <a href="https://newai.sale" style="color: #667eea;">newai.sale</a></p>
            <p style="font-size: 12px; margin-top: 10px;">Si vous n'avez pas créé de compte, vous pouvez ignorer cet email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    // Envoi avec Resend API
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
    console.log("Welcome email sent successfully to:", email);

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
