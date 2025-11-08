import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// Resend API client
const RESEND_API_URL = "https://api.resend.com/emails";

async function sendEmailWithResend(from: string, to: string, subject: string, html: string) {
  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error: ${error}`);
  }

  return response.json();
}



const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdminEmailRequest {
  to: string;
  subject: string;
  body: string;
  htmlBody?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) throw new Error("Not authenticated");

    // Vérifier que l'utilisateur est admin
    const { data: isAdmin, error: roleError } = await supabaseClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      return new Response(JSON.stringify({ error: "Unauthorized - Admin only" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { to, subject, body, htmlBody }: AdminEmailRequest = await req.json();

    // Créer l'entrée dans la base de données
    const { data: emailRecord, error: dbError } = await supabaseClient
      .from('admin_emails')
      .insert({
        from_email: 'superadmin@newai.sale',
        to_email: to,
        subject: subject,
        body: body,
        html_body: htmlBody || body,
        status: 'pending',
        direction: 'outgoing',
        folder: 'sent',
        sent_by: user.id,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // Envoyer l'email via Resend
    try {
      const emailResponse = await sendEmailWithResend(
        "NewAI <superadmin@newai.sale>",
        to,
        subject,
        htmlBody || `<p>${body}</p>`
      );

      // Mettre à jour le statut à "sent"
      await supabaseClient
        .from('admin_emails')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          metadata: { resend_id: emailResponse.id }
        })
        .eq('id', emailRecord.id);

      return new Response(JSON.stringify({ 
        success: true, 
        emailId: emailRecord.id,
        resendId: emailResponse.id 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });

    } catch (emailError: any) {
      // Mettre à jour le statut à "failed"
      await supabaseClient
        .from('admin_emails')
        .update({
          status: 'failed',
          error_message: emailError.message
        })
        .eq('id', emailRecord.id);

      throw new Error(`Failed to send email: ${emailError.message}`);
    }

  } catch (error: any) {
    console.error("Error in send-admin-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
