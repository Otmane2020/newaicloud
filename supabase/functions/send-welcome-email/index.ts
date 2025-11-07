import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";
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

    // Configuration SMTP O2Switch
    const client = new SmtpClient();

    await client.connectTLS({
      hostname: Deno.env.get("SMTP_HOST") || "ssl0.ovh.net",
      port: parseInt(Deno.env.get("SMTP_PORT") || "587"),
      username: Deno.env.get("SMTP_USER")!, // Votre email O2Switch complet
      password: Deno.env.get("SMTP_PASSWORD")!, // Votre mot de passe O2Switch
    });

    const translations = {
      fr: {
        subject: "Bienvenue sur New AI !",
        title: "Bienvenue sur New AI !",
        greeting: "Bonjour",
        thankYou: "Merci de vous être inscrit sur New AI, votre plateforme d'optimisation SEO pour Shopify !",
        message:
          "Nous sommes ravis de vous compter parmi nous. Vous pouvez dès maintenant accéder à toutes nos fonctionnalités pour booster votre visibilité en ligne.",
        button: "Accéder à mon compte",
        signature: "À très bientôt,<br>L'équipe New AI",
      },
      en: {
        subject: "Welcome to New AI!",
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

    // Utilisation directe de l'email SMTP comme expéditeur
    const smtpUser = Deno.env.get("SMTP_USER")!;

    await client.send({
      from: `New AI <${smtpUser}>`, // Envoie directement depuis votre compte SMTP
      to: email,
      subject: t.subject,
      content: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${t.title}</h1>
            </div>
            <div class="content">
              <h2>${t.greeting} ${fullName} 👋</h2>
              <p>${t.thankYou}</p>
              <p>${t.message}</p>
              <div style="text-align: center;">
                <a href="https://affable-calm-newai.lovable.app/dashboard" class="button">${t.button}</a>
              </div>
              <p>${t.signature}</p>
            </div>
            <div class="footer">
              <p>New AI - Optimisez votre SEO Shopify</p>
            </div>
          </div>
        </body>
        </html>
      `,
      html: true,
    });

    await client.close();

    console.log("Welcome email sent successfully to:", email);

    return new Response(JSON.stringify({ success: true, message: "Email envoyé avec succès" }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Email sending failed:", error);
    console.error("SMTP Config:", {
      host: Deno.env.get("SMTP_HOST"),
      port: Deno.env.get("SMTP_PORT"),
      user: Deno.env.get("SMTP_USER")?.substring(0, 5) + "...",
      hasPassword: !!Deno.env.get("SMTP_PASSWORD"),
    });

    return new Response(
      JSON.stringify({
        error: "Échec de l'envoi de l'email",
        details: error.message || "Erreur inconnue",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
};

serve(handler);
