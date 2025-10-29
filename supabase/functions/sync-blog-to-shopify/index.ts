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

    const { data: store } = await supabase
      .from("shopify_connections")
      .select("*")
      .eq("user_id", article.user_id)
      .eq("is_active", true)
      .single();

    if (!store) {
      return new Response(JSON.stringify({ error: "No Shopify connection found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

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

    const articleData = {
      article: {
        title: article.title,
        body_html: article.content || "",
        author: "Newsai.sale",
        tags: Array.isArray(article.keywords) ? article.keywords.join(", ") : "",
        published: true,
      },
    };

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

    await supabase
      .from("blog_articles")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
        shopify_blog_id: created.article?.id?.toString()
      })
      .eq("id", articleId);

    console.log("✅ Article published successfully");

    return new Response(JSON.stringify({ success: true, shopifyArticleId: created.article?.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("❌ Error:", error);
    
    // Update article status to error
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await supabase
        .from("blog_articles")
        .update({ status: "error" })
        .eq("id", (await req.json()).articleId);
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