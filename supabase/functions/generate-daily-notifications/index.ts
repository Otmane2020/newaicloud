import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("🔄 Generating daily SEO notifications for all users...");

    // Get all users with active settings
    const { data: users, error: usersError } = await supabase
      .from("profiles")
      .select("id, email, full_name");

    if (usersError) throw usersError;

    let notificationsCreated = 0;
    let emailsSent = 0;

    for (const user of users || []) {
      console.log(`Processing user: ${user.email}`);

      // Get user's notification settings
      const { data: settings } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      // Skip if notifications disabled
      if (!settings?.in_app_enabled && !settings?.email_enabled) {
        console.log(`Notifications disabled for ${user.email}`);
        continue;
      }

      const notifications: any[] = [];

      // Check products needing SEO
      if (settings?.notify_products !== false) {
        const { data: products } = await supabase
          .from("shopify_products")
          .select("id, title, seo_title, seo_description")
          .eq("seller_id", user.id)
          .is("seo_title", null)
          .limit(10);

        if (products && products.length > 0) {
          notifications.push({
            user_id: user.id,
            title: `${products.length} produits sans SEO`,
            message: `Optimisez les titres et descriptions SEO de ${products.length} produits pour améliorer votre référencement.`,
            type: "seo_task",
            priority: products.length > 5 ? "high" : "medium",
            category: "products",
            action_url: "/seo?tab=products",
            action_label: "Optimiser maintenant",
            due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            metadata: { count: products.length, product_ids: products.map(p => p.id) }
          });
        }
      }

      // Check collections needing SEO
      if (settings?.notify_collections !== false) {
        const { data: collections } = await supabase
          .from("shopify_collections")
          .select("id, title, seo_title, seo_description")
          .eq("user_id", user.id)
          .is("seo_title", null)
          .limit(10);

        if (collections && collections.length > 0) {
          notifications.push({
            user_id: user.id,
            title: `${collections.length} collections sans SEO`,
            message: `Ajoutez des titres et descriptions SEO à ${collections.length} collections pour capter plus de trafic.`,
            type: "seo_task",
            priority: "high",
            category: "collections",
            action_url: "/seo?tab=collections",
            action_label: "Optimiser maintenant",
            due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            metadata: { count: collections.length, collection_ids: collections.map(c => c.id) }
          });
        }
      }

      // Check images missing ALT
      if (settings?.notify_images !== false) {
        const { data: images } = await supabase
          .from("product_images")
          .select("id, product_id")
          .is("alt_text", null)
          .limit(50);

        if (images && images.length > 0) {
          notifications.push({
            user_id: user.id,
            title: `${images.length} images sans texte ALT`,
            message: `Optimisez ${images.length} images avec des textes ALT pour améliorer votre SEO et accessibilité.`,
            type: "seo_task",
            priority: images.length > 20 ? "high" : "medium",
            category: "images",
            action_url: "/products",
            action_label: "Optimiser les images",
            due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            metadata: { count: images.length, image_ids: images.map(i => i.id) }
          });
        }
      }

      // Check blog articles needing optimization
      if (settings?.notify_blog !== false) {
        const { data: articles } = await supabase
          .from("blog_articles")
          .select("id, title, meta_description")
          .eq("user_id", user.id)
          .is("meta_description", null)
          .limit(10);

        if (articles && articles.length > 0) {
          notifications.push({
            user_id: user.id,
            title: `${articles.length} articles à optimiser`,
            message: `Complétez les méta-descriptions de ${articles.length} articles pour améliorer leur visibilité.`,
            type: "seo_task",
            priority: "medium",
            category: "blog",
            action_url: "/blog",
            action_label: "Voir les articles",
            due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            metadata: { count: articles.length, article_ids: articles.map(a => a.id) }
          });
        }
      }

      // Insert notifications in database
      if (notifications.length > 0 && settings?.in_app_enabled) {
        const { error: insertError } = await supabase
          .from("seo_notifications")
          .insert(notifications);

        if (!insertError) {
          notificationsCreated += notifications.length;
          console.log(`✅ Created ${notifications.length} notifications for ${user.email}`);
        } else {
          console.error(`❌ Error creating notifications for ${user.email}:`, insertError);
        }
      }

      // Send email digest if enabled
      if (notifications.length > 0 && settings?.email_enabled && settings?.daily_digest) {
        try {
          const { error: emailError } = await supabase.functions.invoke("send-notification-email", {
            body: {
              to: user.email,
              userName: user.full_name || user.email.split("@")[0],
              notifications: notifications.map(n => ({
                title: n.title,
                message: n.message,
                category: n.category,
                actionUrl: n.action_url,
                priority: n.priority
              }))
            }
          });

          if (!emailError) {
            emailsSent++;
            console.log(`📧 Sent email digest to ${user.email}`);
          } else {
            console.error(`❌ Error sending email to ${user.email}:`, emailError);
          }
        } catch (emailError) {
          console.error(`❌ Exception sending email to ${user.email}:`, emailError);
        }
      }
    }

    console.log(`✨ Daily notifications completed: ${notificationsCreated} notifications, ${emailsSent} emails`);

    return new Response(
      JSON.stringify({
        success: true,
        notificationsCreated,
        emailsSent,
        usersProcessed: users?.length || 0
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Error generating daily notifications:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});