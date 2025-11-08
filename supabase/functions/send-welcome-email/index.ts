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
        subject: "Bienvenue sur NewAI - Votre compte est prêt",
        title: "Bienvenue à bord !",
        greeting: "Bonjour",
        thankYou: "Merci d’avoir rejoint NewAI, votre assistant intelligent pour optimiser votre boutique Shopify.",
        message:
          "Découvrez nos outils d’IA pour améliorer vos fiches produits, booster votre SEO et propulser vos ventes.",
        button: "Accéder à mon compte",
        signature: "À très bientôt,<br><b>L’équipe NewAI</b>",
        footer: "© 2025 NewAI — Optimisez votre SEO Shopify",
        disclaimer: "Si vous n'avez pas créé de compte, vous pouvez ignorer cet email.",
      },
      en: {
        subject: "Welcome to NewAI - Your account is ready",
        title: "Welcome aboard!",
        greeting: "Hello",
        thankYou: "Thank you for joining NewAI — your smart assistant for optimizing your Shopify store.",
        message: "Start exploring our AI-powered tools to enhance your product pages, boost SEO, and grow your sales.",
        button: "Access my account",
        signature: "See you soon,<br><b>The NewAI Team</b>",
        footer: "© 2025 NewAI — Optimize your Shopify SEO",
        disclaimer: "If you didn’t create an account, you can safely ignore this email.",
      },
    };

    const t = translations[language];

    // Plain text version for better deliverability
    const emailText = `
${t.title}

${t.greeting} ${fullName},

${t.thankYou}

${t.message}

${t.button}: https://app.newai.sale/auth?mode=login

${t.signature.replace(/<br>/g, '\n').replace(/<\/?b>/g, '')}

---
${t.footer}

${t.disclaimer}

Pour vous désinscrire: https://app.newai.sale/unsubscribe
    `.trim();

    const emailHtml = `
    <!DOCTYPE html>
    <html lang="${language}">
    <head>
      <meta charset="utf-8" />
      <style>
        body {
          font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #f6f8fb;
          color: #1e293b;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 640px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 6px 24px rgba(0, 0, 0, 0.08);
        }
        .header {
          background: linear-gradient(135deg, #0f172a 0%, #1e40af 40%, #06b6d4 100%);
          color: white;
          text-align: center;
          padding: 60px 30px 45px;
          position: relative;
        }
        .logo {
          font-size: 40px;
          font-weight: 800;
          letter-spacing: -1px;
          margin: 0;
          background: linear-gradient(90deg, #60a5fa, #38bdf8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .title {
          font-size: 28px;
          font-weight: 700;
          margin: 18px 0 8px;
          color: #f8fafc;
        }
        .subtitle {
          font-size: 15px;
          color: #cbd5e1;
          margin: 0;
        }
        .content {
          padding: 40px 40px 30px;
          text-align: left;
        }
        .greeting {
          font-size: 22px;
          font-weight: 600;
          margin-bottom: 16px;
        }
        .message {
          font-size: 16px;
          color: #334155;
          line-height: 1.7;
          margin-bottom: 20px;
        }
        .button {
          display: inline-block;
          background: linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%);
          color: white;
          font-weight: 700;
          font-size: 16px;
          text-decoration: none;
          padding: 14px 36px;
          border-radius: 10px;
          box-shadow: 0 6px 16px rgba(37,99,235,0.4);
          transition: all 0.2s ease;
          margin: 25px 0 30px;
        }
        .button:hover {
          box-shadow: 0 10px 24px rgba(37,99,235,0.5);
          transform: translateY(-2px);
        }
        .signature {
          margin-top: 30px;
          color: #475569;
          font-size: 15px;
        }
        .divider {
          height: 1px;
          background: #e2e8f0;
          margin: 40px 0 20px;
        }
        .footer {
          text-align: center;
          font-size: 13px;
          color: #94a3b8;
          padding: 20px 20px 30px;
        }
        .footer a {
          color: #2563eb;
          text-decoration: none;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="logo">NewAI</h1>
          <h2 class="title">${t.title}</h2>
          <p class="subtitle">${t.footer}</p>
        </div>
        <div class="content">
          <p class="greeting">${t.greeting} ${fullName} 👋</p>
          <p class="message">${t.thankYou}</p>
          <p class="message">${t.message}</p>
          <div style="text-align:center;">
            <a href="https://app.newai.sale/auth?mode=login" class="button">${t.button}</a>
          </div>
          <p class="signature">${t.signature}</p>
          <div class="divider"></div>
          <div class="footer">
            <p>${t.footer} • <a href="https://newai.sale">newai.sale</a></p>
            <p style="font-size:12px;margin-top:10px;color:#94a3b8;">${t.disclaimer}</p>
          </div>
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
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "NewAI <noreply@newai.sale>",
        reply_to: "contact@newai.sale",
        to: [email],
        subject: t.subject,
        html: emailHtml,
        text: emailText,
        headers: {
          "List-Unsubscribe": "<https://app.newai.sale/unsubscribe>",
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          "X-Mailer": "NewAI v1.0",
          "X-Priority": "3",
        },
      }),
    });

    const responseText = await resendResponse.text();
    console.log("Resend API response:", resendResponse.status, responseText);

    if (!resendResponse.ok) {
      throw new Error(`Resend API error: ${responseText}`);
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
        details: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
};

serve(handler);
