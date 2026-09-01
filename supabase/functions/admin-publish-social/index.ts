import "../_shared/strict-ai-generation.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, imageUrl, indexOnGsc, publishToFacebook, pageIds } = await req.json();

    console.log("📢 Admin publish social:", { 
      contentLength: content?.length, 
      hasImage: !!imageUrl, 
      indexOnGsc, 
      publishToFacebook,
      pageIds 
    });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results = {
      gscIndexed: false,
      facebookPosted: false,
      facebookPostIds: [] as string[],
      errors: [] as string[],
    };

    // 1. Create promotional article record
    const slug = `post-${Date.now()}`;
    const articleUrl = `https://newai.sale/blog/${slug}`;
    
    const { data: article, error: articleError } = await supabase
      .from("promotional_articles")
      .insert({
        title: content.substring(0, 100),
        slug,
        content,
        excerpt: content.substring(0, 200),
        featured_image: imageUrl || null,
        status: "published",
        social_channels: publishToFacebook ? ["facebook"] : [],
        social_status: "draft",
      })
      .select()
      .single();

    if (articleError) {
      console.error("Error creating article:", articleError);
      throw new Error("Erreur création article");
    }

    console.log("✅ Article created:", article.id);

    // 2. Index on Google Search Console
    if (indexOnGsc) {
      try {
        // Request indexing via Google Indexing API
        const googleClientId = Deno.env.get("GOOGLE_CLIENT_ID");
        const googleClientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
        
        if (googleClientId && googleClientSecret) {
          // Get admin's Google tokens
          const { data: gscTokens } = await supabase
            .from("google_tokens")
            .select("*")
            .eq("service", "search_console")
            .limit(1)
            .single();

          if (gscTokens?.access_token) {
            const indexingResponse = await fetch(
              "https://indexing.googleapis.com/v3/urlNotifications:publish",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${gscTokens.access_token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  url: articleUrl,
                  type: "URL_UPDATED",
                }),
              }
            );

            if (indexingResponse.ok) {
              results.gscIndexed = true;
              console.log("✅ GSC indexing requested for:", articleUrl);
              
              // Log indexing request
              await supabase.from("gsc_indexing_requests").insert({
                url: articleUrl,
                status: "pending",
                article_id: article.id,
              });
            } else {
              const errorText = await indexingResponse.text();
              console.error("GSC indexing failed:", errorText);
              results.errors.push(`GSC: ${errorText}`);
            }
          } else {
            console.log("No GSC tokens available, skipping indexing");
            results.errors.push("GSC: Pas de tokens Google disponibles");
          }
        }
      } catch (gscError: any) {
        console.error("GSC indexing error:", gscError);
        results.errors.push(`GSC: ${gscError.message}`);
      }
    }

    // 3. Publish to Facebook pages
    if (publishToFacebook && pageIds && pageIds.length > 0) {
      for (const pageId of pageIds) {
        try {
          // Get page access token
          const { data: pageConnection } = await supabase
            .from("facebook_page_connections")
            .select("page_access_token, page_name")
            .eq("page_id", pageId)
            .single();

          if (!pageConnection?.page_access_token) {
            results.errors.push(`FB: Token manquant pour page ${pageId}`);
            continue;
          }

          // Post to Facebook
          const fbEndpoint = imageUrl
            ? `https://graph.facebook.com/v18.0/${pageId}/photos`
            : `https://graph.facebook.com/v18.0/${pageId}/feed`;

          const fbBody: any = imageUrl
            ? { url: imageUrl, caption: content, access_token: pageConnection.page_access_token }
            : { message: content, access_token: pageConnection.page_access_token };

          const fbResponse = await fetch(fbEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(fbBody),
          });

          const fbData = await fbResponse.json();

          if (fbData.id || fbData.post_id) {
            const postId = fbData.id || fbData.post_id;
            results.facebookPostIds.push(postId);
            results.facebookPosted = true;
            console.log(`✅ Posted to Facebook page ${pageConnection.page_name}:`, postId);
          } else {
            console.error("Facebook post failed:", fbData);
            results.errors.push(`FB ${pageConnection.page_name}: ${fbData.error?.message || "Erreur inconnue"}`);
          }
        } catch (fbError: any) {
          console.error("Facebook posting error:", fbError);
          results.errors.push(`FB: ${fbError.message}`);
        }
      }
    }

    // 4. Update article status
    await supabase
      .from("promotional_articles")
      .update({
        social_status: results.facebookPosted ? "published" : "failed",
        facebook_post_id: results.facebookPostIds[0] || null,
        gsc_indexed: results.gscIndexed,
        social_published_at: results.facebookPosted ? new Date().toISOString() : null,
      })
      .eq("id", article.id);

    console.log("📊 Publish results:", results);

    return new Response(
      JSON.stringify({
        success: true,
        articleId: article.id,
        articleUrl,
        ...results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("❌ Admin publish error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
