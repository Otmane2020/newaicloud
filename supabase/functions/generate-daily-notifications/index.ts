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
    // Health check
    const rawBody = await req.text();
    if (rawBody) {
      try {
        const body = JSON.parse(rawBody);
        if (body?.healthCheck === true) {
          return new Response(JSON.stringify({ status: "healthy" }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      } catch { /* not JSON, continue */ }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse body for time parameter
    let time = 'morning';
    if (rawBody) {
      try {
        const parsed = JSON.parse(rawBody);
        time = parsed.time || 'morning';
      } catch { /* use default */ }
    }
    const timeOfDay = time === 'afternoon' ? 'afternoon' : 'morning';

    console.log(`🔄 Generating ${timeOfDay} SEO notifications for all users...`);

    // Get all users with active settings
    const { data: users, error: usersError } = await supabase
      .from("profiles")
      .select("id, email, full_name, preferred_language");

    if (usersError) throw usersError;

    let notificationsCreated = 0;
    let emailsSent = 0;

    for (const user of users || []) {
      console.log(`Processing user: ${user.email}`);
      const userLanguage = (user.preferred_language || 'fr') as 'en' | 'fr';

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

      // Get latest SEO audit for this user
      const { data: latestAudit } = await supabase
        .from("seo_audit_reports")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Morning notifications: Based on audit issues
      if (timeOfDay === 'morning') {
        // Check for critical issues from audit
        if (latestAudit?.audit_results?.issues) {
          const issues = latestAudit.audit_results.issues;
          
          // High priority issues
          const criticalIssues = issues.filter((i: any) => i.priority === 'high');
          if (criticalIssues.length > 0 && settings?.notify_products !== false) {
            const issue = criticalIssues[0];
            notifications.push({
              user_id: user.id,
              title: userLanguage === 'fr' ? `🚨 Action critique: ${issue.title}` : `🚨 Critical: ${issue.title}`,
              message: issue.description,
              type: "seo_task",
              priority: "high",
              category: issue.category || "products",
              action_url: issue.category === 'products' ? "/products/title-description" : 
                         issue.category === 'collections' ? "/collections" :
                         issue.category === 'content' ? "/blog" : "/seo",
              action_label: userLanguage === 'fr' ? "🔧 Corriger maintenant" : "🔧 Fix now",
              due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              metadata: { count: issue.count, action: issue.action, from_audit: true }
            });
          }

          // Medium priority issues
          const mediumIssues = issues.filter((i: any) => i.priority === 'medium');
          if (mediumIssues.length > 0) {
            const totalCount = mediumIssues.reduce((sum: number, i: any) => sum + (i.count || 0), 0);
            notifications.push({
              user_id: user.id,
              title: userLanguage === 'fr' 
                ? `⚠️ ${mediumIssues.length} améliorations SEO recommandées` 
                : `⚠️ ${mediumIssues.length} SEO improvements recommended`,
              message: userLanguage === 'fr'
                ? `${totalCount} éléments à optimiser pour améliorer votre référencement`
                : `${totalCount} items to optimize for better SEO`,
              type: "seo_task",
              priority: "medium",
              category: "audit",
              action_url: "/seo?tab=audit",
              action_label: userLanguage === 'fr' ? "📊 Voir l'audit SEO" : "📊 View SEO audit",
              due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              metadata: { issues: mediumIssues.map((i: any) => i.title), from_audit: true }
            });
          }
        }

        // Score-based notifications
        if (latestAudit) {
          const globalScore = latestAudit.global_score || 0;
          
          // Low score alert
          if (globalScore < 50) {
            notifications.push({
              user_id: user.id,
              title: userLanguage === 'fr' ? `📉 Score SEO critique: ${globalScore}%` : `📉 Critical SEO score: ${globalScore}%`,
              message: userLanguage === 'fr'
                ? "Votre score SEO nécessite une attention urgente. Consultez votre audit pour les actions prioritaires."
                : "Your SEO score needs urgent attention. Check your audit for priority actions.",
              type: "seo_task",
              priority: "high",
              category: "audit",
              action_url: "/seo?tab=audit",
              action_label: userLanguage === 'fr' ? "🔍 Analyser l'audit" : "🔍 Analyze audit",
              metadata: { score: globalScore, from_audit: true }
            });
          }
          
          // Category-specific low scores
          const categoryScores = [
            { name: 'products', score: latestAudit.products_score, url: '/products/title-description' },
            { name: 'collections', score: latestAudit.collections_score, url: '/collections' },
            { name: 'images', score: latestAudit.images_score, url: '/products/images' },
            { name: 'blog', score: latestAudit.blog_score, url: '/blog' },
          ];

          for (const cat of categoryScores) {
            if (cat.score !== null && cat.score < 60 && settings?.[`notify_${cat.name}`] !== false) {
              const template = getNotificationTemplate(cat.name as any, 1, userLanguage);
              notifications.push({
                user_id: user.id,
                title: userLanguage === 'fr' 
                  ? `📊 ${cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}: Score ${cat.score}%` 
                  : `📊 ${cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}: Score ${cat.score}%`,
                message: template.message,
                type: "seo_task",
                priority: cat.score < 40 ? "high" : "medium",
                category: cat.name,
                action_url: cat.url,
                action_label: userLanguage === 'fr' ? "🚀 Optimiser" : "🚀 Optimize",
                metadata: { score: cat.score, from_audit: true }
              });
            }
          }
        }

        // Check products needing SEO (improved query - check for NULL or empty)
        if (settings?.notify_products !== false) {
          const { data: products } = await supabase
            .from("shopify_products")
            .select("id, title, seo_title, seo_description")
            .eq("seller_id", user.id)
            .or("seo_title.is.null,seo_title.eq.")
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
              metadata: { count: products.length, product_ids: products.slice(0, 10).map(p => p.id) }
            });
          }
        }

        // Check collections needing SEO (improved query)
        if (settings?.notify_collections !== false) {
          const { data: collections } = await supabase
            .from("shopify_collections")
            .select("id, title, seo_title, seo_description")
            .eq("user_id", user.id)
            .or("seo_title.is.null,seo_title.eq.")
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
        // Check images missing ALT (improved query)
        if (settings?.notify_images !== false) {
          const { data: images } = await supabase
            .from("product_images")
            .select("id, product_id")
            .or("alt_text.is.null,alt_text.eq.")
            .limit(50);

          // Filter by user's products
          if (images && images.length > 0) {
            const { data: userProducts } = await supabase
              .from("shopify_products")
              .select("id")
              .eq("seller_id", user.id);
            
            const userProductIds = new Set(userProducts?.map(p => p.id) || []);
            const userImages = images.filter(img => userProductIds.has(img.product_id));

            if (userImages.length > 0) {
              const template = getNotificationTemplate('images', userImages.length, userLanguage);
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
                metadata: { count: userImages.length, image_ids: userImages.slice(0, 10).map(i => i.id) }
              });
            }
          }
        }

        // Check blog articles needing optimization (improved query)
        if (settings?.notify_blog !== false) {
          const { data: articles } = await supabase
            .from("blog_articles")
            .select("id, title, meta_description")
            .eq("user_id", user.id)
            .or("meta_description.is.null,meta_description.eq.")
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
          const optimizedCount = allProducts.filter(p => p.seo_title && p.seo_title.trim() !== '').length;
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

        // Action plan reminders from audit recommendations
        if (latestAudit?.recommendations) {
          const recs = latestAudit.recommendations;
          const highPriorityRec = recs.find((r: any) => r.priority === 'high');
          
          if (highPriorityRec && highPriorityRec.actions?.length > 0) {
            notifications.push({
              user_id: user.id,
              title: userLanguage === 'fr' ? "📋 Plan d'action SEO de la semaine" : "📋 This week's SEO action plan",
              message: userLanguage === 'fr'
                ? `Action prioritaire: ${highPriorityRec.actions[0]}`
                : `Priority action: ${highPriorityRec.actions[0]}`,
              type: "seo_task",
              priority: "high",
              category: "audit",
              action_url: "/seo?tab=audit",
              action_label: userLanguage === 'fr' ? "📊 Voir le plan" : "📊 View plan",
              metadata: { actions: highPriorityRec.actions, from_audit: true }
            });
          }
        }
      }

      // Deduplicate notifications by title
      const uniqueNotifications = notifications.filter((n, index, self) =>
        index === self.findIndex((t) => t.title === n.title)
      );

      // Insert notifications in database
      if (uniqueNotifications.length > 0 && settings?.in_app_enabled) {
        const { error: insertError } = await supabase
          .from("app_notifications")
          .insert(uniqueNotifications);

        if (!insertError) {
          notificationsCreated += uniqueNotifications.length;
          console.log(`✅ Created ${uniqueNotifications.length} notifications for ${user.email}`);
        } else {
          console.error(`❌ Error creating notifications for ${user.email}:`, insertError);
        }
      }

      // Send email digest if enabled (only in afternoon)
      if (timeOfDay === 'afternoon' && uniqueNotifications.length > 0 && settings?.email_enabled && settings?.daily_digest) {
        try {
          const { error: emailError } = await supabase.functions.invoke("send-notification-email", {
            body: {
              to: user.email,
              userName: user.full_name || user.email.split("@")[0],
              notifications: uniqueNotifications.map(n => ({
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
