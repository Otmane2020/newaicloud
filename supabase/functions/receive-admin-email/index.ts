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
    console.log("📧 Email reçu:", emailData);

    // Resend webhook format
    const { from, to, subject, text, html } = emailData;

    // Enregistrer l'email dans la base de données
    const { data, error } = await supabaseClient
      .from('admin_emails')
      .insert({
        from_email: from,
        to_email: to,
        subject: subject || 'Sans objet',
        body: text || '',
        html_body: html || null,
        direction: 'incoming',
        status: 'received',
        is_read: false
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Erreur lors de l'enregistrement:", error);
      throw error;
    }

    console.log("✅ Email enregistré avec succès:", data.id);

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
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Impossible d\'enregistrer l\'email' 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
