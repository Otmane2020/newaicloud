import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Enhanced analysis functions
const analyzeSeoText = (text: string | null) => {
  if (!text) return { length: 0, hasKeywords: false, optimal: false };

  const length = text.length;
  const words = text.split(/\s+/).length;
  const hasKeywords = words >= 3; // Basic keyword presence check

  return {
    length,
    wordCount: words,
    hasKeywords,
    optimal: length >= 50 && length <= 160 && hasKeywords,
  };
};

const analyzeContentQuality = (content: string | null) => {
  if (!content) return { score: 0, hasStructure: false, wordCount: 0 };

  const wordCount = content.split(/\s+/).length;
  const hasStructure = content.includes("<h") || content.split("\n").length > 3;
  const hasLinks = content.includes("href=");

  let score = 0;
  if (wordCount > 200) score += 40;
  if (wordCount > 500) score += 20;
  if (hasStructure) score += 20;
  if (hasLinks) score += 20;

  return { score: Math.min(score, 100), hasStructure, wordCount, hasLinks };
};

const calculateSeoScore = (items: any[], analysisFn: (item: any) => number) => {
  if (!items?.length) return 0;

  const totalScore = items.reduce((sum, item) => sum + analysisFn(item), 0);
  return Math.round(totalScore / items.length);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Get user from auth header
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[AUDIT] Starting enhanced SEO audit for user:", user.id);

    // Fetch store connection for additional context
    const { data: connection } = await supabaseClient
      .from("shopify_connections")
      .select("store_name, store_url, store_category")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    // Fetch products with enhanced analysis
    const { data: products, error: productsError } = await supabaseClient
      .from("shopify_products")
      .select("id, title, seo_title, seo_description, description, handle, images, vendor, product_type, tags")
      .eq("seller_id", user.id);

    if (productsError) throw productsError;

    // Fetch collections with enhanced analysis
    const { data: collections, error: collectionsError } = await supabaseClient
      .from("shopify_collections")
      .select("id, title, seo_title, seo_description, body_html, handle")
      .eq("user_id", user.id);

    if (collectionsError) throw collectionsError;

    // Fetch blog articles
    const { data: articles, error: articlesError } = await supabaseClient
      .from("blog_articles")
      .select("id, title, meta_description, content, excerpt, seo_title, slug")
      .eq("user_id", user.id);

    if (articlesError) throw articlesError;

    // Fetch pages
    const { data: pages, error: pagesError } = await supabaseClient
      .from("shopify_pages")
      .select("id, title, seo_title, seo_description, body_html, handle")
      .eq("user_id", user.id);

    if (pagesError) throw pagesError;

    // Enhanced analysis functions for each content type
    const analyzeProduct = (product: any) => {
      const titleAnalysis = analyzeSeoText(product.seo_title || product.title);
      const descAnalysis = analyzeSeoText(product.seo_description);
      const contentAnalysis = analyzeContentQuality(product.description);

      let score = 0;
      if (titleAnalysis.optimal) score += 30;
      if (descAnalysis.optimal) score += 30;
      if (contentAnalysis.score > 50) score += 40;

      return {
        score,
        details: {
          title: titleAnalysis,
          description: descAnalysis,
          content: contentAnalysis,
          hasImages: !!product.images && product.images.length > 0,
          hasVendor: !!product.vendor,
          hasProductType: !!product.product_type,
          hasTags: !!product.tags,
        },
      };
    };

    const analyzeCollection = (collection: any) => {
      const titleAnalysis = analyzeSeoText(collection.seo_title || collection.title);
      const descAnalysis = analyzeSeoText(collection.seo_description);
      const contentAnalysis = analyzeContentQuality(collection.body_html);

      let score = 0;
      if (titleAnalysis.optimal) score += 40;
      if (descAnalysis.optimal) score += 40;
      if (contentAnalysis.score > 30) score += 20;

      return { score, details: { title: titleAnalysis, description: descAnalysis, content: contentAnalysis } };
    };

    const analyzeArticle = (article: any) => {
      const titleAnalysis = analyzeSeoText(article.seo_title || article.title);
      const descAnalysis = analyzeSeoText(article.meta_description);
      const contentAnalysis = analyzeContentQuality(article.content);

      let score = 0;
      if (titleAnalysis.optimal) score += 30;
      if (descAnalysis.optimal) score += 30;
      if (contentAnalysis.score > 60) score += 40;

      return { score, details: { title: titleAnalysis, description: descAnalysis, content: contentAnalysis } };
    };

    const analyzePage = (page: any) => {
      const titleAnalysis = analyzeSeoText(page.seo_title || page.title);
      const descAnalysis = analyzeSeoText(page.seo_description);
      const contentAnalysis = analyzeContentQuality(page.body_html);

      let score = 0;
      if (titleAnalysis.optimal) score += 40;
      if (descAnalysis.optimal) score += 40;
      if (contentAnalysis.score > 40) score += 20;

      return { score, details: { title: titleAnalysis, description: descAnalysis, content: contentAnalysis } };
    };

    // Calculate scores with enhanced analysis
    const productAnalyses = products?.map(analyzeProduct) || [];
    const productsScore = calculateSeoScore(products, (p) => {
      const analysis = analyzeProduct(p);
      return analysis.score;
    });

    const collectionsScore = calculateSeoScore(collections, (c) => {
      const analysis = analyzeCollection(c);
      return analysis.score;
    });

    const blogScore = calculateSeoScore(articles, (a) => {
      const analysis = analyzeArticle(a);
      return analysis.score;
    });

    const pagesScore = calculateSeoScore(pages, (p) => {
      const analysis = analyzePage(p);
      return analysis.score;
    });

    // Calculate global score with weights
    const weights = {
      products: 0.4,
      collections: 0.3,
      blog: 0.2,
      pages: 0.1,
    };

    const globalScore = Math.round(
      productsScore * weights.products +
        collectionsScore * weights.collections +
        blogScore * weights.blog +
        pagesScore * weights.pages,
    );

    // Generate detailed recommendations
    const generateRecommendations = () => {
      const recommendations = [];

      // Product recommendations
      const productsWithPoorSeo = productAnalyses.filter((p) => p.score < 60).length;
      if (productsWithPoorSeo > 0) {
        recommendations.push({
          priority: "high",
          category: "products",
          title: `Optimiser ${productsWithPoorSeo} produit(s) manquant(s) le SEO`,
          description: `${productsWithPoorSeo} produits ont un score SEO inférieur à 60%. Améliorez leurs titres et descriptions.`,
          action: "optimize_products",
        });
      }

      // Collection recommendations
      if (collectionsScore < 70) {
        recommendations.push({
          priority: "medium",
          category: "collections",
          title: "Améliorer les collections",
          description: `Vos collections ont un score SEO de ${collectionsScore}%. Optimisez leurs métadonnées.`,
          action: "optimize_collections",
        });
      }

      // Blog recommendations
      if (blogScore < 60 && articles && articles.length > 0) {
        recommendations.push({
          priority: "medium",
          category: "blog",
          title: "Enrichir le contenu blog",
          description: `Vos articles ont un score moyen de ${blogScore}%. Ajoutez plus de contenu et optimisez le SEO.`,
          action: "optimize_blog",
        });
      }

      // Content quality recommendations
      const productsWithImages = products?.filter((p) => p.images && p.images.length > 0).length || 0;
      const imagePercentage = products?.length ? Math.round((productsWithImages / products.length) * 100) : 0;

      if (imagePercentage < 80) {
        recommendations.push({
          priority: "medium",
          category: "media",
          title: "Améliorer les images produits",
          description: `Seulement ${imagePercentage}% de vos produits ont des images. Ajoutez des images de qualité.`,
          action: "add_images",
        });
      }

      return recommendations.sort((a, b) => {
        const priorityOrder: { [key: string]: number } = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
    };

    // Calculate image statistics for use in audit results
    const productsWithImages = products?.filter((p) => p.images && p.images.length > 0).length || 0;
    const imagePercentage = products?.length ? Math.round((productsWithImages / products.length) * 100) : 0;

    // Build enhanced audit results
    const auditResults = {
      summary: {
        storeName: connection?.store_name || "Votre boutique",
        storeUrl: connection?.store_url,
        category: connection?.store_category,
        auditDate: new Date().toISOString(),
        overallScore: globalScore,
        grade:
          globalScore >= 80 ? "Excellent" : globalScore >= 60 ? "Bon" : globalScore >= 40 ? "Moyen" : "À améliorer",
      },
      global: {
        stats: {
          totalAnalyzed:
            (products?.length || 0) + (collections?.length || 0) + (articles?.length || 0) + (pages?.length || 0),
          productsAnalyzed: products?.length || 0,
          collectionsAnalyzed: collections?.length || 0,
          articlesAnalyzed: articles?.length || 0,
          pagesAnalyzed: pages?.length || 0,
        },
        score: globalScore,
        breakdown: {
          products: { score: productsScore, weight: weights.products },
          collections: { score: collectionsScore, weight: weights.collections },
          blog: { score: blogScore, weight: weights.blog },
          pages: { score: pagesScore, weight: weights.pages },
        },
      },
      homepage: {
        globalScore: globalScore,
        scores: [
          {
            label: "Technique",
            score: Math.min(productsScore + 15, 100),
            maxScore: 100,
            status: productsScore >= 70 ? "success" : productsScore >= 50 ? "warning" : "error",
          },
          {
            label: "Contenu",
            score: Math.min(blogScore + 10, 100),
            maxScore: 100,
            status: blogScore >= 70 ? "success" : blogScore >= 50 ? "warning" : "error",
          },
          {
            label: "Structure",
            score: Math.min(collectionsScore + 10, 100),
            maxScore: 100,
            status: collectionsScore >= 70 ? "success" : collectionsScore >= 50 ? "warning" : "error",
          },
        ],
        technical: [
          {
            label: "Produits Optimisés",
            value: `${productAnalyses.filter((p) => p.score >= 60).length}/${products?.length || 0}`,
            status: productsScore >= 70 ? "success" : productsScore >= 50 ? "warning" : "error",
          },
          {
            label: "Collections Optimisées",
            value: `${collections?.filter((c) => analyzeCollection(c).score >= 60).length || 0}/${collections?.length || 0}`,
            status: collectionsScore >= 70 ? "success" : collectionsScore >= 50 ? "warning" : "error",
          },
          {
            label: "Articles Optimisés",
            value: `${articles?.filter((a) => analyzeArticle(a).score >= 60).length || 0}/${articles?.length || 0}`,
            status: blogScore >= 70 ? "success" : blogScore >= 50 ? "warning" : "error",
          },
        ],
        content: [
          {
            label: "Qualité Contenu",
            value: blogScore >= 70 ? "Élevée" : blogScore >= 50 ? "Moyenne" : "Faible",
            status: blogScore >= 70 ? "success" : blogScore >= 50 ? "warning" : "error",
          },
          {
            label: "Structure SEO",
            value: globalScore >= 70 ? "Optimale" : globalScore >= 50 ? "Correcte" : "À revoir",
            status: globalScore >= 70 ? "success" : globalScore >= 50 ? "warning" : "error",
          },
        ],
      },
      products: {
        globalScore: productsScore,
        scores: [
          {
            label: "Structure",
            score: productsScore,
            maxScore: 100,
            status: productsScore >= 70 ? "success" : productsScore >= 50 ? "warning" : "error",
          },
          {
            label: "Contenu",
            score: Math.min(productsScore + 10, 100),
            maxScore: 100,
            status: productsScore >= 70 ? "success" : productsScore >= 50 ? "warning" : "error",
          },
          {
            label: "Images",
            score: Math.min(productsScore + 5, 100),
            maxScore: 100,
            status: productsScore >= 70 ? "success" : productsScore >= 50 ? "warning" : "error",
          },
        ],
        elements: [
          {
            label: "Titres SEO",
            value: `${products?.filter((p) => analyzeSeoText(p.seo_title || p.title).optimal).length || 0}/${products?.length || 0}`,
            status: "info",
          },
          {
            label: "Meta Descriptions",
            value: `${products?.filter((p) => analyzeSeoText(p.seo_description).optimal).length || 0}/${products?.length || 0}`,
            status: "info",
          },
          {
            label: "Images Produits",
            value: `${productsWithImages}/${products?.length || 0}`,
            status: imagePercentage >= 80 ? "success" : imagePercentage >= 60 ? "warning" : "error",
          },
        ],
        details: {
          totalProducts: products?.length || 0,
          optimizedProducts: productAnalyses.filter((p) => p.score >= 60).length,
          needsImprovement: productAnalyses.filter((p) => p.score < 60).length,
        },
      },
      collections: {
        globalScore: collectionsScore,
        scores: [
          {
            label: "Structure",
            score: collectionsScore,
            maxScore: 100,
            status: collectionsScore >= 70 ? "success" : collectionsScore >= 50 ? "warning" : "error",
          },
          {
            label: "Contenu",
            score: Math.min(collectionsScore + 5, 100),
            maxScore: 100,
            status: collectionsScore >= 70 ? "success" : collectionsScore >= 50 ? "warning" : "error",
          },
          {
            label: "Optimisation",
            score: Math.min(collectionsScore + 10, 100),
            maxScore: 100,
            status: collectionsScore >= 70 ? "success" : collectionsScore >= 50 ? "warning" : "error",
          },
        ],
        elements: [
          {
            label: "Titres Optimisés",
            value: `${collections?.filter((c) => analyzeSeoText(c.seo_title || c.title).optimal).length || 0}/${collections?.length || 0}`,
            status: "info",
          },
          {
            label: "Descriptions Optimisées",
            value: `${collections?.filter((c) => analyzeSeoText(c.seo_description).optimal).length || 0}/${collections?.length || 0}`,
            status: "info",
          },
        ],
      },
      blog: {
        globalScore: blogScore,
        scores: [
          {
            label: "Structure",
            score: Math.min(blogScore + 10, 100),
            maxScore: 100,
            status: blogScore >= 70 ? "success" : blogScore >= 50 ? "warning" : "error",
          },
          {
            label: "Contenu",
            score: blogScore,
            maxScore: 100,
            status: blogScore >= 70 ? "success" : blogScore >= 50 ? "warning" : "error",
          },
          {
            label: "Optimisation",
            score: Math.min(blogScore + 5, 100),
            maxScore: 100,
            status: blogScore >= 70 ? "success" : blogScore >= 50 ? "warning" : "error",
          },
        ],
        elements: [
          {
            label: "Articles Optimisés",
            value: `${articles?.filter((a) => analyzeArticle(a).score >= 60).length || 0}/${articles?.length || 0}`,
            status: "info",
          },
          {
            label: "Contenu Structuré",
            value: `${articles?.filter((a) => analyzeContentQuality(a.content).hasStructure).length || 0}/${articles?.length || 0}`,
            status: "info",
          },
        ],
      },
      recommendations: generateRecommendations(),
    };

    // Store audit results in database
    const { error: insertError } = await supabaseClient.from("seo_audit_reports").insert({
      user_id: user.id,
      global_score: globalScore,
      products_score: productsScore,
      collections_score: collectionsScore,
      blog_score: blogScore,
      pages_score: pagesScore,
      homepage_score: globalScore,
      audit_results: auditResults,
      recommendations: auditResults.recommendations,
      store_name: connection?.store_name,
      store_url: connection?.store_url,
    });

    if (insertError) {
      console.error("[AUDIT] Error storing audit:", insertError);
      throw insertError;
    }

    console.log("[AUDIT] Enhanced audit completed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        audit: auditResults,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("[AUDIT] Error:", error);
    return new Response(
      JSON.stringify({
        error: error?.message || "Error generating audit",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
