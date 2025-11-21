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

    console.log("[MONTHLY-REPORT] Generating monthly performance reports...");

    // Get all active users
    const { data: users, error: usersError } = await supabaseClient
      .from("profiles")
      .select("id, email")
      .in("subscription_status", ["active", "trialing"]);

    if (usersError) throw usersError;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);
    startDate.setDate(1);

    const currentMonth = new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

    let emailsSent = 0;

    for (const user of users || []) {
      // Get monthly stats
      const { data: usage } = await supabaseClient
        .from("usage_tracking")
        .select("*")
        .eq("seller_id", user.id)
        .gte("month", startDate.toISOString().substring(0, 7))
        .single();

      if (!usage) {
        console.log(`[MONTHLY-REPORT] No usage data for ${user.email}`);
        continue;
      }

      // Get GSC data if available
      const { data: gscData } = await supabaseClient
        .from("google_search_console_data")
        .select("clicks, impressions, position")
        .eq("user_id", user.id)
        .gte("date", startDate.toISOString().substring(0, 10))
        .order("date", { ascending: false });

      const totalClicks = gscData?.reduce((sum, d) => sum + (d.clicks || 0), 0) || 0;
      const totalImpressions = gscData?.reduce((sum, d) => sum + (d.impressions || 0), 0) || 0;
      const avgPosition = gscData?.length ? 
        gscData.reduce((sum, d) => sum + (d.position || 0), 0) / gscData.length : 0;

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 32px;">📈 Rapport mensuel</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 18px;">${currentMonth}</p>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e0e0e0;">
              <p style="font-size: 16px;">Bonjour,</p>
              
              <p style="font-size: 16px;">Voici le bilan de votre mois :</p>
              
              <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 25px; border-radius: 10px; margin: 25px 0; color: white;">
                <h2 style="margin: 0 0 20px 0; font-size: 24px; text-align: center;">🎯 Vos performances</h2>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                  <div style="text-align: center;">
                    <p style="margin: 0; font-size: 14px; opacity: 0.9;">Optimisations</p>
                    <p style="margin: 5px 0; font-size: 32px; font-weight: bold;">${usage.optimizations_count || 0}</p>
                  </div>
                  <div style="text-align: center;">
                    <p style="margin: 0; font-size: 14px; opacity: 0.9;">Articles créés</p>
                    <p style="margin: 5px 0; font-size: 32px; font-weight: bold;">${usage.articles_count || 0}</p>
                  </div>
                </div>
              </div>
              
              ${totalClicks > 0 ? `
                <div style="background: #f0f4ff; padding: 20px; border-radius: 10px; margin: 25px 0;">
                  <h3 style="color: #667eea; margin: 0 0 15px 0; font-size: 20px;">🔍 Google Search Console</h3>
                  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; text-align: center;">
                    <div>
                      <p style="margin: 0; color: #666; font-size: 14px;">Clics</p>
                      <p style="margin: 5px 0; color: #667eea; font-size: 24px; font-weight: bold;">${totalClicks}</p>
                    </div>
                    <div>
                      <p style="margin: 0; color: #666; font-size: 14px;">Impressions</p>
                      <p style="margin: 5px 0; color: #667eea; font-size: 24px; font-weight: bold;">${totalImpressions}</p>
                    </div>
                    <div>
                      <p style="margin: 0; color: #666; font-size: 14px;">Position moy.</p>
                      <p style="margin: 5px 0; color: #667eea; font-size: 24px; font-weight: bold;">${avgPosition.toFixed(1)}</p>
                    </div>
                  </div>
                </div>
              ` : ""}
              
              <div style="background: #fff9e6; padding: 20px; border-radius: 10px; margin: 25px 0; border-left: 4px solid #ffc107;">
                <h3 style="color: #ff9800; margin: 0 0 10px 0; font-size: 18px;">💡 Recommandations pour le mois prochain</h3>
                <ul style="margin: 0; padding-left: 20px; color: #666;">
                  <li style="margin: 8px 0;">Augmentez la fréquence de vos optimisations pour améliorer votre référencement</li>
                  <li style="margin: 8px 0;">Créez plus de contenu blog pour attirer du trafic organique</li>
                  <li style="margin: 8px 0;">Analysez les mots-clés qui génèrent le plus de clics</li>
                  <li style="margin: 8px 0;">Optimisez les pages avec le meilleur potentiel de conversion</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${Deno.env.get("SUPABASE_URL")?.replace("supabase.co", "lovable.app") || "#"}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 50px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                  Voir le dashboard complet
                </a>
              </div>
            </div>
            
            <div style="background: white; padding: 20px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px; text-align: center;">
              <p style="color: #666; font-size: 12px; margin: 0;">Vous recevez ce rapport le 1er de chaque mois.</p>
              <p style="color: #666; font-size: 12px; margin: 5px 0 0 0;"><a href="#" style="color: #667eea;">Se désabonner</a></p>
            </div>
          </body>
        </html>
      `;

      const { error: emailError } = await resend.emails.send({
        from: `${Deno.env.get("FROM_NAME") || "SEO Tool"} <${Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev"}>`,
        to: [user.email],
        subject: `📈 Votre rapport mensuel - ${currentMonth}`,
        html,
      });

      if (emailError) {
        console.error(`[MONTHLY-REPORT] Error sending to ${user.email}:`, emailError);
      } else {
        emailsSent++;
        console.log(`[MONTHLY-REPORT] Sent to ${user.email}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Monthly reports sent",
        emails_sent: emailsSent,
        total_users: users?.length || 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[MONTHLY-REPORT] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
