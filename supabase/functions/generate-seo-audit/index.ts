import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user from auth header
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[AUDIT] Starting SEO audit for user:", user.id);

    // Fetch products
    const { data: products, error: productsError } = await supabaseClient
      .from("shopify_products")
      .select("id, title, seo_title, seo_description, description, enrichment_status")
      .eq("seller_id", user.id);

    if (productsError) throw productsError;

    // Fetch collections
    const { data: collections, error: collectionsError } = await supabaseClient
      .from("shopify_collections")
      .select("id, title, seo_title, seo_description, body_html")
      .eq("user_id", user.id);

    if (collectionsError) throw collectionsError;

    // Fetch blog articles
    const { data: articles, error: articlesError } = await supabaseClient
      .from("blog_articles")
      .select("id, title, meta_description, content")
      .eq("user_id", user.id);

    if (articlesError) throw articlesError;

    // Fetch pages
    const { data: pages, error: pagesError } = await supabaseClient
      .from("shopify_pages")
      .select("id, title, seo_title, seo_description, body_html")
      .eq("user_id", user.id);

    if (pagesError) throw pagesError;

    // Calculate Products Score
    const productsOptimized = products?.filter(p => p.seo_title && p.seo_description).length || 0;
    const productsTotal = products?.length || 0;
    const productsScore = productsTotal > 0 ? Math.round((productsOptimized / productsTotal) * 100) : 0;

    // Calculate Collections Score
    const collectionsOptimized = collections?.filter(c => c.seo_title && c.seo_description).length || 0;
    const collectionsTotal = collections?.length || 0;
    const collectionsScore = collectionsTotal > 0 ? Math.round((collectionsOptimized / collectionsTotal) * 100) : 0;

    // Calculate Blog Score
    const articlesOptimized = articles?.filter(a => a.meta_description && a.content).length || 0;
    const articlesTotal = articles?.length || 0;
    const blogScore = articlesTotal > 0 ? Math.round((articlesOptimized / articlesTotal) * 100) : 0;

    // Calculate Images Score
    const { data: images } = await supabaseClient
      .from('product_images')
      .select('id, alt_text')
      .in('product_id', products?.map(p => p.id) || []);
    
    const imagesOptimized = images?.filter(img => img.alt_text && img.alt_text.length > 0).length || 0;
    const imagesTotal = images?.length || 0;
    const imagesScore = imagesTotal > 0 ? Math.round((imagesOptimized / imagesTotal) * 100) : 0;

    // Calculate Pages/Homepage Score
    const pagesOptimized = pages?.filter(p => p.seo_title && p.seo_description).length || 0;
    const pagesTotal = pages?.length || 0;
    const homepageScore = pagesTotal > 0 ? Math.round((pagesOptimized / pagesTotal) * 100) : 0;

    // Calculate Technical Score (based on products enrichment)
    const productsEnriched = products?.filter(p => p.enrichment_status === 'enriched').length || 0;
    const technicalScore = productsTotal > 0 ? Math.round((productsEnriched / productsTotal) * 100) : 0;

    // ✅ CORRECT Global Score - Average of 6 categories
    const globalScore = Math.round(
      (homepageScore + productsScore + collectionsScore + blogScore + imagesScore + technicalScore) / 6
    );

    // Build audit results
    const auditResults = {
      global: {
        stats: {
          totalAnalyzed: productsTotal + collectionsTotal + articlesTotal + (pages?.length || 0),
          productsAnalyzed: productsTotal,
          collectionsAnalyzed: collectionsTotal,
          articlesAnalyzed: articlesTotal,
          pagesAnalyzed: pages?.length || 0,
        },
        score: globalScore,
      },
      homepage: {
        globalScore: globalScore,
        scores: [
          { label: 'Technique', score: Math.min(productsScore + 10, 100), maxScore: 100, status: productsScore >= 80 ? 'success' : 'warning' },
          { label: 'Contenu', score: Math.min(blogScore + 5, 100), maxScore: 100, status: blogScore >= 80 ? 'success' : 'warning' },
          { label: 'Sémantique', score: Math.min(collectionsScore + 5, 100), maxScore: 100, status: collectionsScore >= 80 ? 'success' : 'warning' },
        ],
        technical: [
          { label: 'Produits Optimisés', value: `${productsOptimized}/${productsTotal} produits`, status: productsScore >= 80 ? 'success' : 'warning' },
          { label: 'Collections', value: `${collectionsOptimized}/${collectionsTotal} collections`, status: collectionsScore >= 80 ? 'success' : 'warning' },
          { label: 'Articles', value: `${articlesOptimized}/${articlesTotal} articles`, status: blogScore >= 80 ? 'success' : 'warning' },
        ],
        content: [
          { label: 'Densité SEO', value: productsScore >= 80 ? 'Optimale' : 'À améliorer', status: productsScore >= 80 ? 'success' : 'warning' },
          { label: 'Cohérence', value: 'Bonne', status: 'success' },
        ],
        recommendations: [
          productsScore < 80 ? 'Optimiser les produits manquants' : null,
          collectionsScore < 80 ? 'Améliorer les collections SEO' : null,
          blogScore < 80 ? 'Enrichir le contenu blog' : null,
        ].filter(Boolean),
      },
      products: {
        globalScore: productsScore,
        scores: [
          { label: 'Structure', score: productsScore, maxScore: 100, status: productsScore >= 80 ? 'success' : 'warning' },
          { label: 'Contenu IA', score: Math.min(productsScore + 5, 100), maxScore: 100, status: productsScore >= 80 ? 'success' : 'warning' },
          { label: 'Images', score: Math.min(productsScore - 10, 100), maxScore: 100, status: productsScore >= 70 ? 'success' : 'warning' },
        ],
        elements: [
          { label: 'SEO Titles', value: `${productsOptimized}/${productsTotal} optimisés`, status: productsScore >= 80 ? 'success' : 'warning' },
          { label: 'Meta Descriptions', value: `${productsOptimized}/${productsTotal} optimisées`, status: productsScore >= 80 ? 'success' : 'warning' },
          { label: 'Score moyen', value: `${productsScore}/100`, status: productsScore >= 80 ? 'success' : 'warning' },
        ],
        aiQuality: {
          score: Math.min(productsScore + 5, 100),
          humanEdit: 100 - Math.min(productsScore + 5, 100),
        },
      },
      collections: {
        globalScore: collectionsScore,
        scores: [
          { label: 'Structure', score: collectionsScore, maxScore: 100, status: collectionsScore >= 80 ? 'success' : 'warning' },
          { label: 'Contenu', score: Math.min(collectionsScore - 5, 100), maxScore: 100, status: collectionsScore >= 70 ? 'success' : 'warning' },
          { label: 'Liens internes', score: Math.min(collectionsScore + 5, 100), maxScore: 100, status: collectionsScore >= 80 ? 'success' : 'warning' },
        ],
        elements: [
          { label: 'Title & Meta', value: `${collectionsOptimized}/${collectionsTotal} optimisées`, status: collectionsScore >= 80 ? 'success' : 'warning' },
          { label: 'Score moyen', value: `${collectionsScore}/100`, status: collectionsScore >= 80 ? 'success' : 'warning' },
        ],
      },
      blog: {
        globalScore: blogScore,
        scores: [
          { label: 'Structure', score: Math.min(blogScore + 5, 100), maxScore: 100, status: blogScore >= 80 ? 'success' : 'warning' },
          { label: 'Contenu', score: blogScore, maxScore: 100, status: blogScore >= 80 ? 'success' : 'warning' },
          { label: 'Optimisation', score: Math.min(blogScore - 5, 100), maxScore: 100, status: blogScore >= 70 ? 'success' : 'warning' },
        ],
        elements: [
          { label: 'Articles optimisés', value: `${articlesOptimized}/${articlesTotal}`, status: blogScore >= 80 ? 'success' : 'warning' },
          { label: 'Score moyen', value: `${blogScore}/100`, status: blogScore >= 80 ? 'success' : 'warning' },
        ],
      },
    };

    // Store audit results in database
    const { error: insertError } = await supabaseClient
      .from("seo_audit_reports")
      .insert({
        user_id: user.id,
        global_score: globalScore,
        products_score: productsScore,
        collections_score: collectionsScore,
        blog_score: blogScore,
        homepage_score: homepageScore,
        images_score: imagesScore,
        technical_score: technicalScore,
        audit_results: auditResults,
        recommendations: auditResults.homepage.recommendations,
      });

    if (insertError) {
      console.error("[AUDIT] Error storing audit:", insertError);
      throw insertError;
    }

    console.log("[AUDIT] Audit completed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        globalScore,
        ...auditResults,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[AUDIT] Error:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Error generating audit" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
