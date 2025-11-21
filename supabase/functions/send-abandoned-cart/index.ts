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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("[ABANDONED-CART] Checking for abandoned carts...");

    // Cette fonction devrait être déclenchée par un CRON job
    // Pour l'instant, on simule la logique
    // Dans une vraie implémentation, il faudrait :
    // 1. Récupérer les paniers abandonnés depuis Shopify
    // 2. Vérifier qu'ils ont > 24h
    // 3. Envoyer l'email de rappel

    const { customer_email, customer_name, cart_items, cart_url, discount_code } = await req.json();

    if (!customer_email || !cart_items) {
      throw new Error("customer_email and cart_items are required");
    }

    const itemsList = cart_items?.map((item: any) => 
      `<li style="margin: 15px 0; padding: 15px; background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; display: flex; align-items: center;">
        ${item.image ? `<img src="${item.image}" alt="${item.title}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 5px; margin-right: 15px;" />` : ""}
        <div style="flex: 1;">
          <strong style="color: #333; font-size: 16px;">${item.title}</strong><br/>
          <span style="color: #666; font-size: 14px;">Quantité: ${item.quantity}</span><br/>
          <span style="color: #667eea; font-size: 16px; font-weight: bold;">${item.price}</span>
        </div>
      </li>`
    ).join("") || "";

    const total = cart_items.reduce((sum: number, item: any) => {
      const price = parseFloat(item.price.replace(/[^0-9.,]/g, "").replace(",", "."));
      return sum + (price * item.quantity);
    }, 0).toFixed(2);

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
          <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🛍️ Oups ! Vous avez oublié quelque chose</h1>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e0e0e0;">
            <p style="font-size: 16px;">Bonjour ${customer_name || ""},</p>
            
            <p style="font-size: 16px;">Il semble que vous ayez laissé des articles dans votre panier. Ils vous attendent ! ✨</p>
            
            ${discount_code ? `
              <div style="background: #fff4e6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff9500; text-align: center;">
                <h3 style="margin: 0 0 10px 0; color: #ff9500; font-size: 18px;">🎁 Cadeau spécial pour vous !</h3>
                <p style="margin: 5px 0; font-size: 14px;">Utilisez le code:</p>
                <p style="margin: 10px 0; font-size: 24px; font-weight: bold; color: #ff9500; letter-spacing: 2px;">${discount_code}</p>
                <p style="margin: 5px 0; font-size: 14px; color: #666;">Valable pendant 48h</p>
              </div>
            ` : ""}
            
            <h3 style="color: #f5576c; font-size: 18px; margin-top: 30px;">Articles dans votre panier:</h3>
            <ul style="list-style: none; padding: 0;">
              ${itemsList}
            </ul>
            
            <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: right;">
              <p style="margin: 0; font-size: 18px;"><strong>Total:</strong> <span style="color: #f5576c; font-size: 22px; font-weight: bold;">${total} €</span></p>
            </div>
            
            ${cart_url ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${cart_url}" style="display: inline-block; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 15px 50px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 15px rgba(245, 87, 108, 0.3);">
                  Finaliser ma commande
                </a>
              </div>
            ` : ""}
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center;">
              <p style="color: #666; font-size: 14px;">💝 Livraison offerte dès 50€ d'achat</p>
              <p style="color: #666; font-size: 14px;">🔒 Paiement 100% sécurisé</p>
            </div>
          </div>
          
          <div style="background: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
            <p style="color: #666; font-size: 12px; margin: 0;">Vous recevez cet email car vous avez abandonné votre panier.</p>
          </div>
        </body>
      </html>
    `;

    const { data, error } = await resend.emails.send({
      from: `${Deno.env.get("FROM_NAME") || "Votre Boutique"} <${Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev"}>`,
      to: [customer_email],
      subject: `🛍️ Vos articles vous attendent ! ${discount_code ? `+ Code promo ${discount_code}` : ""}`,
      html,
    });

    if (error) throw error;

    console.log("[ABANDONED-CART] Email sent successfully to:", customer_email);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Abandoned cart email sent",
        email_id: data?.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[ABANDONED-CART] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
