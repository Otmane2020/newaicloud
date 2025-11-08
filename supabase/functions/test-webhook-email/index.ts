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
    console.log("🧪 Test de webhook - Envoi d'un email de test au webhook receive-admin-email");

    // URL du webhook receive-admin-email
    const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/receive-admin-email`;
    
    // Simuler le format exact du webhook Resend
    const testEmailPayload = {
      from: "test-client@example.com",
      to: "support@newai.sale",
      subject: `Test Webhook - ${new Date().toLocaleTimeString('fr-FR')}`,
      text: "Ceci est un email de test envoyé via le webhook pour vérifier que la réception fonctionne correctement.",
      html: "<p>Ceci est un email de test envoyé via le webhook pour vérifier que la réception fonctionne correctement.</p>"
    };

    console.log("📤 Envoi au webhook:", webhookUrl);
    console.log("📧 Payload:", JSON.stringify(testEmailPayload, null, 2));

    // Appeler le webhook
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testEmailPayload),
    });

    const responseData = await response.json();
    
    console.log("📨 Réponse du webhook:", response.status);
    console.log("📨 Data:", JSON.stringify(responseData, null, 2));

    if (!response.ok) {
      throw new Error(`Webhook failed: ${JSON.stringify(responseData)}`);
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Email de test envoyé au webhook avec succès',
      webhookResponse: responseData,
      emailId: responseData.emailId
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("❌ Erreur test webhook:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Erreur lors du test du webhook'
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
