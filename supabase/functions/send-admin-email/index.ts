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

const emailHeader = `
<div style="text-align:center; padding: 24px; background: white; margin-bottom: 24px;">
  <div style="display: inline-flex; align-items: center; gap: 16px;">
    <div style="width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #4776E6 0%, #3B82F6 50%, #0EA5E9 100%); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px rgba(59, 130, 246, 0.4);">
      <svg width="36" height="36" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M64 20L30 40L64 60L98 40L64 20Z" fill="white" fill-opacity="0.95"/>
        <path d="M30 88L64 108L98 88" stroke="white" stroke-width="6" stroke-linecap="round"/>
        <path d="M30 64L64 84L98 64" stroke="white" stroke-width="6" stroke-linecap="round"/>
        <circle cx="94" cy="34" r="14" fill="white"/>
        <path d="M94 28V40M88 34H100" stroke="#3B82F6" stroke-width="3" stroke-linecap="round"/>
      </svg>
    </div>
    <div style="text-align: left;">
      <div style="font-weight: 600; color: #1e293b; font-size: 18px; margin-bottom: 2px;">NewAI Support</div>
      <div style="color: #64748b; font-size: 14px;">support@newai.sale</div>
    </div>
  </div>
</div>
`;

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
        from_email: 'support@newai.sale',
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
        "NewAI Support <support@newai.sale>",
        to,
        subject,
        `${emailHeader}${htmlBody || `<p>${body}</p>`}`
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
