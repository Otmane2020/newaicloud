import { createClient } from "npm:@supabase/supabase-js@2";
import { getNotificationTemplate } from "../_shared/notification-templates.ts";

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

    // Get time of day from request body (morning or afternoon)
    const { time } = await req.json().catch(() => ({ time: 'morning' }));
    const timeOfDay = time === 'afternoon' ? 'afternoon' : 'morning';

    console.log(`🔄 Generating ${timeOfDay} SEO notifications for all users...`);

    // Get all users with active settings
    const { data: users, error: usersError } = await supabase
      .from("profiles")
      .select("id, email, full_name, language");

    if (usersError) throw usersError;

    let notificationsCreated = 0;
    let emailsSent = 0;

    for (const user of users || []) {
      console.log(`Processing user: ${user.email}`);
      const userLanguage = (user.language || 'fr') as 'en' | 'fr';

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

      // Morning notifications: Opportunities and tasks
      if (timeOfDay === 'morning') {
        // Check products needing SEO
        if (settings?.notify_products !== false) {
          const { data: products } = await supabase
            .from("shopify_products")
            .select("id, title, seo_title, seo_description")
            .eq("seller_id", user.id)
            .is("seo_title", null)
            .limit(20);

          if (products && products.length > 0) {
            const template = getNotificationTemplate('products', products.length, userLanguage);
            notifications.push({
              user_id: user.id,
              title: template.title,
              message: template.message,
              type: "seo_task",
              priority: template.priority,
              category: "products",
              action_url: "/products/title-description",
              action_label: userLanguage === 'fr' ? "🚀 Optimiser maintenant" : "🚀 Optimize now",
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
            const template = getNotificationTemplate('collections', collections.length, userLanguage);
            notifications.push({
              user_id: user.id,
              title: template.title,
              message: template.message,
              type: "seo_task",
              priority: template.priority,
              category: "collections",
              action_url: "/collections",
              action_label: userLanguage === 'fr' ? "💎 Optimiser maintenant" : "💎 Optimize now",
              due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              metadata: { count: collections.length, collection_ids: collections.map(c => c.id) }
            });
          }
        }
      }

      // Afternoon notifications: Reminders, urgencies, and achievements
      if (timeOfDay === 'afternoon') {
        // Check images missing ALT
        if (settings?.notify_images !== false) {
          const { data: images } = await supabase
            .from("product_images")
            .select("id, product_id")
            .is("alt_text", null)
            .limit(50);

          if (images && images.length > 0) {
            const template = getNotificationTemplate('images', images.length, userLanguage);
            notifications.push({
              user_id: user.id,
              title: template.title,
              message: template.message,
              type: "seo_task",
              priority: template.priority,
              category: "images",
              action_url: "/products/images",
              action_label: userLanguage === 'fr' ? "📸 Optimiser les images" : "📸 Optimize images",
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
            const template = getNotificationTemplate('blog', articles.length, userLanguage);
            notifications.push({
              user_id: user.id,
              title: template.title,
              message: template.message,
              type: "seo_task",
              priority: template.priority,
              category: "blog",
              action_url: "/blog",
              action_label: userLanguage === 'fr' ? "✍️ Voir les articles" : "✍️ View articles",
              due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              metadata: { count: articles.length, article_ids: articles.map(a => a.id) }
            });
          }
        }

        // Check for achievements (milestone reached)
        const { data: allProducts } = await supabase
          .from("shopify_products")
          .select("id, seo_title, optimization_count")
          .eq("seller_id", user.id);

        if (allProducts && allProducts.length > 0) {
          const optimizedCount = allProducts.filter(p => p.seo_title).length;
          const optimizationRate = Math.round((optimizedCount / allProducts.length) * 100);

          // Milestone notifications (50%, 75%, 90%, 100%)
          if ([50, 75, 90, 100].includes(optimizationRate)) {
            const achievementMessages = {
              fr: {
                50: { title: "🎯 Mi-chemin atteint !", message: `Félicitations ! 50% de votre catalogue est optimisé. Continuez comme ça pour atteindre 100% !` },
                75: { title: "🔥 75% complété !", message: `Incroyable ! Vous êtes à 75%. Plus que quelques produits pour atteindre l'excellence SEO !` },
                90: { title: "⭐ 90% optimisé !", message: `Presque parfait ! 90% de votre catalogue brille. Terminez les derniers 10% pour le trophée !` },
                100: { title: "🏆 CHAMPION SEO !", message: `🎊 100% COMPLET ! Votre catalogue est optimisé à la perfection. Bravo champion !` }
              },
              en: {
                50: { title: "🎯 Halfway There!", message: `Congrats! 50% of your catalog is optimized. Keep going to reach 100%!` },
                75: { title: "🔥 75% Complete!", message: `Amazing! You're at 75%. Just a few more products for SEO excellence!` },
                90: { title: "⭐ 90% Optimized!", message: `Almost perfect! 90% of your catalog shines. Finish the last 10% for the trophy!` },
                100: { title: "🏆 SEO CHAMPION!", message: `🎊 100% COMPLETE! Your catalog is perfectly optimized. Bravo champion!` }
              }
            };

            const msg = achievementMessages[userLanguage][optimizationRate as 50 | 75 | 90 | 100];
            notifications.push({
              user_id: user.id,
              title: msg.title,
              message: msg.message,
              type: "achievement",
              priority: "low",
              category: "achievements",
              action_url: "/dashboard",
              action_label: userLanguage === 'fr' ? "🎉 Voir tableau de bord" : "🎉 View dashboard",
              metadata: { achievement_type: 'milestone', rate: optimizationRate, optimized: optimizedCount, total: allProducts.length }
            });
          }
        }
      }

      // Insert notifications in database (app_notifications instead of seo_notifications)
      if (notifications.length > 0 && settings?.in_app_enabled) {
        const { error: insertError } = await supabase
          .from("app_notifications")
          .insert(notifications);

        if (!insertError) {
          notificationsCreated += notifications.length;
          console.log(`✅ Created ${notifications.length} notifications for ${user.email}`);
        } else {
          console.error(`❌ Error creating notifications for ${user.email}:`, insertError);
        }
      }

      // Send email digest if enabled (only in afternoon)
      if (timeOfDay === 'afternoon' && notifications.length > 0 && settings?.email_enabled && settings?.daily_digest) {
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

    console.log(`✨ ${timeOfDay} notifications completed: ${notificationsCreated} notifications, ${emailsSent} emails`);

    return new Response(
      JSON.stringify({
        success: true,
        timeOfDay,
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
