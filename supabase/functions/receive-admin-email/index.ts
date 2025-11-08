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
    console.log("📧 Webhook Resend - Email reçu (FULL PAYLOAD):");
    console.log(JSON.stringify(emailData, null, 2));

    // Resend webhook format: { type: "email.received", data: { ... } }
    const data = emailData.data || emailData;
    const { from, to, subject, email_id, text, html, body_plain, body_html } = data;

    console.log("📨 Extraction des champs:");
    console.log("  - from:", from);
    console.log("  - to:", to);
    console.log("  - subject:", subject);
    console.log("  - email_id:", email_id);
    console.log("  - text:", text ? `${text.substring(0, 100)}...` : 'NON PRÉSENT');
    console.log("  - html:", html ? `${html.substring(0, 100)}...` : 'NON PRÉSENT');
    console.log("  - body_plain:", body_plain ? `${body_plain.substring(0, 100)}...` : 'NON PRÉSENT');
    console.log("  - body_html:", body_html ? `${body_html.substring(0, 100)}...` : 'NON PRÉSENT');
    console.log("  - Tous les champs disponibles:", Object.keys(data).join(', '));

    if (!from || !to) {
      console.error("❌ Données email invalides - from ou to manquant");
      throw new Error("Données email invalides");
    }

    // Essayer différents champs pour le contenu
    let emailText = text || body_plain || '';
    let emailHtml = html || body_html || '';
    
    console.log(`📝 Contenu initial - text: ${emailText.length} chars, html: ${emailHtml.length} chars`);
    
    // Si on n'a toujours pas de contenu, vérifier si le contenu est dans d'autres champs
    if (!emailText && !emailHtml) {
      console.log("⚠️ ATTENTION: Aucun contenu texte/HTML trouvé dans le webhook!");
      console.log("📋 Configuration Resend requise:");
      console.log("   1. Inbound Routing doit être activé");
      console.log("   2. Le webhook doit être configuré pour 'email.received'");
      console.log("   3. Resend ne stocke PAS le contenu des emails entrants via l'API");
      console.log("");
      console.log("💡 SOLUTION RECOMMANDÉE:");
      console.log("   - Utiliser Resend Inbound Parsing (si disponible)");
      console.log("   - OU utiliser un service comme Mailgun Inbound Routes");
      console.log("   - OU intégrer Gmail API pour lire les emails");
      console.log("");
      console.log("⚠️ Pour l'instant, l'email sera enregistré SANS contenu");
      
      // Essayer de récupérer via l'API si on a un email_id (pour les emails sortants uniquement)
      if (email_id) {
        try {
          console.log(`🔍 Tentative de récupération via API Resend (email_id: ${email_id})`);
          const resendApiKey = Deno.env.get("RESEND_API_KEY");
          
          if (resendApiKey) {
            const response = await fetch(`https://api.resend.com/emails/${email_id}`, {
              headers: {
                'Authorization': `Bearer ${resendApiKey}`,
              },
            });
            
            if (response.ok) {
              const emailDetails = await response.json();
              console.log("📧 Réponse API Resend:", JSON.stringify(emailDetails, null, 2));
              emailText = emailDetails.text || emailDetails.body_plain || '';
              emailHtml = emailDetails.html || emailDetails.body_html || '';
              console.log(`✅ Contenu récupéré via API - text: ${emailText.length} chars, html: ${emailHtml.length} chars`);
            } else {
              console.error('❌ Erreur API Resend (status ' + response.status + '):', await response.text());
            }
          }
        } catch (error) {
          console.error('❌ Erreur lors de la récupération du contenu:', error);
        }
      }
      
      // Si toujours pas de contenu, utiliser le subject comme contenu temporaire
      if (!emailText && !emailHtml) {
        emailText = `Email reçu - Contenu non disponible.\nSujet: ${subject}\n\nPour voir le contenu complet, veuillez configurer l'inbound parsing.`;
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
          content_source: emailText || emailHtml ? 'webhook_or_api' : 'none',
          warning: emailText || emailHtml ? null : 'Content not available from Resend. Configure inbound parsing.',
          raw_data: emailData
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

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Email reçu et enregistré',
      emailId: savedEmail.id 
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
