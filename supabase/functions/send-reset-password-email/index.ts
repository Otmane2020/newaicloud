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
      <html lang="fr" style="margin:0;padding:0;">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Réinitialisation du mot de passe</title>
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
            background: linear-gradient(135deg, #4776E6 0%, #3B82F6 50%, #0EA5E9 100%);
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
            background: linear-gradient(135deg, #3B82F6, #60A5FA);
            color: white;
            text-decoration: none;
            padding: 14px 34px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 15px;
            display: inline-block;
          }
          .alert {
            background: #FEF3C7;
            border-left: 4px solid #F59E0B;
            padding: 12px 16px;
            margin: 20px 0;
            border-radius: 6px;
          }
          .alert-text {
            color: #92400E;
            font-size: 14px;
            margin: 0;
          }
          .footer {
            text-align: center;
            padding: 24px;
            background: #f2f4f7;
            font-size: 13px;
            color: #7a869a;
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
            <p class="brand-subtitle">Smarter Way To Sale ✨</p>
          </div>

          <div class="content">
            <h2>${t.greeting} 👋</h2>
            <p>${t.message}</p>
            
            <div class="cta">
              <a href="${resetLink}" target="_blank">${t.button}</a>
            </div>

            <div class="alert">
              <p class="alert-text">⏰ ${t.expiryNote}</p>
            </div>

            <p style="color:#64748b;font-size:14px;margin-top:20px;">${t.noRequest}</p>
            <p style="text-align:center;color:#7a869a;font-size:13px;margin-top:28px;">
              ${t.signature}
            </p>
          </div>

          <div class="footer">
            ${t.footer} • <a href="https://newai.sale" style="color:#3B82F6;text-decoration:none;">newai.sale</a>
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
