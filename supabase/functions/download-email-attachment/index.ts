import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { emailId, attachmentId } = await req.json();

    if (!emailId || !attachmentId) {
      throw new Error("Email ID et Attachment ID requis");
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY non configurée");
    }

    console.log(`📎 Téléchargement de la pièce jointe ${attachmentId} de l'email ${emailId}`);

    // Get attachment using Resend Receiving API
    const response = await fetch(
      `https://api.resend.com/emails/receiving/${emailId}/attachments/${attachmentId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Erreur Resend API (${response.status}):`, errorText);
      throw new Error(`Erreur API Resend: ${response.status}`);
    }

    // Get the attachment data
    const attachmentData = await response.json();
    
    console.log("✅ Pièce jointe récupérée:", attachmentData.filename);

    return new Response(JSON.stringify({ 
      success: true,
      data: attachmentData
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("❌ Erreur dans download-email-attachment:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Impossible de télécharger la pièce jointe'
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
