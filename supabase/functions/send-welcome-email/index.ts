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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            position: relative;
            overflow: hidden;
          }
          .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: radial-gradient(circle at 20% 50%, rgba(102, 126, 234, 0.8) 0%, transparent 50%),
                        radial-gradient(circle at 80% 80%, rgba(118, 75, 162, 0.8) 0%, transparent 50%);
            opacity: 0.5;
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            padding: 14px 34px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 15px;
            display: inline-block;
            box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
            transition: transform 0.2s, box-shadow 0.2s;
          }
          .cta a:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 30px rgba(102, 126, 234, 0.5);
          }
          .footer {
            text-align: center;
            padding: 24px;
            background: #f2f4f7;
            font-size: 13px;
            color: #7a869a;
          }
          .footer a {
            color: #667eea;
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
            <p class="brand-subtitle">Smarter Way To Sale ✨</p>
          </div>
          
          <div class="content">
            <h2>${t.greeting} ${fullName} 👋</h2>
            <p>${t.thankYou}</p>
            <p>${t.message}</p>
            
            <div class="cta">
              <a href="https://app.newai.sale/auth" target="_blank">🚀 ${t.button}</a>
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

    // Envoi avec Resend API
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
