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
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .sender-info { display: flex; align-items: center; gap: 12px; padding: 20px; background: white; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
          .sender-avatar { width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #4776E6 0%, #3B82F6 50%, #0EA5E9 100%); display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }
          .sender-avatar svg { width: 24px; height: 24px; }
          .sender-details { flex: 1; }
          .sender-name { font-weight: 700; color: #1e293b; font-size: 16px; margin: 0; }
          .sender-email { color: #64748b; font-size: 14px; margin: 2px 0 0 0; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 50px 30px; text-align: center; border-radius: 16px 16px 0 0; position: relative; overflow: hidden; }
          .header::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: url('data:image/svg+xml,<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>'); opacity: 0.3; }
          .logo-container { display: inline-flex; align-items: center; justify-content: center; gap: 14px; margin-bottom: 24px; position: relative; z-index: 1; }
          .logo-icon { width: 64px; height: 64px; border-radius: 16px; background: rgba(255, 255, 255, 0.95); display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2); position: relative; }
          .logo-icon::before { content: ''; position: absolute; inset: 2px; border-radius: 14px; background: linear-gradient(135deg, #4776E6 0%, #3B82F6 50%, #0EA5E9 100%); }
          .logo-icon svg { width: 36px; height: 36px; position: relative; z-index: 1; }
          .logo-text { font-size: 36px; font-weight: 800; color: white; letter-spacing: -1px; text-shadow: 0 2px 20px rgba(0,0,0,0.2); position: relative; z-index: 1; }
          .content { background: white; padding: 45px 35px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
          .button { display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 10px; margin: 30px 0; font-weight: 700; font-size: 16px; box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4); transition: transform 0.2s, box-shadow 0.2s; }
          .button:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(102, 126, 234, 0.5); }
          .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 14px; padding: 25px 20px 20px; border-top: 2px solid #e2e8f0; background: #f8fafc; border-radius: 0 0 16px 16px; }
          .footer a { color: #667eea; text-decoration: none; font-weight: 600; }
          .greeting { color: #1e293b; font-size: 28px; margin-bottom: 20px; font-weight: 700; }
          .message { color: #475569; font-size: 16px; margin-bottom: 18px; line-height: 1.7; }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Sender Profile -->
          <div class="sender-info">
            <div class="sender-avatar">
               <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="white" opacity="0.9"/>
                <path d="M2 17L12 22L22 17" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="sender-details">
              <p class="sender-name">Équipe New AI</p>
              <p class="sender-email">noreply@newai.sale</p>
            </div>
          </div>

          <!-- Email Header with AI Logo -->
          <div class="header">
            <div class="logo-container">
              <div class="logo-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="3" fill="#667eea"/>
                  <path d="M12 2L12 6M12 18L12 22M22 12L18 12M6 12L2 12M19.07 4.93L16.24 7.76M7.76 16.24L4.93 19.07M19.07 19.07L16.24 16.24M7.76 7.76L4.93 4.93" stroke="#667eea" stroke-width="2.5" stroke-linecap="round"/>
                </svg>
              </div>
              <span class="logo-text">New AI</span>
            </div>
            <h1 style="margin: 0; font-size: 32px; font-weight: 800; position: relative; z-index: 1;">${t.title}</h1>
          </div>

          <!-- Email Content -->
          <div class="content">
            <h2 class="greeting">${t.greeting} ${fullName} 👋</h2>
            <p class="message">${t.thankYou}</p>
            <p class="message">${t.message}</p>
            <div style="text-align: center;">
              <a href="https://newai.sale/auth" class="button">${t.button}</a>
            </div>
            <p style="color: #475569; margin-top: 30px;">${t.signature}</p>
          </div>

          <!-- Footer -->
          <div class="footer">
            <p>${t.footer} • <a href="https://newai.sale">newai.sale</a></p>
            <p style="font-size: 12px; margin-top: 10px; color: #94a3b8;">${t.disclaimer}</p>
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
