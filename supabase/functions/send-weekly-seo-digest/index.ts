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

    console.log("[WEEKLY-DIGEST] Generating weekly SEO digest...");

    // Get all active users with paid subscriptions
    const { data: users, error: usersError } = await supabaseClient
      .from("profiles")
      .select("id, email")
      .in("subscription_status", ["active", "trialing"]);

    if (usersError) throw usersError;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    let emailsSent = 0;

    for (const user of users || []) {
      // Get user's SEO activity for the past week
      const { data: products } = await supabaseClient
        .from("shopify_products")
        .select("id, title, optimization_count, last_optimization_at")
        .eq("seller_id", user.id)
        .gte("last_optimization_at", startDate.toISOString())
        .order("optimization_count", { ascending: false })
        .limit(5);

      const { data: articles } = await supabaseClient
        .from("blog_articles")
        .select("id, title, optimization_count")
        .eq("user_id", user.id)
        .gte("last_optimization_at", startDate.toISOString())
        .limit(3);

      // Calculate stats
      const totalOptimizations = (products?.length || 0) + (articles?.length || 0);
      
      if (totalOptimizations === 0) {
        console.log(`[WEEKLY-DIGEST] Skipping ${user.email} - no activity this week`);
        continue;
      }

      const topProducts = products?.slice(0, 3) || [];
      
      const productsHtml = topProducts.map(p => 
        `<li style="margin: 10px 0; padding: 15px; background: #f9f9f9; border-left: 3px solid #667eea; border-radius: 5px;">
          <strong style="color: #333;">${p.title}</strong><br/>
          <span style="color: #667eea; font-size: 14px;">✨ ${p.optimization_count} optimisation(s)</span>
        </li>`
      ).join("");

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">📊 Votre résumé SEO hebdomadaire</h1>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px;">Bonjour,</p>
              
              <p style="font-size: 16px;">Voici un récapitulatif de votre activité SEO cette semaine :</p>
              
              <div style="display: flex; gap: 15px; margin: 25px 0;">
                <div style="flex: 1; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px; text-align: center;">
                  <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 14px;">Optimisations</p>
                  <h2 style="color: white; margin: 5px 0; font-size: 32px;">${totalOptimizations}</h2>
                </div>
                <div style="flex: 1; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 10px; text-align: center;">
                  <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 14px;">Articles</p>
                  <h2 style="color: white; margin: 5px 0; font-size: 32px;">${articles?.length || 0}</h2>
                </div>
              </div>
              
              ${topProducts.length > 0 ? `
                <h3 style="color: #667eea; font-size: 18px; margin-top: 30px;">🏆 Vos produits les plus optimisés:</h3>
                <ul style="list-style: none; padding: 0;">
                  ${productsHtml}
                </ul>
              ` : ""}
              
              <div style="background: #f0f4ff; padding: 20px; border-radius: 8px; margin: 30px 0;">
                <h3 style="color: #667eea; margin: 0 0 10px 0; font-size: 18px;">💡 Recommandations de la semaine</h3>
                <ul style="margin: 0; padding-left: 20px; color: #666;">
                  <li style="margin: 5px 0;">Continuez à optimiser vos fiches produits pour améliorer votre visibilité</li>
                  <li style="margin: 5px 0;">Pensez à créer du contenu blog pour attirer plus de trafic organique</li>
                  <li style="margin: 5px 0;">Analysez vos performances dans Google Search Console</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${Deno.env.get("SUPABASE_URL")?.replace("supabase.co", "lovable.app") || "#"}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px;">
                  Voir le dashboard
                </a>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
              <p>Vous recevez ce résumé hebdomadaire tous les dimanches.</p>
              <p><a href="#" style="color: #667eea;">Se désabonner</a></p>
            </div>
          </body>
        </html>
      `;

      const { error: emailError } = await resend.emails.send({
        from: `${Deno.env.get("FROM_NAME") || "SEO Tool"} <${Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev"}>`,
        to: [user.email],
        subject: `📊 Votre résumé SEO de la semaine - ${totalOptimizations} optimisations`,
        html,
      });

      if (emailError) {
        console.error(`[WEEKLY-DIGEST] Error sending to ${user.email}:`, emailError);
      } else {
        emailsSent++;
        console.log(`[WEEKLY-DIGEST] Sent to ${user.email}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Weekly SEO digest sent",
        emails_sent: emailsSent,
        total_users: users?.length || 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[WEEKLY-DIGEST] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
