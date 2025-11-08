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

    // Resend webhook format peut avoir différentes structures
    // Format standard: { from, to, subject, text, html }
    // Format événement: { data: { from, to, subject, ... } }
    const emailContent = emailData.data || emailData;
    const { from, to, subject, text, html } = emailContent;

    // Extract clean body text - prioritize text version, clean HTML as fallback
    let cleanBody = '';
    if (text) {
      cleanBody = text;
    } else if (html) {
      // Strip HTML tags for plain text version
      cleanBody = html
        .replace(/<style[^>]*>.*?<\/style>/gi, '') // Remove style tags
        .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
        .replace(/<[^>]+>/g, '') // Remove all HTML tags
        .replace(/&nbsp;/g, ' ') // Replace nbsp
        .replace(/&amp;/g, '&') // Replace amp
        .replace(/&lt;/g, '<') // Replace lt
        .replace(/&gt;/g, '>') // Replace gt
        .replace(/&quot;/g, '"') // Replace quot
        .replace(/&#39;/g, "'") // Replace apos
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
    }

    console.log("📨 Traitement email:");
    console.log("  - De:", from);
    console.log("  - À:", to);
    console.log("  - Sujet:", subject);

    if (!from || !to) {
      console.error("❌ Données email invalides - from ou to manquant");
      throw new Error("Données email invalides");
    }

    // Enregistrer l'email dans la base de données
    const { data, error } = await supabaseClient
      .from('admin_emails')
      .insert({
        from_email: from,
        to_email: to,
        subject: subject || 'Sans objet',
        body: cleanBody || 'Email reçu sans contenu texte',
        html_body: html || null,
        direction: 'incoming',
        status: 'received',
        is_read: false,
        folder: 'inbox',
        metadata: {
          webhook_received_at: new Date().toISOString(),
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
    console.log("  - ID:", data.id);
    console.log("  - Folder:", data.folder);
    console.log("  - Status:", data.status);

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Email reçu et enregistré',
      emailId: data.id 
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
