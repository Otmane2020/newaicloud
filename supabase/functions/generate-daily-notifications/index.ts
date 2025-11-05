import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Embedded notification templates
const templates = {
  products: {
    low: {
      en: { title: "🎯 Quick SEO Win!", message: (c: number) => `${c} products ready for SEO. 5 min = +20% traffic!` },
      fr: { title: "🎯 Opportunité SEO!", message: (c: number) => `${c} produits prêts. 5 min = +20% trafic!` }
    },
    medium: {
      en: { title: "⚡ SEO Boost!", message: (c: number) => `${c} products missing SEO. Don't fall behind!` },
      fr: { title: "⚡ Amélioration SEO!", message: (c: number) => `${c} produits sans SEO. Ne manquez pas ça!` }
    },
    high: {
      en: { title: "🚨 SEO Alert!", message: (c: number) => `URGENT: ${c} products invisible! Fix now!` },
      fr: { title: "🚨 Alerte SEO!", message: (c: number) => `URGENT: ${c} produits invisibles!` }
    }
  },
  collections: {
    en: { title: "💰 Revenue Opportunity!", message: (c: number) => `${c} collections = 50-100 visitors/month each!` },
    fr: { title: "💰 Opportunité Revenu!", message: (c: number) => `${c} collections = 50-100 visiteurs/mois!` }
  },
  images: {
    medium: {
      en: { title: "📸 Image SEO Missing!", message: (c: number) => `${c} images without ALT. 0% image traffic!` },
      fr: { title: "📸 SEO d'Image!", message: (c: number) => `${c} images sans ALT. 0% de trafic!` }
    },
    high: {
      en: { title: "🔍 Huge SEO Gap!", message: (c: number) => `${c} images invisible to search!` },
      fr: { title: "🔍 Lacune SEO!", message: (c: number) => `${c} images invisibles!` }
    }
  },
  blog: {
    en: { title: "✍️ Blog Optimization!", message: (c: number) => `${c} articles = 2x more clicks!` },
    fr: { title: "✍️ Optimisation Blog!", message: (c: number) => `${c} articles = 2x plus de clics!` }
  },
  milestone: {
    en: { title: "🎊 Milestone Reached!", message: (p: number) => `${p}% optimized! Great work!` },
    fr: { title: "🎊 Étape Franchie!", message: (p: number) => `${p}% optimisé! Bravo!` }
  }
};

function getTemplate(type: string, count: number, lang: 'en' | 'fr' = 'fr') {
  const l = lang;
  if (type === 'products') {
    if (count <= 5) return { ...templates.products.low[l], priority: 'low' };
    if (count <= 15) return { ...templates.products.medium[l], priority: 'medium' };
    return { ...templates.products.high[l], priority: 'high' };
  }
  if (type === 'images') {
    return count > 20 
      ? { ...templates.images.high[l], priority: 'high' }
      : { ...templates.images.medium[l], priority: 'medium' };
  }
  if (type === 'collections') return { ...templates.collections[l], priority: 'high' };
  if (type === 'blog') return { ...templates.blog[l], priority: 'medium' };
  return { title: '', message: (_: number) => '', priority: 'medium' };
}

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
            const t = getTemplate('products', products.length, userLanguage);
            notifications.push({
              user_id: user.id,
              title: t.title,
              message: t.message(products.length),
              type: "seo_task",
              priority: t.priority,
              category: "products",
              action_url: "/seo?tab=products",
              action_label: userLanguage === 'fr' ? "Optimiser maintenant" : "Optimize now",
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
            const t = getTemplate('collections', collections.length, userLanguage);
            notifications.push({
              user_id: user.id,
              title: t.title,
              message: t.message(collections.length),
              type: "seo_task",
              priority: t.priority,
              category: "collections",
              action_url: "/seo?tab=collections",
              action_label: userLanguage === 'fr' ? "Optimiser maintenant" : "Optimize now",
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
            const t = getTemplate('images', images.length, userLanguage);
            notifications.push({
              user_id: user.id,
              title: t.title,
              message: t.message(images.length),
              type: "seo_task",
              priority: t.priority,
              category: "images",
              action_url: "/products",
              action_label: userLanguage === 'fr' ? "Optimiser les images" : "Optimize images",
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
            const t = getTemplate('blog', articles.length, userLanguage);
            notifications.push({
              user_id: user.id,
              title: t.title,
              message: t.message(articles.length),
              type: "seo_task",
              priority: t.priority,
              category: "blog",
              action_url: "/blog",
              action_label: userLanguage === 'fr' ? "Voir les articles" : "View articles",
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

          // Milestone notifications (50%, 75%, 100%)
          if (optimizationRate === 50 || optimizationRate === 75 || optimizationRate === 100) {
            const t = templates.milestone[userLanguage];
            notifications.push({
              user_id: user.id,
              title: t.title,
              message: t.message(optimizationRate),
              type: "achievement",
              priority: "low",
              category: "achievements",
              action_url: "/dashboard",
              action_label: userLanguage === 'fr' ? "Voir le tableau de bord" : "View dashboard",
              metadata: { achievement_type: 'milestone', rate: optimizationRate }
            });
          }
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
