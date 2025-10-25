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

    const shopifyUrl = store.store_url.replace(/^https?:\/\//, "");
    const apiBase = `https://${shopifyUrl}/admin/api/2024-01/blogs`;

    const blogsResp = await fetch(`${apiBase}.json`, {
      headers: { "X-Shopify-Access-Token": store.access_token },
    });

    const blogsData = await blogsResp.json();
    const blogId = blogsData.blogs?.[0]?.id;

    if (!blogId) throw new Error("No blog found");

    const articleData = {
      article: {
        title: article.title,
        body_html: article.content || "",
        author: "AI Writer",
        tags: Array.isArray(article.keywords) ? article.keywords.join(", ") : "",
        published: true,
      },
    };

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
      throw new Error(`Shopify error: ${errText}`);
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

    console.log("✅ Article published");

    return new Response(JSON.stringify({ success: true, shopifyArticleId: created.article?.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});