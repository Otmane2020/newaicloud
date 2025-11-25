import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const body = await req.json().catch(() => ({}));
  if (body?.healthCheck === true) {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
  }

  try {
    console.log('[AUDIT] Starting comprehensive SEO audit with 7 categories');
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Unauthorized');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    console.log(`[AUDIT] User authenticated: ${user.id}`);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // First, get the store to use it for filtering (same as Dashboard)
    const { data: store } = await supabaseAdmin
      .from('shopify_connections')
      .select('*')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    console.log(`[AUDIT] Store filter: ${store?.id || 'none'}`);

    // Fetch all data needed for audit with store_id filter (same as Dashboard)
    const [productsResult, collectionsResult, articlesResult, pagesResult, homepageSeoResult] = await Promise.all([
      // Products filtered by store_id (same as Dashboard line 180)
      store?.id 
        ? supabaseAdmin.from('shopify_products').select('id, seo_title, title, seo_description, vendor, image_url, tags, optimization_count, enrichment_status').eq('seller_id', user.id).eq('store_id', store.id)
        : supabaseAdmin.from('shopify_products').select('id, seo_title, title, seo_description, vendor, image_url, tags, optimization_count, enrichment_status').eq('seller_id', user.id),
      // Collections filtered by store_id (same as Dashboard line 229)
      store?.id
        ? supabaseAdmin.from('shopify_collections').select('id, seo_title, title, seo_description, body_html, image_url, image_alt, optimization_count').eq('user_id', user.id).eq('store_id', store.id)
        : supabaseAdmin.from('shopify_collections').select('id, seo_title, title, seo_description, body_html, image_url, image_alt, optimization_count').eq('user_id', user.id),
      // Articles filtered by store_id (strict filter to avoid counting null store_id articles for all stores)
      store?.id
        ? supabaseAdmin.from('blog_articles').select('title, meta_description, keywords, featured_image, status, optimization_count').eq('user_id', user.id).eq('store_id', store.id)
        : supabaseAdmin.from('blog_articles').select('title, meta_description, keywords, featured_image, status, optimization_count').eq('user_id', user.id),
      // Pages filtered by store_id (same as Dashboard line 253)
      store?.id
        ? supabaseAdmin.from('shopify_pages').select('seo_title, title, seo_description, body_html, handle, optimization_count').eq('user_id', user.id).eq('store_id', store.id)
        : supabaseAdmin.from('shopify_pages').select('seo_title, title, seo_description, body_html, handle, optimization_count').eq('user_id', user.id),
      supabaseAdmin.from('homepage_seo').select('last_audit').eq('user_id', user.id).maybeSingle()
    ]);

    const products = productsResult.data || [];
    const collections = collectionsResult.data || [];
    const articles = articlesResult.data || [];
    const pages = pagesResult.data || [];
    const homepageSeo = homepageSeoResult.data;

    // Fetch product images for user's products with store filter (same as Dashboard line 307-311)
    let productImages: any[] = [];
    
    if (store?.id && products.length > 0) {
      const { data: imgData } = await supabaseAdmin
        .from('product_images')
        .select('id, alt_text, optimization_count, shopify_products!inner(seller_id, store_id)')
        .eq('shopify_products.seller_id', user.id)
        .eq('shopify_products.store_id', store.id);
      productImages = imgData || [];
    } else if (products.length > 0) {
      // Fallback if no store (but shouldn't happen)
      const productIds = products.map(p => p.id);
      const { data: imgData } = await supabaseAdmin
        .from('product_images')
        .select('id, alt_text, optimization_count')
        .in('product_id', productIds);
      productImages = imgData || [];
    }

    console.log(`[AUDIT] Data fetched with store filter (${store?.id || 'none'}) - Products: ${products.length}, Collections: ${collections.length}, Articles: ${articles.length}, Pages: ${pages.length}, Images: ${productImages.length}`);

    // Initialize audit results with 7 categories
    const auditResults = {
      global_score: 0,
      homepage_score: 0,
      products_score: 0,
      collections_score: 0,
      pages_score: 0,
      articles_score: 0,
      images_score: 0,
      tags_score: 0,
      issues: [] as any[],
      quick_wins: [] as any[],
      recommendations: [] as any[],
      action_plan: [] as any[]
    };

    // Run audits for all 7 categories
    console.log('[AUDIT] Running audits for 7 categories: homepage, products, collections, pages, articles, images, tags');
    
    const homepageAudit = auditHomepage(store, homepageSeo);
    const productsAudit = auditProducts(products);
    const collectionsAudit = auditCollections(collections);
    const pagesAudit = auditPages(pages);
    const articlesAudit = auditArticles(articles);
    const imagesAudit = auditImages(productImages);
    const tagsAudit = auditTags(products);

    // Aggregate results
    auditResults.homepage_score = homepageAudit.score;
    auditResults.products_score = productsAudit.score;
    auditResults.collections_score = collectionsAudit.score;
    auditResults.pages_score = pagesAudit.score;
    auditResults.articles_score = articlesAudit.score;
    auditResults.images_score = imagesAudit.score;
    auditResults.tags_score = tagsAudit.score;

    console.log(`[AUDIT] Category scores - Homepage: ${homepageAudit.score}, Products: ${productsAudit.score}, Collections: ${collectionsAudit.score}, Pages: ${pagesAudit.score}, Articles: ${articlesAudit.score}, Images: ${imagesAudit.score}, Tags: ${tagsAudit.score}`);

    auditResults.issues = [
      ...homepageAudit.issues,
      ...productsAudit.issues,
      ...collectionsAudit.issues,
      ...pagesAudit.issues,
      ...articlesAudit.issues,
      ...imagesAudit.issues,
      ...tagsAudit.issues
    ];

    // Calculate global score (average of all 7 categories)
    const scores = [
      auditResults.homepage_score,
      auditResults.products_score,
      auditResults.collections_score,
      auditResults.pages_score,
      auditResults.articles_score,
      auditResults.images_score,
      auditResults.tags_score
    ];
    auditResults.global_score = Math.round(scores.reduce((a, b) => a + b, 0) / 7);

    console.log(`[AUDIT] Global score calculated: ${auditResults.global_score}/100 (average of 7 categories)`);

    // Identify Quick Wins (high impact, low effort improvements)
    const quickWins = identifyQuickWins(products, collections, pages, articles, productImages, homepageSeo);
    auditResults.quick_wins = quickWins;
    console.log(`[AUDIT] Identified ${quickWins.length} quick wins`);

    // Generate recommendations based on issues and data
    auditResults.recommendations = generateRecommendations(auditResults, products, collections, pages, articles, productImages);


    // Generate action plan
    auditResults.action_plan = auditResults.issues
      .sort((a, b) => {
        const severityOrder = { high: 0, medium: 1, low: 2 };
        return severityOrder[a.severity as keyof typeof severityOrder] - severityOrder[b.severity as keyof typeof severityOrder];
      })
      .slice(0, 10)
      .map((issue, idx) => ({
        priority: idx + 1,
        category: issue.category,
        action: issue.action,
        impact: issue.impact,
        effort: issue.severity === 'high' ? 'high' : issue.severity === 'medium' ? 'medium' : 'low'
      }));

    console.log(`[AUDIT] Audit complete - Global score: ${auditResults.global_score}/100`);

    // Save audit to database (upsert to update existing or create new)
    const { data: savedAudit, error: saveError } = await supabaseAdmin
      .from('seo_audit_reports')
      .upsert({
        user_id: user.id,
        store_id: store?.id,
        global_score: auditResults.global_score,
        homepage_score: auditResults.homepage_score,
        products_score: auditResults.products_score,
        collections_score: auditResults.collections_score,
        pages_score: auditResults.pages_score,
        articles_score: auditResults.articles_score,
        images_score: auditResults.images_score,
        tags_score: auditResults.tags_score,
        audit_results: auditResults,
        recommendations: auditResults.recommendations
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (saveError) {
      console.error('[AUDIT] Error saving audit:', saveError);
      throw saveError;
    }

    console.log('[AUDIT] Audit saved successfully with 7 categories');

    return new Response(
      JSON.stringify({ success: true, audit: savedAudit }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('[AUDIT] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

// SEO Score Calculation Functions (from src/lib/seoQuality.ts)

interface SeoScoreDetails {
  score: number;
  breakdown: {
    presence: number;
    length: number;
    keywords: number;
    readability: number;
  };
  maxScore: number;
}

function calculateTitleScore(title: string | null, productType?: string): SeoScoreDetails {
  const breakdown = { presence: 0, length: 0, keywords: 0, readability: 0 };
  const weights = { presence: 30, length: 25, keywords: 25, readability: 20 };
  
  if (!title) {
    return { score: 0, breakdown, maxScore: 100 };
  }
  
  breakdown.presence = weights.presence;
  
  const length = title.length;
  if (length >= 40 && length <= 75) {
    breakdown.length = weights.length;
  } else if (length >= 30 && length < 40) {
    breakdown.length = weights.length * 0.7;
  } else if (length > 75 && length <= 90) {
    breakdown.length = weights.length * 0.6;
  }
  
  const titleLower = title.toLowerCase();
  const hasCategory = productType ? titleLower.includes(productType.toLowerCase()) : false;
  const hasStyle = /\b(moderne|classique|élégant|vintage|contemporain|design)\b/i.test(title);
  const hasColor = /\b(noir|blanc|rouge|bleu|vert|jaune|rose|gris)\b/i.test(title);
  
  const keywordScore = [hasCategory, hasStyle, hasColor].filter(Boolean).length;
  breakdown.keywords = (keywordScore / 3) * weights.keywords;
  
  const capsCount = (title.match(/[A-Z]/g) || []).length;
  const capsRatio = capsCount / title.length;
  const words = title.split(/\s+/);
  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  const repetitionRatio = uniqueWords.size / words.length;
  
  let readabilityScore = 1;
  if (capsRatio > 0.3) readabilityScore *= 0.7;
  if (repetitionRatio < 0.8) readabilityScore *= 0.8;
  breakdown.readability = readabilityScore * weights.readability;
  
  const totalScore = Object.values(breakdown).reduce((a, b) => a + b, 0);
  return { score: Math.round(totalScore), breakdown, maxScore: 100 };
}

function calculateDescriptionScore(description: string | null, productTitle?: string): SeoScoreDetails {
  const breakdown = { presence: 0, length: 0, keywords: 0, readability: 0 };
  const weights = { presence: 30, length: 25, keywords: 25, readability: 20 };
  
  if (!description) {
    return { score: 0, breakdown, maxScore: 100 };
  }
  
  breakdown.presence = weights.presence;
  
  const length = description.length;
  if (length >= 90 && length <= 200) {
    breakdown.length = weights.length;
  } else if (length >= 70 && length < 90) {
    breakdown.length = weights.length * 0.8;
  } else if (length > 200 && length <= 250) {
    breakdown.length = weights.length * 0.7;
  }
  
  const descLower = description.toLowerCase();
  const titleWords = productTitle ? productTitle.toLowerCase().split(/\s+/).filter(w => w.length > 3) : [];
  const hasProductKeywords = titleWords.some(word => descLower.includes(word));
  const hasCategory = /\b(produit|article|accessoire|vêtement|décoration)\b/i.test(description);
  const hasStyle = /\b(moderne|classique|élégant|vintage|contemporain|design|unique)\b/i.test(description);
  
  const keywordScore = [hasProductKeywords, hasCategory, hasStyle].filter(Boolean).length;
  breakdown.keywords = (keywordScore / 3) * weights.keywords;
  
  const hasPunctuation = /[.,!?;:]/.test(description);
  const sentences = description.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const hasMultipleSentences = sentences.length > 1;
  const words = description.split(/\s+/);
  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  const repetitionRatio = uniqueWords.size / words.length;
  
  let readabilityScore = 0;
  if (hasPunctuation) readabilityScore += 0.3;
  if (hasMultipleSentences) readabilityScore += 0.4;
  if (repetitionRatio > 0.7) readabilityScore += 0.3;
  breakdown.readability = readabilityScore * weights.readability;
  
  const totalScore = Object.values(breakdown).reduce((a, b) => a + b, 0);
  return { score: Math.round(totalScore), breakdown, maxScore: 100 };
}

function calculateTagsScore(tags: string | null): number {
  if (!tags) return 0;
  
  const tagArray = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
  const tagCount = tagArray.length;
  const qualityTags = tagArray.filter(t => t.length > 3).length;
  
  let score = 0;
  if (tagCount > 0) score += 5;
  if (tagCount >= 3 && tagCount <= 10) score += 10;
  if (qualityTags >= 3) score += 5;
  
  return score;
}

function calculateDetailedSeoScore(
  title: string | null,
  description: string | null,
  hasImage: boolean,
  hasUrl: boolean,
  tags?: string | null,
  optimizationCount?: number,
  itemId?: string  // NEW: Unique ID for deterministic variation
): SeoScoreDetails {
  const titleResult = calculateTitleScore(title);
  const descResult = calculateDescriptionScore(description);
  const tagsScore = calculateTagsScore(tags || null);
  
  const imageScore = hasImage ? 10 : 0;
  const urlScore = hasUrl ? 5 : 0;
  const optimizationBonus = (optimizationCount && optimizationCount > 0) ? 5 : 0;
  
  let totalScore = Math.min(100, 
    (titleResult.score * 0.35) + 
    (descResult.score * 0.35) + 
    (tagsScore) + 
    imageScore + 
    urlScore + 
    optimizationBonus
  );
  
  // NEW: Add deterministic variation for optimized items to avoid identical scores (80-95%)
  const isOptimized = optimizationCount && optimizationCount > 0;
  if (isOptimized && itemId) {
    // Generate deterministic hash from itemId
    const hash = itemId.split('').reduce((acc, char) => 
      char.charCodeAt(0) + ((acc << 5) - acc), 0);
    // Variation between -10 and +5 for range 80-95
    const variation = (Math.abs(hash) % 16) - 10;
    totalScore = Math.max(80, Math.min(95, totalScore + variation));
  }
  
  return {
    score: Math.round(totalScore),
    breakdown: {
      presence: titleResult.breakdown.presence + descResult.breakdown.presence,
      length: titleResult.breakdown.length + descResult.breakdown.length,
      keywords: titleResult.breakdown.keywords + descResult.breakdown.keywords,
      readability: titleResult.breakdown.readability + descResult.breakdown.readability
    },
    maxScore: 100
  };
}

function calculateArticleSeoScore(
  title: string | null,
  seoTitle: string | null,
  seoDescription: string | null,
  keywords: string[] | null,
  hasFeaturedImage: boolean,
  isPublished: boolean,
  optimizationCount: number
): { score: number; breakdown: string[] } {
  let score = 0;
  const breakdown: string[] = [];
  
  if (seoTitle && seoTitle.length >= 40 && seoTitle.length <= 70) {
    score += 20;
    breakdown.push('Titre SEO optimisé');
  }
  
  if (seoDescription && seoDescription.length >= 120 && seoDescription.length <= 160) {
    score += 20;
    breakdown.push('Meta description optimisée');
  }
  
  if (keywords && keywords.length >= 3 && keywords.length <= 8) {
    score += 15;
    breakdown.push('Mots-clés bien définis');
  }
  
  if (hasFeaturedImage) {
    score += 15;
    breakdown.push('Image mise en avant présente');
  }
  
  if (isPublished) {
    score += 10;
    breakdown.push('Article publié');
  }
  
  if (optimizationCount === 0) {
    score = Math.max(0, score - 20);
    breakdown.push('⚠️ Article non optimisé');
  } else {
    score += 10;
    breakdown.push('Article optimisé');
  }
  
  return { score: Math.min(100, score), breakdown };
}

function calculateAltTextScore(altText: string | null, isAiGenerated: boolean): { score: number; weight: number; isAI: boolean } {
  if (!altText) return { score: 0, weight: 0, isAI: false };
  
  const length = altText.length;
  let score = 0;
  
  if (length >= 15 && length <= 90) {
    score = 100;
  } else if (length >= 10 && length < 15) {
    score = 70;
  } else if (length > 90 && length <= 125) {
    score = 80;
  } else if (length > 0) {
    score = 50;
  }
  
  const weight = isAiGenerated ? 1.0 : 0.3;
  return { score: Math.round(score * weight), weight, isAI: isAiGenerated };
}

// Audit functions for each category
function auditHomepage(store: any, homepageSeo: any): { score: number; issues: any[] } {
  const issues: any[] = [];
  
  // Calculate homepage score using the same method as Dashboard
  let score = 0;
  
  if (homepageSeo) {
    const titleScore = calculateTitleScore(homepageSeo.seo_title || null);
    const descScore = calculateDescriptionScore(homepageSeo.seo_description || null);
    score = Math.round((titleScore.score + descScore.score) / 2);
  }

  if (!store) {
    issues.push({
      category: 'homepage',
      severity: 'high',
      title: 'Boutique non connectée',
      description: 'Aucune boutique Shopify n\'est connectée.',
      impact: 'Impossible d\'optimiser le SEO de la page d\'accueil.',
      action: 'Connectez votre boutique Shopify dans les paramètres.'
    });
    return { score: 0, issues };
  }

  if (!homepageSeo?.seo_title || homepageSeo.seo_title.length < 40) {
    issues.push({
      category: 'homepage',
      severity: 'high',
      title: 'Titre SEO manquant ou trop court',
      description: 'Le titre de votre page d\'accueil n\'est pas optimisé.',
      impact: 'Visibilité réduite dans les moteurs de recherche.',
      action: 'Ajoutez un titre SEO entre 40 et 70 caractères.',
      count: 1
    });
  }

  if (!homepageSeo?.seo_description || homepageSeo.seo_description.length < 90) {
    issues.push({
      category: 'homepage',
      severity: 'medium',
      title: 'Meta description manquante',
      description: 'La meta description de votre homepage est absente ou trop courte.',
      impact: 'CTR réduit dans les résultats de recherche.',
      action: 'Ajoutez une description engageante de 120-160 caractères.',
      count: 1
    });
  }

  return { score: Math.max(0, score), issues };
}

function auditProducts(products: any[]): { score: number; issues: any[] } {
  const issues: any[] = [];
  let totalScore = 0;
  
  if (products.length === 0) {
    issues.push({
      category: 'products',
      severity: 'high',
      title: 'Aucun produit',
      description: 'Votre boutique ne contient aucun produit.',
      impact: 'Impossible de générer du trafic sans contenu.',
      action: 'Ajoutez des produits à votre catalogue.'
    });
    return { score: 0, issues };
  }
  
  products.forEach(product => {
    const scoreRaw = calculateDetailedSeoScore(
      product.seo_title || product.title,
      product.seo_description || product.vendor,
      !!product.image_url,
      true,
      product.tags,
      product.optimization_count || 0,
      product.id  // NEW: Pass ID for variation
    );
    // Apply penalty for pending or not optimized products (same as Dashboard)
    const score = (product.enrichment_status === 'pending' || product.enrichment_status === 'not_optimised') 
      ? scoreRaw.score * 0.5 
      : scoreRaw.score;
    totalScore += score;
  });
  
  const avgScore = Math.round(totalScore / products.length);
  
  const duplicateTitles = products.filter((p, i, arr) => 
    arr.findIndex(p2 => p2.seo_title === p.seo_title) !== i
  );
  
  if (duplicateTitles.length > 0) {
    issues.push({
      category: 'products',
      severity: 'high',
      title: 'Titres dupliqués',
      description: `${duplicateTitles.length} produits ont des titres identiques.`,
      impact: 'Cannibalisation SEO et confusion pour les moteurs de recherche.',
      action: 'Rendez chaque titre unique et descriptif.',
      count: duplicateTitles.length
    });
  }
  
  const missingDescriptions = products.filter(p => !p.seo_description || p.seo_description.length < 50);
  if (missingDescriptions.length > 0) {
    issues.push({
      category: 'products',
      severity: 'medium',
      title: 'Descriptions manquantes',
      description: `${missingDescriptions.length} produits n'ont pas de description SEO.`,
      impact: 'Perte d\'opportunités de ranking sur des mots-clés longue traîne.',
      action: 'Ajoutez des descriptions détaillées (120-160 caractères).',
      count: missingDescriptions.length
    });
  }
  
  const unoptimizedTitles = products.filter(p => {
    const len = p.seo_title?.length || 0;
    return len < 40 || len > 75;
  });
  
  if (unoptimizedTitles.length > 0) {
    issues.push({
      category: 'products',
      severity: 'medium',
      title: 'Titres non optimisés',
      description: `${unoptimizedTitles.length} produits ont des titres trop courts ou trop longs.`,
      impact: 'Réduction du CTR et de la visibilité dans les SERP.',
      action: 'Optimisez les titres entre 40 et 75 caractères.',
      count: unoptimizedTitles.length
    });
  }
  
  return { score: avgScore, issues };
}

function auditCollections(collections: any[]): { score: number; issues: any[] } {
  const issues: any[] = [];
  let totalScore = 0;
  
  if (collections.length === 0) {
    return { score: 100, issues };
  }
  
  collections.forEach(collection => {
    const scoreResult = calculateDetailedSeoScore(
      collection.seo_title || collection.title,
      collection.seo_description || collection.body_html?.substring(0, 160) || '',
      !!collection.image_url,
      true,
      undefined,
      collection.optimization_count || 0,
      collection.id  // NEW: Pass ID for variation
    );
    totalScore += scoreResult.score;
  });
  
  const avgScore = Math.round(totalScore / collections.length);
  
  const missingDescriptions = collections.filter(c => !c.seo_description);
  if (missingDescriptions.length > 0) {
    issues.push({
      category: 'collections',
      severity: 'medium',
      title: 'Descriptions manquantes',
      description: `${missingDescriptions.length} collections sans description.`,
      impact: 'Opportunités SEO manquées pour les pages catégories.',
      action: 'Ajoutez des descriptions riches en mots-clés.',
      count: missingDescriptions.length
    });
  }
  
  const missingImageAlt = collections.filter(c => c.image_url && !c.image_alt);
  if (missingImageAlt.length > 0) {
    issues.push({
      category: 'collections',
      severity: 'low',
      title: 'Textes alternatifs manquants',
      description: `${missingImageAlt.length} images de collections sans alt text.`,
      impact: 'Accessibilité réduite et perte d\'opportunités en recherche d\'images.',
      action: 'Ajoutez des descriptions alt pour toutes les images.',
      count: missingImageAlt.length
    });
  }
  
  return { score: avgScore, issues };
}

function auditPages(pages: any[]): { score: number; issues: any[] } {
  const issues: any[] = [];
  let totalScore = 0;
  
  if (pages.length === 0) {
    return { score: 100, issues };
  }
  
  pages.forEach(page => {
    const scoreResult = calculateDetailedSeoScore(
      page.seo_title || page.title,
      page.seo_description || page.body_html?.substring(0, 160) || '',
      false,
      !!page.handle,
      undefined,
      page.optimization_count || 0
    );
    totalScore += scoreResult.score;
  });
  
  const avgScore = Math.round(totalScore / pages.length);
  
  const missingTitles = pages.filter(p => !p.seo_title);
  if (missingTitles.length > 0) {
    issues.push({
      category: 'pages',
      severity: 'high',
      title: 'Titres SEO manquants',
      description: `${missingTitles.length} pages sans titre SEO.`,
      impact: 'Pages invisibles dans les moteurs de recherche.',
      action: 'Ajoutez un titre unique et descriptif pour chaque page.',
      count: missingTitles.length
    });
  }
  
  const missingDescriptions = pages.filter(p => !p.seo_description);
  if (missingDescriptions.length > 0) {
    issues.push({
      category: 'pages',
      severity: 'medium',
      title: 'Descriptions manquantes',
      description: `${missingDescriptions.length} pages sans meta description.`,
      impact: 'CTR réduit dans les résultats de recherche.',
      action: 'Ajoutez des descriptions engageantes (120-160 caractères).',
      count: missingDescriptions.length
    });
  }
  
  return { score: avgScore, issues };
}

function auditArticles(articles: any[]): { score: number; issues: any[] } {
  const issues: any[] = [];
  let totalScore = 0;
  
  if (articles.length === 0) {
    return { score: 100, issues };
  }
  
  // blog_articles doesn't have seo_title column, use title for both parameters
  articles.forEach(article => {
    const articleScore = calculateArticleSeoScore(
      article.title,
      article.title, // Use title (blog_articles has no seo_title column)
      article.meta_description || '',
      article.keywords ? (typeof article.keywords === 'string' ? [] : article.keywords) : [],
      !!article.featured_image,
      article.status === 'published',
      article.optimization_count || 0
    );
    totalScore += articleScore.score;
  });
  
  const avgScore = Math.round(totalScore / articles.length);
  
  const publishedArticles = articles.filter(a => a.status === 'published');
  if (publishedArticles.length < articles.length * 0.5) {
    issues.push({
      category: 'articles',
      severity: 'medium',
      title: 'Articles non publiés',
      description: `${articles.length - publishedArticles.length} articles en brouillon.`,
      impact: 'Contenu créé mais non visible pour le SEO.',
      action: 'Publiez les articles terminés.',
      count: articles.length - publishedArticles.length
    });
  }
  
  const missingImages = articles.filter(a => !a.featured_image);
  if (missingImages.length > 0) {
    issues.push({
      category: 'articles',
      severity: 'low',
      title: 'Images manquantes',
      description: `${missingImages.length} articles sans image mise en avant.`,
      impact: 'Engagement et partages sociaux réduits.',
      action: 'Ajoutez une image attractive pour chaque article.',
      count: missingImages.length
    });
  }
  
  const unoptimizedArticles = articles.filter(a => (a.optimization_count || 0) === 0);
  if (unoptimizedArticles.length > 0) {
    issues.push({
      category: 'articles',
      severity: 'high',
      title: 'Articles non optimisés',
      description: `${unoptimizedArticles.length} articles n'ont jamais été optimisés.`,
      impact: 'Contenu sous-performant en SEO.',
      action: 'Utilisez l\'optimiseur IA pour améliorer vos articles.',
      count: unoptimizedArticles.length
    });
  }
  
  return { score: avgScore, issues };
}

function auditImages(productImages: any[]): { score: number; issues: any[] } {
  const issues: any[] = [];
  
  if (productImages.length === 0) {
    return { score: 100, issues };
  }
  
  let totalScore = 0;
  productImages.forEach(img => {
    // Use optimization_count instead of ai_generated_alt (same as Dashboard)
    const isAI = (img.optimization_count || 0) > 0;
    const altScoreResult = calculateAltTextScore(img.alt_text || '', isAI);
    totalScore += altScoreResult.score;
  });
  
  const avgScore = Math.round(totalScore / productImages.length);
  
  const imagesWithoutAlt = productImages.filter(img => !img.alt_text);
  if (imagesWithoutAlt.length > 0) {
    issues.push({
      category: 'images',
      severity: 'high',
      title: 'Images sans texte alternatif',
      description: `${imagesWithoutAlt.length} images n'ont pas de texte alternatif.`,
      impact: 'Accessibilité compromise et opportunités SEO images perdues.',
      action: 'Générez des alt texts avec l\'IA ou ajoutez-les manuellement.',
      count: imagesWithoutAlt.length
    });
  }
  
  const poorQualityAlt = productImages.filter(img => {
    if (!img.alt_text) return false;
    const len = img.alt_text.length;
    return len < 15 || len > 125;
  });
  
  if (poorQualityAlt.length > 0) {
    issues.push({
      category: 'images',
      severity: 'medium',
      title: 'Alt texts de faible qualité',
      description: `${poorQualityAlt.length} images ont des alt texts trop courts ou trop longs.`,
      impact: 'Efficacité SEO réduite pour la recherche d\'images.',
      action: 'Optimisez les alt texts entre 15 et 90 caractères.',
      count: poorQualityAlt.length
    });
  }
  
  return { score: avgScore, issues };
}

function auditTags(products: any[]): { score: number; issues: any[] } {
  const issues: any[] = [];
  
  if (products.length === 0) {
    return { score: 100, issues };
  }
  
  let totalScore = 0;
  products.forEach(product => {
    const tagScore = calculateTagsScore(product.tags);
    totalScore += tagScore;
  });
  
  // Multiply by 5 because calculateTagsScore returns max 20, we want out of 100 (same as Dashboard line 353)
  const avgScore = Math.round((totalScore / products.length) * 5);
  
  const productsWithoutTags = products.filter(p => !p.tags || p.tags.trim().length === 0);
  if (productsWithoutTags.length > 0) {
    issues.push({
      category: 'tags',
      severity: 'medium',
      title: 'Produits sans tags',
      description: `${productsWithoutTags.length} produits n'ont aucun tag.`,
      impact: 'Organisation et découvrabilité réduites.',
      action: 'Ajoutez 3-10 tags pertinents par produit.',
      count: productsWithoutTags.length
    });
  }
  
  const poorTags = products.filter(p => {
    if (!p.tags) return false;
    const tags = p.tags.split(',').map((t: string) => t.trim());
    return tags.length < 3 || tags.some((t: string) => t.length <= 3);
  });
  
  if (poorTags.length > 0) {
    issues.push({
      category: 'tags',
      severity: 'low',
      title: 'Tags de faible qualité',
      description: `${poorTags.length} produits ont des tags trop courts ou insuffisants.`,
      impact: 'Catégorisation inefficace.',
      action: 'Utilisez des tags descriptifs de plus de 3 caractères.',
      count: poorTags.length
    });
  }
  
  return { score: avgScore, issues };
}

function identifyQuickWins(products: any[], collections: any[], pages: any[], articles: any[], images: any[], homepageSeo: any): any[] {
  const quickWins: any[] = [];
  
  // Products without SEO title (5 min each, high impact)
  const productsNoTitle = products.filter(p => !p.seo_title);
  if (productsNoTitle.length > 0) {
    quickWins.push({
      id: 'products_no_title',
      title: `${productsNoTitle.length} produit${productsNoTitle.length > 1 ? 's' : ''} sans titre SEO`,
      description: 'Ajoutez des titres SEO pour améliorer le référencement',
      impact: 8,
      effort: 'low',
      timeMinutes: productsNoTitle.length * 5,
      category: 'products',
      link: '/seo?tab=products',
      count: productsNoTitle.length
    });
  }
  
  // Images without alt text (2 min each, medium impact)
  const imagesNoAlt = images.filter(img => !img.alt_text || img.alt_text.trim().length === 0);
  if (imagesNoAlt.length > 0) {
    quickWins.push({
      id: 'images_no_alt',
      title: `${imagesNoAlt.length} image${imagesNoAlt.length > 1 ? 's' : ''} sans texte alternatif`,
      description: 'Ajoutez des descriptions alt pour l\'accessibilité et le SEO',
      impact: 6,
      effort: 'low',
      timeMinutes: imagesNoAlt.length * 2,
      category: 'images',
      link: '/seo?tab=alt',
      count: imagesNoAlt.length
    });
  }
  
  // Collections without description (3 min each, high impact)
  const collectionsNoDesc = collections.filter(c => !c.seo_description);
  if (collectionsNoDesc.length > 0) {
    quickWins.push({
      id: 'collections_no_desc',
      title: `${collectionsNoDesc.length} collection${collectionsNoDesc.length > 1 ? 's' : ''} sans description SEO`,
      description: 'Optimisez vos pages de collections pour le référencement',
      impact: 7,
      effort: 'low',
      timeMinutes: collectionsNoDesc.length * 3,
      category: 'collections',
      link: '/seo?tab=collections',
      count: collectionsNoDesc.length
    });
  }
  
  // Homepage without meta description (5 min, very high impact)
  if (!homepageSeo?.seo_description) {
    quickWins.push({
      id: 'homepage_no_desc',
      title: 'Page d\'accueil sans meta description',
      description: 'La description de votre page d\'accueil est cruciale pour le SEO',
      impact: 10,
      effort: 'low',
      timeMinutes: 5,
      category: 'homepage',
      link: '/seo?tab=homepage',
      count: 1
    });
  }
  
  // Articles ready to publish (1 click, medium impact)
  const draftArticles = articles.filter(a => a.status === 'draft');
  if (draftArticles.length > 0) {
    quickWins.push({
      id: 'articles_draft',
      title: `${draftArticles.length} article${draftArticles.length > 1 ? 's' : ''} en brouillon`,
      description: 'Publiez vos articles pour commencer à générer du trafic',
      impact: 7,
      effort: 'low',
      timeMinutes: 1,
      category: 'articles',
      link: '/blog',
      count: draftArticles.length
    });
  }
  
  // Pages without SEO title (5 min each, medium impact)
  const pagesNoTitle = pages.filter(p => !p.seo_title);
  if (pagesNoTitle.length > 0) {
    quickWins.push({
      id: 'pages_no_title',
      title: `${pagesNoTitle.length} page${pagesNoTitle.length > 1 ? 's' : ''} sans titre SEO`,
      description: 'Optimisez vos pages statiques pour le référencement',
      impact: 6,
      effort: 'low',
      timeMinutes: pagesNoTitle.length * 5,
      category: 'pages',
      link: '/seo?tab=pages',
      count: pagesNoTitle.length
    });
  }
  
  // Calculate ROI (impact / effort) and sort
  return quickWins
    .map(qw => ({ ...qw, roi: qw.impact / (qw.timeMinutes / 5) }))
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 10); // Top 10 quick wins
}

function generateRecommendations(auditResults: any, products: any[], collections: any[], pages: any[], articles: any[], images: any[]): any[] {
  const recommendations: any[] = [];
  
  // Category-specific recommendations
  if (auditResults.products_score < 70 && products.length > 0) {
    const missingTitle = products.filter(p => !p.seo_title).length;
    const missingDesc = products.filter(p => !p.seo_description).length;
    
    recommendations.push({
      category: 'products',
      priority: 'high',
      title: 'Optimiser les fiches produits',
      description: `${missingTitle} produits sans titre SEO, ${missingDesc} sans description`,
      estimatedImpact: '+20% trafic produits',
      timeEstimate: `${Math.ceil((missingTitle + missingDesc) * 3)} minutes`,
      difficulty: 'Facile',
      expectedScoreGain: 15,
      actions: [
        { text: 'Ajouter titres SEO manquants', link: '/seo?tab=products', count: missingTitle },
        { text: 'Compléter descriptions SEO', link: '/seo?tab=products', count: missingDesc },
        { text: 'Utiliser l\'optimiseur IA', link: '/seo?tab=products' }
      ]
    });
  }
  
  if (auditResults.images_score < 70 && images.length > 0) {
    const noAlt = images.filter(img => !img.alt_text).length;
    const poorAlt = images.filter(img => img.alt_text && img.alt_text.length < 10).length;
    
    recommendations.push({
      category: 'images',
      priority: 'high',
      title: 'Améliorer les images',
      description: `${noAlt} images sans alt text, ${poorAlt} avec descriptions trop courtes`,
      estimatedImpact: '+15% visibilité Google Images',
      timeEstimate: `${Math.ceil(noAlt * 2)} minutes`,
      difficulty: 'Facile',
      expectedScoreGain: 12,
      actions: [
        { text: 'Ajouter alt text manquant', link: '/seo?tab=alt', count: noAlt },
        { text: 'Améliorer alt text existant', link: '/seo?tab=alt', count: poorAlt }
      ]
    });
  }
  
  if (auditResults.collections_score < 70 && collections.length > 0) {
    const noDesc = collections.filter(c => !c.seo_description).length;
    
    recommendations.push({
      category: 'collections',
      priority: 'medium',
      title: 'Optimiser les collections',
      description: `${noDesc} collections sans description SEO`,
      estimatedImpact: '+10% trafic catégories',
      timeEstimate: `${Math.ceil(noDesc * 5)} minutes`,
      difficulty: 'Moyen',
      expectedScoreGain: 10,
      actions: [
        { text: 'Ajouter descriptions manquantes', link: '/seo?tab=collections', count: noDesc }
      ]
    });
  }
  
  if (auditResults.articles_score < 70 && articles.length > 0) {
    const drafts = articles.filter(a => a.status === 'draft').length;
    const noKeywords = articles.filter(a => !a.keywords || a.keywords.length === 0).length;
    
    recommendations.push({
      category: 'articles',
      priority: 'medium',
      title: 'Publier et optimiser le blog',
      description: `${drafts} articles en attente, ${noKeywords} sans mots-clés`,
      estimatedImpact: '+25% trafic organique blog',
      timeEstimate: `${Math.ceil(drafts * 2)} minutes`,
      difficulty: 'Facile',
      expectedScoreGain: 18,
      actions: [
        { text: 'Publier les brouillons', link: '/blog', count: drafts },
        { text: 'Ajouter mots-clés', link: '/blog', count: noKeywords }
      ]
    });
  }
  
  if (auditResults.homepage_score < 70) {
    recommendations.push({
      category: 'homepage',
      priority: 'high',
      title: 'Optimiser la page d\'accueil',
      description: 'Votre vitrine principale nécessite une optimisation',
      estimatedImpact: '+30% trafic global',
      timeEstimate: '10 minutes',
      difficulty: 'Facile',
      expectedScoreGain: 20,
      actions: [
        { text: 'Optimiser titre et description', link: '/seo?tab=homepage' }
      ]
    });
  }
  
  return recommendations.sort((a, b) => {
    const priorityOrder: { [key: string]: number } = { high: 3, medium: 2, low: 1 };
    return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
  });
}
