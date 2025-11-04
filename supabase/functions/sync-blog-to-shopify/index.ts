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

    const { articleId } = await req.json();
    if (!articleId) {
      return new Response(JSON.stringify({ error: "Missing articleId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { data: article } = await supabase
      .from("blog_articles")
      .select("*")
      .eq("id", articleId)
      .single();

    if (!article) {
      return new Response(JSON.stringify({ error: "Article not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("📝 Syncing article:", article.title);
    console.log("👤 Article user_id:", article.user_id);

    const { data: store, error: storeError } = await supabase
      .from("shopify_connections")
      .select("*")
      .eq("user_id", article.user_id)
      .eq("is_active", true)
      .maybeSingle();

    if (storeError) {
      console.error("❌ Error fetching Shopify connection:", storeError);
      return new Response(JSON.stringify({ 
        error: "Error fetching Shopify connection",
        details: storeError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!store) {
      console.error("❌ No active Shopify connection found for user:", article.user_id);
      return new Response(JSON.stringify({ error: "No Shopify connection found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("✅ Shopify connection found:", store.store_url);

    await supabase
      .from("blog_articles")
      .update({ status: "syncing" })
      .eq("id", articleId);

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
    console.log("📚 Blogs found:", blogsData.blogs?.length || 0);

    let blogId = blogsData.blogs?.[0]?.id;

    // Create a blog if none exists
    if (!blogId) {
      console.log("📝 Creating new blog...");
      const createBlogResp = await fetch(`${apiBase}.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": store.access_token,
        },
        body: JSON.stringify({
          blog: {
            title: "Blog SEO"
          }
        })
      });

      if (!createBlogResp.ok) {
        const errText = await createBlogResp.text();
        console.error("❌ Blog creation error:", errText);
        throw new Error(`Failed to create blog: ${errText}`);
      }

      const createdBlog = await createBlogResp.json();
      blogId = createdBlog.blog?.id;
      console.log("✅ Blog created:", blogId);
    }

    if (!blogId) throw new Error("No blog ID available");

    // Get featured image if exists
    const { data: featuredImage } = await supabase
      .from("content_images")
      .select("src, alt_text")
      .eq("content_type", "article")
      .eq("content_id", articleId)
      .eq("position", 0)
      .maybeSingle();

    const articleData: any = {
      article: {
        title: article.seo_title || article.title,
        body_html: article.content || "",
        author: "Newsai.sale",
        tags: Array.isArray(article.keywords) ? article.keywords.join(", ") : "",
        published: true,
        metafields: [
          {
            namespace: "global",
            key: "title_tag",
            value: article.seo_title || article.title,
            type: "single_line_text_field"
          },
          {
            namespace: "global",
            key: "description_tag",
            value: article.seo_description || "",
            type: "single_line_text_field"
          }
        ]
      },
    };

    // Add featured image if exists
    if (featuredImage?.src) {
      articleData.article.image = {
        src: featuredImage.src,
        alt: featuredImage.alt_text || article.title
      };
    }

    console.log("📤 Publishing article to blog:", blogId);

    const createRes = await fetch(`${apiBase}/${blogId}/articles.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": store.access_token,
      },
      body: JSON.stringify(articleData),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error("❌ Article creation error:", errText);
      throw new Error(`Shopify error: ${createRes.status} - ${errText}`);
    }

    const created = await createRes.json();

    const syncTimestamp = new Date().toISOString();

    await supabase
      .from("blog_articles")
      .update({
        status: "published",
        published_at: syncTimestamp,
        shopify_article_id: created.article?.id?.toString(),
        last_synced_at: syncTimestamp
      })
      .eq("id", articleId);

    // Update last_synced_at for the featured image if it exists
    if (featuredImage?.src) {
      await supabase
        .from("content_images")
        .update({ last_synced_at: syncTimestamp })
        .eq("content_type", "article")
        .eq("content_id", articleId)
        .eq("position", 0);
      
      console.log("✅ Featured image sync timestamp updated");
    }

    console.log("✅ Article published successfully");

    return new Response(JSON.stringify({ success: true, shopifyArticleId: created.article?.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("❌ Error:", error);
    
    // Update article status to error with timestamp
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      
      const { articleId } = await req.json();
      
      await supabase
        .from("blog_articles")
        .update({ 
          status: "draft",
          last_synced_at: new Date().toISOString() // Track failed sync attempt
        })
        .eq("id", articleId);
    } catch (e) {
      console.error("Failed to update article status:", e);
    }

    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      details: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});