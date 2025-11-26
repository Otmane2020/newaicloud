import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    // Parse incoming email data from Resend webhook
    const emailData = await req.json();
    console.log("📧 Webhook Resend - Email reçu");

    // Resend webhook format: { type: "email.received", data: { ... } }
    const data = emailData.data || emailData;
    const { from, to, subject, email_id } = data;

    console.log("📨 Email ID:", email_id);
    console.log("  - from:", from);
    console.log("  - to:", to);
    console.log("  - subject:", subject);

    if (!from || !to || !email_id) {
      console.error("❌ Données email invalides");
      throw new Error("Données email invalides - from, to ou email_id manquant");
    }

    // Éviter la boucle : ne pas traiter les emails envoyés par nous-mêmes (copies automatiques)
    if (from.includes("support@newai.sale") || subject?.includes("[Copie]")) {
      console.log("⚠️ Email auto-généré détecté, ignoré pour éviter la boucle");
      return new Response(
        JSON.stringify({
          success: true,
          message: "Email auto-généré ignoré",
          skipped: true,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    // Use Resend Receiving API to fetch the full email content
    console.log(`🔍 Récupération du contenu complet via Resend Receiving API (email_id: ${email_id})`);

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY non configurée");
    }

    let emailText = "";
    let emailHtml = "";
    let attachments: any[] = [];

    try {
      // Get the full received email using Resend Receiving API
      const emailResponse = await fetch(`https://api.resend.com/emails/receiving/${email_id}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (emailResponse.ok) {
        const receivedEmail = await emailResponse.json();
        console.log("✅ Email récupéré via Resend Receiving API");

        emailText = receivedEmail.text || receivedEmail.body_plain || "";
        emailHtml = receivedEmail.html || receivedEmail.body_html || "";

        console.log(`📝 Contenu - text: ${emailText.length} chars, html: ${emailHtml.length} chars`);
      } else {
        const errorText = await emailResponse.text();
        console.error(`❌ Erreur Resend Receiving API (${emailResponse.status}):`, errorText);
      }

      // Get attachments if any
      try {
        const attachmentsResponse = await fetch(`https://api.resend.com/emails/receiving/${email_id}/attachments`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
        });

        if (attachmentsResponse.ok) {
          const attachmentsData = await attachmentsResponse.json();

          if (attachmentsData && attachmentsData.data && attachmentsData.data.length > 0) {
            console.log(`📎 ${attachmentsData.data.length} pièce(s) jointe(s) trouvée(s)`);

            // Store attachment metadata
            attachments = attachmentsData.data.map((att: any) => ({
              id: att.id,
              filename: att.filename,
              content_type: att.content_type,
              size: att.size,
            }));
          }
        } else {
          console.log("⚠️ Aucune pièce jointe ou endpoint non disponible");
        }
      } catch (attachmentError) {
        console.error("⚠️ Erreur lors de la récupération des pièces jointes:", attachmentError);
        // Continue even if attachment retrieval fails
      }
    } catch (apiError: any) {
      console.error("❌ Erreur Resend Receiving API:", apiError);
      console.error("Message:", apiError.message);

      // Fallback: use webhook data if available
      const fallbackText = data.text || data.body_plain || "";
      const fallbackHtml = data.html || data.body_html || "";

      if (fallbackText || fallbackHtml) {
        emailText = fallbackText;
        emailHtml = fallbackHtml;
        console.log("✅ Utilisation des données du webhook comme fallback");
      } else {
        emailText = `Email reçu - Contenu non disponible via API.\nSujet: ${subject}`;
        console.log("⚠️ Aucun contenu disponible, utilisation du placeholder");
      }
    }

    // Extract clean body text
    let cleanBody = "";
    if (emailText) {
      cleanBody = emailText;
    } else if (emailHtml) {
      // Strip HTML tags for plain text version
      cleanBody = emailHtml
        .replace(/<style[^>]*>.*?<\/style>/gi, "")
        .replace(/<script[^>]*>.*?<\/script>/gi, "")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, " ")
        .trim();
    }

    // Enregistrer l'email dans la base de données
    const { data: savedEmail, error } = await supabaseClient
      .from("admin_emails")
      .insert({
        from_email: from,
        to_email: Array.isArray(to) ? to[0] : to,
        subject: subject || "Sans objet",
        body: cleanBody || emailText || "Contenu non disponible",
        html_body: emailHtml || null,
        direction: "incoming",
        status: "received",
        is_read: false,
        folder: "inbox",
        metadata: {
          webhook_received_at: new Date().toISOString(),
          email_id: email_id,
          content_available: !!(emailText || emailHtml),
          content_source: "resend_receiving_api",
          attachments: attachments.length > 0 ? attachments : null,
          attachments_count: attachments.length,
        },
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Erreur DB lors de l'enregistrement:", error);
      throw error;
    }

    console.log("✅ Email enregistré avec succès!");
    console.log("  - ID:", savedEmail.id);
    console.log("  - Folder:", savedEmail.folder);
    console.log("  - Status:", savedEmail.status);
    console.log("  - Body length:", cleanBody.length);
    console.log("  - Attachments:", attachments.length);

    // Envoyer automatiquement une copie à oben.rockman@gmail.com
    console.log("📧 Envoi d'une copie à oben.rockman@gmail.com...");

    // Construire le contenu de l'email avec le body disponible
    const emailBodyForCopy =
      emailHtml ||
      (cleanBody
        ? `<pre style="white-space: pre-wrap; word-wrap: break-word; font-family: inherit; margin: 0;">${cleanBody}</pre>`
        : "") ||
      (emailText
        ? `<pre style="white-space: pre-wrap; word-wrap: break-word; font-family: inherit; margin: 0;">${emailText}</pre>`
        : "") ||
      (data.text
        ? `<pre style="white-space: pre-wrap; word-wrap: break-word; font-family: inherit; margin: 0;">${data.text}</pre>`
        : "") ||
      (data.html ? data.html : "") ||
      '<p style="color: #64748b; font-style: italic;">Contenu de l\'email non disponible</p>';

    console.log("📝 Body pour copie - longueur:", emailBodyForCopy.length);

    try {
      const forwardResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "NewAI Notification <notifications@newai.sale>",
          to: ["oben.rocangmail.com"],
          subject: `[NewAI Copie] ${subject || "Sans objet"}`,
          html: `
            <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 14px; color: #64748b;">
                  <strong>📧 Copie automatique d'un email reçu sur support@newai.sale</strong>
                </p>
              </div>
              
              <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <table style="width: 100%; font-size: 14px;">
                  <tr>
                    <td style="color: #64748b; padding: 4px 0; width: 80px;"><strong>De:</strong></td>
                    <td style="color: #1e293b; padding: 4px 0;">${from}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; padding: 4px 0;"><strong>À:</strong></td>
                    <td style="color: #1e293b; padding: 4px 0;">${Array.isArray(to) ? to[0] : to}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; padding: 4px 0;"><strong>Sujet:</strong></td>
                    <td style="color: #1e293b; padding: 4px 0;">${subject || "Sans objet"}</td>
                  </tr>
                  ${
                    attachments.length > 0
                      ? `
                  <tr>
                    <td style="color: #64748b; padding: 4px 0;"><strong>PJ:</strong></td>
                    <td style="color: #1e293b; padding: 4px 0;">${attachments.length} pièce(s) jointe(s)</td>
                  </tr>
                  `
                      : ""
                  }
                </table>
              </div>
              
              <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; background: white;">
                <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #1e293b;">Message:</h3>
                ${emailBodyForCopy}
              </div>
              
              ${
                attachments.length > 0
                  ? `
              <div style="margin-top: 16px; padding: 12px; background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px;">
                <p style="margin: 0; font-size: 14px; color: #92400e;">
                  ⚠️ Cet email contient ${attachments.length} pièce(s) jointe(s). Consultez la plateforme NewAI pour y accéder.
                </p>
              </div>
              `
                  : ""
              }
              
              <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
                Email reçu le ${new Date().toLocaleString("fr-FR")} • ID: ${email_id}
              </div>
            </div>
          `,
        }),
      });

      if (forwardResponse.ok) {
        console.log("✅ Copie envoyée à oben.rockman@gmail.com");
      } else {
        const errorText = await forwardResponse.text();
        console.error("❌ Erreur lors de l'envoi de la copie:", errorText);
      }
    } catch (forwardError: any) {
      console.error("❌ Erreur lors de l'envoi de la copie:", forwardError.message);
      // Continue même si l'envoi de la copie échoue
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email reçu et enregistré",
        emailId: savedEmail.id,
        attachments: attachments.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (error: any) {
    console.error("❌ Erreur dans receive-admin-email:", error);
    console.error("Stack:", error.stack);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: "Impossible d'enregistrer l'email",
        stack: error.stack,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
};

serve(handler);
