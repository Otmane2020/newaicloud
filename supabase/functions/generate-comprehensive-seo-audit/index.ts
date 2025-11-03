import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[AUDIT] Starting comprehensive SEO audit');
    
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

    // Fetch all data needed for audit (including images and homepage SEO)
    const [productsResult, collectionsResult, articlesResult, pagesResult, storeResult, contentImagesResult, homepageSeoResult] = await Promise.all([
      supabaseAdmin.from('shopify_products').select('*').eq('seller_id', user.id),
      supabaseAdmin.from('shopify_collections').select('*').eq('user_id', user.id),
      supabaseAdmin.from('blog_articles').select('*').eq('user_id', user.id),
      supabaseAdmin.from('shopify_pages').select('*').eq('user_id', user.id),
      supabaseAdmin.from('shopify_connections').select('*').eq('user_id', user.id).limit(1).maybeSingle(),
      supabaseAdmin.from('content_images').select('id, alt_text, optimization_count').eq('user_id', user.id),
      supabaseAdmin.from('homepage_seo').select('last_audit').eq('user_id', user.id).maybeSingle()
    ]);

    const products = productsResult.data || [];
    const collections = collectionsResult.data || [];
    const articles = articlesResult.data || [];
    const pages = pagesResult.data || [];
    const store = storeResult.data;
    const contentImages = contentImagesResult.data || [];
    const homepageSeo = homepageSeoResult.data;

    // Fetch product images for user's products
    const productIds = products.map(p => p.id);
    let productImages: any[] = [];
    
    if (productIds.length > 0) {
      const { data: imgData } = await supabaseAdmin
        .from('product_images')
        .select('id, alt_text, optimization_count')
        .in('product_id', productIds);
      productImages = imgData || [];
    }

    console.log(`[AUDIT] Data fetched - Products: ${products.length}, Collections: ${collections.length}, Articles: ${articles.length}, Pages: ${pages.length}`);
    console.log(`[AUDIT] Images fetched - Product images: ${productImages.length}, Content images: ${contentImages.length}, Total: ${productImages.length + contentImages.length}`);

    // Initialize audit results
    const auditResults = {
      global_score: 0,
      homepage_score: 0,
      products_score: 0,
      collections_score: 0,
      content_score: 0, // Articles + Pages combined
      images_score: 0,
      technical_score: 0,
      issues: [] as any[],
      recommendations: [] as any[]
    };

    // 1. HOMEPAGE AUDIT
    console.log('[AUDIT] Analyzing homepage...');
    // Use the detailed analysis from homepage_seo if available
    if (homepageSeo?.last_audit && typeof homepageSeo.last_audit === 'object' && 'score' in homepageSeo.last_audit) {
      auditResults.homepage_score = homepageSeo.last_audit.score;
      console.log(`[AUDIT] Using detailed homepage score: ${homepageSeo.last_audit.score}`);
    } else {
      const homepageIssues = auditHomepage(store);
      auditResults.issues.push(...homepageIssues.issues);
      auditResults.homepage_score = homepageIssues.score;
    }

    // 2. PRODUCTS AUDIT
    console.log('[AUDIT] Analyzing products...');
    const productsAudit = auditProducts(products);
    auditResults.issues.push(...productsAudit.issues);
    auditResults.products_score = productsAudit.score;

    // 3. COLLECTIONS AUDIT
    console.log('[AUDIT] Analyzing collections...');
    const collectionsAudit = auditCollections(collections);
    auditResults.issues.push(...collectionsAudit.issues);
    auditResults.collections_score = collectionsAudit.score;

    // 4. CONTENT AUDIT (Articles + Pages)
    console.log('[AUDIT] Analyzing content (articles + pages)...');
    const contentAudit = auditContent(articles, pages);
    auditResults.issues.push(...contentAudit.issues);
    auditResults.content_score = contentAudit.score;

    // 5. IMAGES AUDIT
    console.log(`[AUDIT] Analyzing images... (${productImages.length} product + ${contentImages.length} content)`);
    const imagesAudit = auditImages(productImages, contentImages);
    console.log(`[AUDIT] Images score calculated: ${imagesAudit.score}`);
    auditResults.issues.push(...imagesAudit.issues);
    auditResults.images_score = imagesAudit.score;

    // 6. TECHNICAL AUDIT
    console.log('[AUDIT] Technical analysis...');
    const technicalAudit = auditTechnical(store);
    console.log(`[AUDIT] Technical score calculated: ${technicalAudit.score}`);
    auditResults.issues.push(...technicalAudit.issues);
    auditResults.technical_score = technicalAudit.score;

    // Calculate global score (6 categories)
    const scores = [
      auditResults.homepage_score,
      auditResults.products_score,
      auditResults.collections_score,
      auditResults.content_score,
      auditResults.images_score,
      auditResults.technical_score
    ];
    auditResults.global_score = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    // Generate recommendations
    auditResults.recommendations = generateRecommendations(auditResults);

    console.log(`[AUDIT] Audit complete - Global score: ${auditResults.global_score}/100`);

    // Save audit to database
    const { data: savedAudit, error: saveError } = await supabaseAdmin
      .from('seo_audit_reports')
      .insert({
        user_id: user.id,
        store_id: store?.id,
        global_score: auditResults.global_score,
        homepage_score: auditResults.homepage_score,
        products_score: auditResults.products_score,
        collections_score: auditResults.collections_score,
        blog_score: auditResults.content_score, // Store as blog_score for compatibility
        images_score: auditResults.images_score, // Add images score
        technical_score: auditResults.technical_score, // Add technical score
        audit_results: auditResults,
        recommendations: auditResults.recommendations
      })
      .select()
      .single();

    if (saveError) {
      console.error('[AUDIT] Error saving audit:', saveError);
      throw saveError;
    }

    console.log('[AUDIT] Audit saved successfully');

    return new Response(
      JSON.stringify({ success: true, audit: savedAudit }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[AUDIT] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============= AUDIT FUNCTIONS =============

function auditHomepage(store: any) {
  const issues = [];
  let score = 100;

  if (!store) {
    issues.push({
      category: 'homepage',
      priority: 'high',
      title: 'Pas de connexion boutique',
      description: 'Aucune boutique Shopify connectée',
      impact: 'Impossible d\'auditer la homepage',
      action: 'Connecter une boutique Shopify'
    });
    return { issues, score: 0 };
  }

  // Check store configuration
  if (!store.store_url) {
    issues.push({
      category: 'homepage',
      priority: 'high',
      title: 'URL de boutique manquante',
      description: 'L\'URL de la boutique n\'est pas configurée',
      impact: 'Problèmes de référencement et d\'accessibilité',
      action: 'Configurer l\'URL de la boutique'
    });
    score -= 30;
  }

  return { issues, score };
}

function auditProducts(products: any[]) {
  const issues = [];
  let totalScore = 0;

  if (products.length === 0) {
    return { issues: [], score: 100 };
  }

  // Calculate SEO score for each product using the same method as SeoOptimization
  products.forEach(p => {
    const score = calculateSeoScore(p.seo_title, p.seo_description, !!p.image_url, p.tags, p.optimization_count);
    totalScore += score;
  });
  
  const avgScore = Math.round(totalScore / products.length);

  // Check for duplicate titles
  const titleMap = new Map();
  products.forEach(p => {
    const title = p.title || '';
    titleMap.set(title, (titleMap.get(title) || 0) + 1);
  });

  const duplicates = Array.from(titleMap.entries()).filter(([, count]) => count > 1);
  if (duplicates.length > 0) {
    issues.push({
      category: 'products',
      priority: 'high',
      title: `${duplicates.length} titres dupliqués`,
      description: `Plusieurs produits partagent le même titre`,
      impact: 'Pénalise le référencement et crée de la confusion',
      action: 'Rendre chaque titre unique',
      count: duplicates.length
    });
  }

  // Check for missing SEO descriptions
  const missingDesc = products.filter(p => !p.seo_description || p.seo_description.length < 50);
  if (missingDesc.length > 0) {
    issues.push({
      category: 'products',
      priority: 'medium',
      title: `${missingDesc.length} produits sans meta description`,
      description: 'Des produits n\'ont pas de meta description optimisée',
      impact: 'Réduit le taux de clic dans les résultats de recherche',
      action: 'Ajouter des meta descriptions de 150-160 caractères',
      count: missingDesc.length
    });
  }

  // Check for missing SEO titles
  const missingSeoTitle = products.filter(p => !p.seo_title || p.seo_title === p.title);
  if (missingSeoTitle.length > 0) {
    issues.push({
      category: 'products',
      priority: 'medium',
      title: `${missingSeoTitle.length} produits sans SEO title`,
      description: 'Des produits n\'ont pas de titre SEO optimisé',
      impact: 'Perte d\'opportunités de référencement',
      action: 'Créer des titres SEO uniques avec mots-clés',
      count: missingSeoTitle.length
    });
  }

  return { issues, score: avgScore };
}

// Helper function to calculate SEO score (must match frontend calculation)
function calculateSeoScore(
  title: string | null,
  description: string | null,
  hasImage: boolean,
  tags: string | null,
  optimizationCount: number
): number {
  let score = 0;
  
  // Title score (35 points)
  if (title) {
    const titleLength = title.length;
    if (titleLength >= 50 && titleLength <= 60) {
      score += 35;
    } else if (titleLength >= 40 && titleLength <= 70) {
      score += 28;
    } else if (titleLength >= 30) {
      score += 20;
    } else {
      score += 10;
    }
  }
  
  // Description score (35 points)
  if (description) {
    const descLength = description.length;
    if (descLength >= 120 && descLength <= 160) {
      score += 35;
    } else if (descLength >= 100 && descLength <= 200) {
      score += 28;
    } else if (descLength >= 70) {
      score += 20;
    } else {
      score += 10;
    }
  }
  
  // Image score (10 points)
  if (hasImage) score += 10;
  
  // Tags score (10 points)
  if (tags && tags.length > 0) score += 10;
  
  // Optimization bonus (10 points)
  if (optimizationCount > 0) score += 10;
  
  return Math.min(100, score);
}

function auditCollections(collections: any[]) {
  const issues = [];
  let totalScore = 0;

  if (collections.length === 0) {
    return { issues: [], score: 100 };
  }

  // Calculate SEO score for each collection
  collections.forEach(c => {
    const score = calculateSeoScore(c.seo_title, c.seo_description, !!c.image_url, null, c.optimization_count || 0);
    totalScore += score;
  });
  
  const avgScore = Math.round(totalScore / collections.length);

  // Check for missing descriptions
  const missingDesc = collections.filter(c => !c.seo_description || c.seo_description.length < 50);
  if (missingDesc.length > 0) {
    issues.push({
      category: 'collections',
      priority: 'medium',
      title: `${missingDesc.length} collections sans description SEO`,
      description: 'Collections sans meta description optimisée',
      impact: 'Opportunités de référencement manquées',
      action: 'Ajouter des descriptions uniques et persuasives',
      count: missingDesc.length
    });
  }

  // Check for missing images alt
  const missingAlt = collections.filter(c => c.image_url && !c.image_alt);
  if (missingAlt.length > 0) {
    issues.push({
      category: 'collections',
      priority: 'low',
      title: `${missingAlt.length} images de collection sans texte alt`,
      description: 'Images sans attribut alt pour l\'accessibilité',
      impact: 'Problèmes d\'accessibilité et SEO image',
      action: 'Ajouter des descriptions alt aux images',
      count: missingAlt.length
    });
  }

  return { issues, score: avgScore };
}

function auditContent(articles: any[], pages: any[]) {
  const issues = [];
  let articleTotalScore = 0;
  let pageTotalScore = 0;

  // ARTICLES AUDIT
  if (articles.length === 0) {
    issues.push({
      category: 'content',
      priority: 'low',
      title: 'Aucun article de blog',
      description: 'Pas de contenu blog pour le SEO',
      impact: 'Perte d\'opportunités de trafic organique',
      action: 'Créer des articles de blog optimisés SEO',
      count: 0
    });
  } else {
    // Calculate average score for articles
    articles.forEach(a => {
      const score = calculateSeoScore(a.title, a.meta_description || a.seo_description, !!a.featured_image, null, a.optimization_count || 0);
      articleTotalScore += score;
    });
    
    // Check for published articles
    const published = articles.filter(a => a.status === 'published');
    if (published.length === 0) {
      issues.push({
        category: 'content',
        priority: 'medium',
        title: 'Aucun article publié',
        description: 'Tous les articles sont en brouillon',
        impact: 'Pas de contenu visible pour les moteurs de recherche',
        action: 'Publier des articles optimisés',
        count: articles.length
      });
    } else {
      // Check for articles without featured image
      const missingFeaturedImage = published.filter(a => !a.featured_image);
      if (missingFeaturedImage.length > 0) {
        issues.push({
          category: 'content',
          priority: 'medium',
          title: `${missingFeaturedImage.length} articles sans image à la une`,
          description: 'Articles publiés sans featured image',
          impact: 'Moins attractif dans les SERP et réseaux sociaux',
          action: 'Ajouter une image à la une pour chaque article',
          count: missingFeaturedImage.length
        });
      }
      
      const optimizedArticles = published.filter(a => 
        a.meta_description && 
        a.meta_description.length >= 120 &&
        a.optimization_count > 0
      );
      
      if (optimizedArticles.length < published.length) {
        issues.push({
          category: 'content',
          priority: 'medium',
          title: `${published.length - optimizedArticles.length} articles non optimisés`,
          description: 'Articles publiés sans optimisation SEO complète',
          impact: 'Taux de clic réduit dans les SERP',
          action: 'Optimiser les meta descriptions et titres SEO',
          count: published.length - optimizedArticles.length
        });
      }
    }
  }

  // PAGES AUDIT
  if (pages.length === 0) {
    issues.push({
      category: 'content',
      priority: 'low',
      title: 'Aucune page Shopify',
      description: 'Pas de pages statiques pour le SEO',
      impact: 'Opportunités de contenu manquées',
      action: 'Créer des pages optimisées (À propos, Contact, etc.)',
      count: 0
    });
  } else {
    // Calculate average score for pages
    pages.forEach(p => {
      const score = calculateSeoScore(p.seo_title || p.title, p.seo_description, false, null, p.optimization_count || 0);
      pageTotalScore += score;
    });
    
    // Check for optimized pages
    const optimizedPages = pages.filter(p => 
      p.seo_title && 
      p.seo_description && 
      p.seo_description.length >= 120 &&
      p.optimization_count > 0
    );
    
    if (optimizedPages.length < pages.length) {
      issues.push({
        category: 'content',
        priority: 'medium',
        title: `${pages.length - optimizedPages.length} pages non optimisées`,
        description: 'Pages sans SEO optimisé',
        impact: 'Référencement des pages non optimal',
        action: 'Optimiser les titres et descriptions SEO des pages',
        count: pages.length - optimizedPages.length
      });
    }
  }

  // Combined score
  let finalScore;
  if (articles.length === 0 && pages.length === 0) {
    finalScore = 0;
  } else if (articles.length === 0) {
    finalScore = Math.round(pageTotalScore / pages.length);
  } else if (pages.length === 0) {
    finalScore = Math.round(articleTotalScore / articles.length);
  } else {
    const avgArticleScore = Math.round(articleTotalScore / articles.length);
    const avgPageScore = Math.round(pageTotalScore / pages.length);
    finalScore = Math.round((avgArticleScore + avgPageScore) / 2);
  }
  
  return { issues, score: Math.max(0, finalScore) };
}

function auditImages(productImages: any[], contentImages: any[]) {
  const issues = [];
  let score = 100;

  // Combine all images
  const allImages = [...productImages, ...contentImages];

  if (allImages.length === 0) {
    return { issues: [], score: 100 };
  }

  // Count images without ALT text
  const imagesWithoutAlt = allImages.filter(img => !img.alt_text || img.alt_text.trim() === '');
  const imagesWithAlt = allImages.filter(img => img.alt_text && img.alt_text.trim() !== '');
  
  // Calculate completion percentage
  const completionRate = (imagesWithAlt.length / allImages.length) * 100;
  
  // Score based on completion rate
  score = Math.round(completionRate);

  // Calculate quality bonus for AI-optimized images
  const optimizedImages = allImages.filter(img => img.optimization_count > 0);
  const optimizationBonus = Math.min(20, (optimizedImages.length / allImages.length) * 20);
  score = Math.min(100, score + optimizationBonus);

  if (imagesWithoutAlt.length > 0) {
    const percentage = Math.round((imagesWithoutAlt.length / allImages.length) * 100);
    issues.push({
      category: 'images',
      priority: percentage > 50 ? 'high' : 'medium',
      title: `${imagesWithoutAlt.length} images sans texte alt`,
      description: `${percentage}% de vos images n'ont pas de texte alternatif`,
      impact: 'Accessibilité réduite et SEO image non optimisé',
      action: 'Générer des textes alt avec l\'IA Vision',
      count: imagesWithoutAlt.length
    });
  }

  console.log(`[AUDIT-IMAGES] Total: ${allImages.length}, With ALT: ${imagesWithAlt.length}, Without ALT: ${imagesWithoutAlt.length}, Score: ${score}`);

  return { issues, score: Math.max(0, score) };
}

function auditTechnical(store: any) {
  const issues = [];
  let score = 100;

  if (!store) {
    issues.push({
      category: 'technical',
      priority: 'critical',
      title: 'Aucune boutique connectée',
      description: 'Pas de connexion Shopify active',
      impact: 'Impossible de synchroniser et d\'optimiser',
      action: 'Connecter votre boutique Shopify'
    });
    return { issues, score: 0 };
  }

  // Check store configuration
  if (!store.store_url) {
    issues.push({
      category: 'technical',
      priority: 'high',
      title: 'URL de boutique manquante',
      description: 'Configuration incomplète',
      impact: 'Synchronisation impossible',
      action: 'Configurer l\'URL dans les paramètres'
    });
    score -= 30;
  }

  // Check synchronization status
  if (!store.last_sync_at) {
    issues.push({
      category: 'technical',
      priority: 'medium',
      title: 'Aucune synchronisation effectuée',
      description: 'La boutique n\'a jamais été synchronisée',
      impact: 'Données potentiellement obsolètes',
      action: 'Effectuer une première synchronisation'
    });
    score -= 20;
  } else {
    // Check if sync is recent (within last 7 days)
    const lastSync = new Date(store.last_sync_at);
    const daysSinceSync = Math.floor((Date.now() - lastSync.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceSync > 7) {
      issues.push({
        category: 'technical',
        priority: 'low',
        title: 'Synchronisation ancienne',
        description: `Dernière sync il y a ${daysSinceSync} jours`,
        impact: 'Données potentiellement obsolètes',
        action: 'Re-synchroniser votre boutique'
      });
      score -= 10;
    }
  }

  // Check if store is active
  if (!store.is_active) {
    issues.push({
      category: 'technical',
      priority: 'high',
      title: 'Boutique désactivée',
      description: 'La connexion est inactive',
      impact: 'Aucune synchronisation possible',
      action: 'Réactiver la connexion Shopify'
    });
    score -= 40;
  }

  return { issues, score: Math.max(0, score) };
}

function generateRecommendations(auditResults: any) {
  const recommendations = [];

  // Priority 1: Critical issues
  const criticalIssues = auditResults.issues.filter((i: any) => i.priority === 'high');
  if (criticalIssues.length > 0) {
    recommendations.push({
      priority: 'high',
      title: '🔴 Actions Critiques (Semaine 1)',
      actions: criticalIssues.map((issue: any) => issue.action).slice(0, 3)
    });
  }

  // Priority 2: Important improvements
  const mediumIssues = auditResults.issues.filter((i: any) => i.priority === 'medium');
  if (mediumIssues.length > 0) {
    recommendations.push({
      priority: 'medium',
      title: '🟡 Améliorations Importantes (Semaine 2-3)',
      actions: mediumIssues.map((issue: any) => issue.action).slice(0, 5)
    });
  }

  // Priority 3: Optimizations
  const lowIssues = auditResults.issues.filter((i: any) => i.priority === 'low');
  if (lowIssues.length > 0) {
    recommendations.push({
      priority: 'low',
      title: '🟢 Optimisations (Mois suivant)',
      actions: lowIssues.map((issue: any) => issue.action).slice(0, 3)
    });
  }

  return recommendations;
}