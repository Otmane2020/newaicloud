import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
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
    const { order_id, customer_email, customer_name, order_number, total_price, currency, items, tracking_url } = await req.json();

    console.log("[ORDER-CONFIRMATION] Processing order:", order_number);

    const itemsList = items?.map((item: any) => 
      `<li style="margin: 10px 0; padding: 10px; background: #f9f9f9; border-radius: 5px;">
        <strong>${item.title}</strong><br/>
        Quantité: ${item.quantity} × ${item.price} ${currency}
      </li>`
    ).join("") || "";

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Commande confirmée ! 🎉</h1>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">Bonjour ${customer_name},</p>
            
            <p style="font-size: 16px;">Merci pour votre commande ! Nous avons bien reçu votre paiement et préparons votre envoi.</p>
            
            <div style="background: #f0f4ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin: 0 0 15px 0; color: #667eea; font-size: 20px;">Commande #${order_number}</h2>
              <p style="margin: 5px 0; font-size: 14px;"><strong>Total:</strong> ${total_price} ${currency}</p>
              ${tracking_url ? `<p style="margin: 5px 0; font-size: 14px;"><strong>Suivi:</strong> <a href="${tracking_url}" style="color: #667eea;">Suivre ma commande</a></p>` : ""}
            </div>
            
            <h3 style="color: #667eea; font-size: 18px;">Articles commandés:</h3>
            <ul style="list-style: none; padding: 0;">
              ${itemsList}
            </ul>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center;">
              <p style="color: #666; font-size: 14px;">Vous recevrez un email de confirmation d'expédition dès que votre commande sera envoyée.</p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>Besoin d'aide ? Contactez notre support client</p>
          </div>
        </body>
      </html>
    `;

    const { data, error } = await resend.emails.send({
      from: `${Deno.env.get("FROM_NAME") || "Votre Boutique"} <${Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev"}>`,
      to: [customer_email],
      subject: `Confirmation de commande #${order_number}`,
      html,
    });

    if (error) throw error;

    console.log("[ORDER-CONFIRMATION] Email sent successfully to:", customer_email);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Order confirmation email sent",
        email_id: data?.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[ORDER-CONFIRMATION] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
