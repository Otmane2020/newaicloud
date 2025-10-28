import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("🔍 Importing articles for user:", user.id);

    // Get active Shopify connection
    const { data: store } = await supabase
      .from("shopify_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (!store) {
      return new Response(JSON.stringify({ error: "No active Shopify connection found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const shopifyUrl = store.store_url.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const apiBase = `https://${shopifyUrl}/admin/api/2025-01/blogs`;

    console.log("🔗 Shopify URL:", apiBase);

    // Get blogs
    const blogsResp = await fetch(`${apiBase}.json`, {
      headers: { 
        "X-Shopify-Access-Token": store.access_token,
        "Content-Type": "application/json"
      },
    });

    if (!blogsResp.ok) {
      const errText = await blogsResp.text();
      console.error("❌ Blogs fetch error:", errText);
      throw new Error(`Failed to fetch blogs: ${blogsResp.status} ${errText}`);
    }

    const blogsData = await blogsResp.json();
    const blogId = blogsData.blogs?.[0]?.id;

    if (!blogId) {
      return new Response(JSON.stringify({ 
        success: true, 
        imported: 0, 
        message: "No blogs found in Shopify" 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Get articles from the blog
    const articlesResp = await fetch(`${apiBase}/${blogId}/articles.json`, {
      headers: {
        "X-Shopify-Access-Token": store.access_token,
        "Content-Type": "application/json"
      },
    });

    if (!articlesResp.ok) {
      const errText = await articlesResp.text();
      console.error("❌ Articles fetch error:", errText);
      throw new Error(`Failed to fetch articles: ${articlesResp.status} ${errText}`);
    }

    const articlesData = await articlesResp.json();
    const shopifyArticles = articlesData.articles || [];

    console.log(`📚 Found ${shopifyArticles.length} articles in Shopify`);

    let importedCount = 0;
    let skippedCount = 0;

    for (const article of shopifyArticles) {
      // Check if article already exists
      const { data: existing } = await supabase
        .from("blog_articles")
        .select("id")
        .eq("user_id", user.id)
        .eq("shopify_blog_id", article.id.toString())
        .single();

      if (existing) {
        console.log(`⏭️ Skipping existing article: ${article.title}`);
        skippedCount++;
        continue;
      }

      // Extract keywords from tags
      const keywords = article.tags ? article.tags.split(", ") : [];

      // Import the article
      const { error: insertError } = await supabase
        .from("blog_articles")
        .insert({
          user_id: user.id,
          title: article.title,
          content: article.body_html || "",
          meta_description: article.summary_html || null,
          keywords: keywords.length > 0 ? keywords : null,
          status: article.published_at ? "published" : "draft",
          published_at: article.published_at || null,
          shopify_blog_id: article.id.toString(),
          source: "shopify_import",
        });

      if (insertError) {
        console.error("❌ Error inserting article:", insertError);
        continue;
      }

      importedCount++;
      console.log(`✅ Imported: ${article.title}`);
    }

    console.log(`✅ Import complete: ${importedCount} imported, ${skippedCount} skipped`);

    return new Response(JSON.stringify({ 
      success: true, 
      imported: importedCount,
      skipped: skippedCount,
      total: shopifyArticles.length
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("❌ Error:", error);
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      details: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
