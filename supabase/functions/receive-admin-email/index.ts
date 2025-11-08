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
    console.log("📧 Webhook Resend - Email reçu:", JSON.stringify(emailData, null, 2));

    // Resend webhook format: { type: "email.received", data: { ... } }
    const data = emailData.data || emailData;
    const { from, to, subject, email_id, text, html } = data;

    console.log("📨 Traitement email:");
    console.log("  - De:", from);
    console.log("  - À:", to);
    console.log("  - Sujet:", subject);
    console.log("  - Email ID:", email_id);

    if (!from || !to) {
      console.error("❌ Données email invalides - from ou to manquant");
      throw new Error("Données email invalides");
    }

    // IMPORTANT: Resend webhook "email.received" ne contient PAS text/html
    // Il faut utiliser l'API Resend pour récupérer le contenu complet
    let emailText = text || '';
    let emailHtml = html || '';
    
    if (email_id && !emailText && !emailHtml) {
      try {
        console.log(`🔍 Récupération du contenu via API Resend pour email_id: ${email_id}`);
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        
        if (resendApiKey) {
          const response = await fetch(`https://api.resend.com/emails/${email_id}`, {
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
            },
          });
          
          if (response.ok) {
            const emailDetails = await response.json();
            emailText = emailDetails.text || '';
            emailHtml = emailDetails.html || '';
            console.log(`✅ Contenu récupéré - text: ${emailText.length} chars, html: ${emailHtml.length} chars`);
          } else {
            console.error('❌ Erreur API Resend:', await response.text());
          }
        }
      } catch (error) {
        console.error('❌ Erreur lors de la récupération du contenu:', error);
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
        body: cleanBody || '',
        html_body: emailHtml || null,
        direction: 'incoming',
        status: 'received',
        is_read: false,
        folder: 'inbox',
        metadata: {
          webhook_received_at: new Date().toISOString(),
          email_id: email_id,
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
