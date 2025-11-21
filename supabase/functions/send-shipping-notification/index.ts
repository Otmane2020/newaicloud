import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      customer_email, 
      customer_name, 
      order_number, 
      tracking_number, 
      tracking_url, 
      carrier,
      estimated_delivery 
    } = await req.json();

    console.log("[SHIPPING-NOTIFICATION] Processing shipping notification for order:", order_number);

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">📦 Votre commande est expédiée !</h1>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">Bonjour ${customer_name},</p>
            
            <p style="font-size: 16px;">Bonne nouvelle ! Votre commande a été expédiée et est en route vers vous.</p>
            
            <div style="background: #f0fff4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #38ef7d;">
              <h2 style="margin: 0 0 15px 0; color: #11998e; font-size: 20px;">Informations d'expédition</h2>
              <p style="margin: 5px 0; font-size: 14px;"><strong>Commande:</strong> #${order_number}</p>
              <p style="margin: 5px 0; font-size: 14px;"><strong>Transporteur:</strong> ${carrier || "Standard"}</p>
              <p style="margin: 5px 0; font-size: 14px;"><strong>Numéro de suivi:</strong> ${tracking_number}</p>
              ${estimated_delivery ? `<p style="margin: 5px 0; font-size: 14px;"><strong>Livraison estimée:</strong> ${new Date(estimated_delivery).toLocaleDateString("fr-FR")}</p>` : ""}
            </div>
            
            ${tracking_url ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${tracking_url}" style="display: inline-block; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px;">
                  Suivre mon colis
                </a>
              </div>
            ` : ""}
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
              <p style="color: #666; font-size: 14px; margin: 5px 0;">💡 <strong>Astuce:</strong> Gardez ce numéro de suivi à portée de main pour suivre votre colis en temps réel.</p>
              <p style="color: #666; font-size: 14px; margin: 5px 0;">📬 Vous recevrez un email de confirmation dès que votre colis sera livré.</p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>Des questions ? Notre équipe est là pour vous aider !</p>
          </div>
        </body>
      </html>
    `;

    const { data, error } = await resend.emails.send({
      from: `${Deno.env.get("FROM_NAME") || "Votre Boutique"} <${Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev"}>`,
      to: [customer_email],
      subject: `📦 Votre commande #${order_number} a été expédiée`,
      html,
    });

    if (error) throw error;

    console.log("[SHIPPING-NOTIFICATION] Email sent successfully to:", customer_email);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Shipping notification email sent",
        email_id: data?.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[SHIPPING-NOTIFICATION] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
