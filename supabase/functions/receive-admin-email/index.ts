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
          autoRefreshToken: false
        } 
      }
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

    // Détection de boucle améliorée
    if (from.includes('newai.sale') || 
        subject?.includes('[Copie]') || 
        subject?.includes('[NewAI Copie]')) {
      console.log("⚠️ Email auto-généré détecté, ignoré pour éviter les boucles");
      
      return new Response(
        JSON.stringify({ 
          success: true,
          skipped: true,
          message: 'Email auto-généré ignoré',
          emailId: null 
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Use Resend Receiving API to fetch the full email content
    console.log(`🔍 Récupération du contenu complet via Resend Receiving API (email_id: ${email_id})`);
    
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY non configurée");
    }
    
    let emailText = '';
    let emailHtml = '';
    let attachments: any[] = [];
    
    try {
      // Get the full received email using Resend Receiving API
      const emailResponse = await fetch(`https://api.resend.com/emails/receiving/${email_id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
      });
      
      if (emailResponse.ok) {
        const receivedEmail = await emailResponse.json();
        console.log("✅ Email récupéré via Resend Receiving API");
        
        emailText = receivedEmail.text || receivedEmail.body_plain || '';
        emailHtml = receivedEmail.html || receivedEmail.body_html || '';
        
        console.log(`📝 Contenu - text: ${emailText.length} chars, html: ${emailHtml.length} chars`);
      } else {
        const errorText = await emailResponse.text();
        console.error(`❌ Erreur Resend Receiving API (${emailResponse.status}):`, errorText);
      }

      // Get attachments if any
      try {
        const attachmentsResponse = await fetch(
          `https://api.resend.com/emails/receiving/${email_id}/attachments`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json'
            },
          }
        );
        
        if (attachmentsResponse.ok) {
          const attachmentsData = await attachmentsResponse.json();
          
          if (attachmentsData && attachmentsData.data && attachmentsData.data.length > 0) {
            console.log(`📎 ${attachmentsData.data.length} pièce(s) jointe(s) trouvée(s)`);
            
            // Store attachment metadata
            attachments = attachmentsData.data.map((att: any) => ({
              id: att.id,
              filename: att.filename,
              content_type: att.content_type,
              size: att.size
            }));
          }
        } else {
          console.log('⚠️ Aucune pièce jointe ou endpoint non disponible');
        }
      } catch (attachmentError) {
        console.error('⚠️ Erreur lors de la récupération des pièces jointes:', attachmentError);
        // Continue even if attachment retrieval fails
      }
    } catch (apiError: any) {
      console.error('❌ Erreur Resend Receiving API:', apiError);
      console.error('Message:', apiError.message);
      
      // Fallback: use webhook data if available
      const fallbackText = data.text || data.body_plain || '';
      const fallbackHtml = data.html || data.body_html || '';
      
      if (fallbackText || fallbackHtml) {
        emailText = fallbackText;
        emailHtml = fallbackHtml;
        console.log('✅ Utilisation des données du webhook comme fallback');
      } else {
        emailText = `Email reçu - Contenu non disponible via API.\nSujet: ${subject}`;
        console.log('⚠️ Aucun contenu disponible, utilisation du placeholder');
      }
    }

    // Extract clean body text
    let cleanBody = '';
    if (emailText) {
      cleanBody = emailText;
    } else if (emailHtml) {
      // Strip HTML tags for plain text version
      cleanBody = emailHtml
        .replace(/<style[^>]*>.*?<\/style>/gi, '')
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
    }

    // Enregistrer l'email dans la base de données
    const { data: savedEmail, error } = await supabaseClient
      .from('admin_emails')
      .insert({
        from_email: from,
        to_email: Array.isArray(to) ? to[0] : to,
        subject: subject || 'Sans objet',
        body: cleanBody || emailText || 'Contenu non disponible',
        html_body: emailHtml || null,
        direction: 'incoming',
        status: 'received',
        is_read: false,
        folder: 'inbox',
        metadata: {
          webhook_received_at: new Date().toISOString(),
          email_id: email_id,
          content_available: !!(emailText || emailHtml),
          content_source: 'resend_receiving_api',
          attachments: attachments.length > 0 ? attachments : null,
          attachments_count: attachments.length
        }
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

    // Forwarding supprimé pour éviter les boucles d'emails

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Email reçu et enregistré',
      emailId: savedEmail.id,
      attachments: attachments.length
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("❌ Erreur dans receive-admin-email:", error);
    console.error("Stack:", error.stack);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Impossible d\'enregistrer l\'email',
        stack: error.stack 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
