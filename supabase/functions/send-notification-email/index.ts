import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailNotification {
  to: string;
  userName: string;
  notifications: Array<{
    title: string;
    message: string;
    category: string;
    actionUrl: string;
    priority: string;
  }>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const smtpHost = Deno.env.get("SMTP_HOST")!;
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "587");
    const smtpUser = Deno.env.get("SMTP_USER")!;
    const smtpPassword = Deno.env.get("SMTP_PASSWORD")!;
    const fromEmail = Deno.env.get("FROM_EMAIL")!;
    const fromName = Deno.env.get("FROM_NAME") || "NewAI";

    const supabase = createClient(supabaseUrl, supabaseKey);
    const emailData: EmailNotification = await req.json();

    console.log(`📧 Sending notification email to ${emailData.to}`);

    // Generate email HTML
    const notificationsHtml = emailData.notifications
      .map((notif) => {
        const priorityColor = notif.priority === 'high' ? '#ef4444' : notif.priority === 'medium' ? '#f59e0b' : '#3b82f6';
        return `
          <div style="background: #f9fafb; border-left: 4px solid ${priorityColor}; padding: 16px; margin: 12px 0; border-radius: 8px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <span style="background: ${priorityColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                ${notif.priority.toUpperCase()}
              </span>
              <span style="color: #6b7280; font-size: 14px;">${notif.category}</span>
            </div>
            <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #111827;">${notif.title}</h3>
            <p style="margin: 0 0 12px 0; color: #4b5563; line-height: 1.5;">${notif.message}</p>
            <a href="${emailData.notifications[0].actionUrl.startsWith('http') ? notif.actionUrl : `${supabaseUrl.replace('//', '//app.')}${notif.actionUrl}`}" 
               style="display: inline-block; background: #3b82f6; color: white; padding: 8px 16px; text-decoration: none; border-radius: 6px; font-weight: 500;">
              Voir les détails →
            </a>
          </div>
        `;
      })
      .join("");

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tâches SEO du jour - NewAI</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; background: white;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 32px; text-align: center;">
      <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">
        🎯 Vos tâches SEO du jour
      </h1>
      <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
        Bonjour ${emailData.userName} !
      </p>
    </div>

    <!-- Content -->
    <div style="padding: 32px;">
      <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        Vous avez <strong>${emailData.notifications.length} tâche(s) SEO</strong> à accomplir aujourd'hui pour améliorer votre référencement :
      </p>

      ${notificationsHtml}

      <div style="margin-top: 32px; padding: 20px; background: #eff6ff; border-radius: 8px; border: 1px solid #dbeafe;">
        <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;">
          💡 <strong>Conseil :</strong> Complétez ces tâches pour maximiser votre visibilité sur les moteurs de recherche. Les actions sont automatisées par NewAI pour vous faire gagner du temps !
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
        Cet email a été envoyé par <strong>NewAI</strong>
      </p>
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
        Pour gérer vos préférences de notification, rendez-vous dans les paramètres de votre compte.
      </p>
    </div>
  </div>
</body>
</html>
    `;

    // Send email using SMTP
    const boundary = "----=_Part_0_" + Date.now();
    const emailBody = [
      `From: ${fromName} <${fromEmail}>`,
      `To: ${emailData.to}`,
      `Subject: 🎯 Vos ${emailData.notifications.length} tâches SEO du jour`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=utf-8`,
      ``,
      htmlContent,
      `--${boundary}--`,
    ].join("\r\n");

    // Connect and send via SMTP
    const conn = await Deno.connect({
      hostname: smtpHost,
      port: smtpPort,
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Helper to send and read
    async function sendCommand(cmd: string) {
      await conn.write(encoder.encode(cmd + "\r\n"));
      const buf = new Uint8Array(1024);
      const n = await conn.read(buf);
      return decoder.decode(buf.subarray(0, n || 0));
    }

    // SMTP conversation
    await sendCommand(`EHLO ${smtpHost}`);
    await sendCommand(`AUTH LOGIN`);
    await sendCommand(btoa(smtpUser));
    await sendCommand(btoa(smtpPassword));
    await sendCommand(`MAIL FROM:<${fromEmail}>`);
    await sendCommand(`RCPT TO:<${emailData.to}>`);
    await sendCommand(`DATA`);
    await conn.write(encoder.encode(emailBody + "\r\n.\r\n"));
    await sendCommand(`QUIT`);
    
    conn.close();

    console.log(`✅ Email sent successfully to ${emailData.to}`);

    return new Response(
      JSON.stringify({ success: true, message: "Email sent" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Error sending email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});