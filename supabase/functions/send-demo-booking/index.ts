import "../_shared/strict-ai-generation.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DemoBookingRequest {
  businessEmail: string;
  firstName: string;
  lastName: string;
  role: string;
}

const escapeHtml = (value: string) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const resend = new Resend(resendApiKey);
    const payload: DemoBookingRequest = await req.json();
    const businessEmail = payload.businessEmail?.trim();
    const firstName = payload.firstName?.trim();
    const lastName = payload.lastName?.trim();
    const role = payload.role?.trim();

    if (!businessEmail || !firstName || !lastName || !role) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(businessEmail)) {
      return new Response(JSON.stringify({ error: "Invalid email format" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const safeEmail = escapeHtml(businessEmail);
    const safeFirstName = escapeHtml(firstName);
    const safeLastName = escapeHtml(lastName);
    const safeRole = escapeHtml(role);
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "NewAI Demo <onboarding@resend.dev>";
    const notificationEmail = Deno.env.get("DEMO_NOTIFICATION_EMAIL") || "support@newai.sale";

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: [notificationEmail],
      reply_to: businessEmail,
      subject: `New Demo Request from ${firstName} ${lastName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
          </head>
          <body style="margin:0;background:#f5f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#111827;">
            <div style="max-width:620px;margin:0 auto;padding:32px 16px;">
              <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:20px;overflow:hidden;box-shadow:0 18px 50px rgba(15,23,42,.08);">
                <div style="padding:28px 30px;background:#111827;color:#ffffff;">
                  <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;opacity:.72;margin-bottom:8px;">NewAI · Demo request</div>
                  <h1 style="margin:0;font-size:26px;line-height:1.2;">${safeFirstName} ${safeLastName} wants a demo</h1>
                </div>
                <div style="padding:28px 30px;">
                  <div style="padding:15px 0;border-bottom:1px solid #eef0f3;">
                    <div style="font-size:12px;color:#6b7280;margin-bottom:5px;">Business email</div>
                    <a href="mailto:${safeEmail}" style="font-size:16px;color:#2563eb;text-decoration:none;">${safeEmail}</a>
                  </div>
                  <div style="padding:15px 0;border-bottom:1px solid #eef0f3;">
                    <div style="font-size:12px;color:#6b7280;margin-bottom:5px;">Role</div>
                    <div style="font-size:16px;">${safeRole}</div>
                  </div>
                  <div style="padding:15px 0;">
                    <div style="font-size:12px;color:#6b7280;margin-bottom:5px;">Submitted at</div>
                    <div style="font-size:16px;">${new Date().toISOString()}</div>
                  </div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (emailError) {
      console.error("[send-demo-booking] Resend rejected the email:", emailError);
      throw new Error(emailError.message || "Email provider rejected the demo request");
    }

    if (!emailData?.id) {
      throw new Error("Email provider returned no delivery id");
    }

    console.log("[send-demo-booking] Demo request accepted by Resend:", emailData.id);

    return new Response(JSON.stringify({
      success: true,
      message: "Demo booking email accepted",
      emailId: emailData.id,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send demo booking email";
    console.error("[send-demo-booking] Error:", error);

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
