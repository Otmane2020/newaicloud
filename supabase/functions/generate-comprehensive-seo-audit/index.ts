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

    // Fetch all data needed for audit
    const [productsResult, collectionsResult, articlesResult, pagesResult, storeResult] = await Promise.all([
      supabaseAdmin.from('shopify_products').select('*').eq('seller_id', user.id),
      supabaseAdmin.from('shopify_collections').select('*').eq('user_id', user.id),
      supabaseAdmin.from('blog_articles').select('*').eq('user_id', user.id),
      supabaseAdmin.from('shopify_pages').select('*').eq('user_id', user.id),
      supabaseAdmin.from('shopify_connections').select('*').eq('user_id', user.id).limit(1).single()
    ]);

    const products = productsResult.data || [];
    const collections = collectionsResult.data || [];
    const articles = articlesResult.data || [];
    const pages = pagesResult.data || [];
    const store = storeResult.data;

    console.log(`[AUDIT] Data fetched - Products: ${products.length}, Collections: ${collections.length}, Articles: ${articles.length}, Pages: ${pages.length}`);

    // Initialize audit results
    const auditResults = {
      global_score: 0,
      homepage_score: 0,
      products_score: 0,
      collections_score: 0,
      blog_score: 0,
      images_score: 0,
      technical_score: 0,
      issues: [] as any[],
      recommendations: [] as any[]
    };

    // 1. HOMEPAGE AUDIT
    console.log('[AUDIT] Analyzing homepage...');
    const homepageIssues = auditHomepage(store);
    auditResults.issues.push(...homepageIssues.issues);
    auditResults.homepage_score = homepageIssues.score;

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

    // 4. BLOG AUDIT
    console.log('[AUDIT] Analyzing blog articles...');
    const blogAudit = auditBlog(articles);
    auditResults.issues.push(...blogAudit.issues);
    auditResults.blog_score = blogAudit.score;

    // 5. IMAGES AUDIT
    console.log('[AUDIT] Analyzing images...');
    const imagesAudit = auditImages(products, collections);
    auditResults.issues.push(...imagesAudit.issues);
    auditResults.images_score = imagesAudit.score;

    // 6. TECHNICAL AUDIT
    console.log('[AUDIT] Technical analysis...');
    const technicalAudit = auditTechnical(store);
    auditResults.issues.push(...technicalAudit.issues);
    auditResults.technical_score = technicalAudit.score;

    // Calculate global score
    const scores = [
      auditResults.homepage_score,
      auditResults.products_score,
      auditResults.collections_score,
      auditResults.blog_score,
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
        blog_score: auditResults.blog_score,
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
  let score = 100;

  if (products.length === 0) {
    return { issues: [], score: 100 };
  }

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
    score -= Math.min(30, duplicates.length * 2);
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
    score -= Math.min(20, (missingDesc.length / products.length) * 20);
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
    score -= Math.min(15, (missingSeoTitle.length / products.length) * 15);
  }

  return { issues, score: Math.max(0, score) };
}

function auditCollections(collections: any[]) {
  const issues = [];
  let score = 100;

  if (collections.length === 0) {
    return { issues: [], score: 100 };
  }

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
    score -= Math.min(25, (missingDesc.length / collections.length) * 25);
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
    score -= Math.min(10, (missingAlt.length / collections.length) * 10);
  }

  return { issues, score: Math.max(0, score) };
}

function auditBlog(articles: any[]) {
  const issues = [];
  let score = 100;

  if (articles.length === 0) {
    issues.push({
      category: 'blog',
      priority: 'low',
      title: 'Aucun article de blog',
      description: 'Pas de contenu blog pour le SEO',
      impact: 'Perte d\'opportunités de trafic organique',
      action: 'Créer des articles de blog optimisés SEO',
      count: 0
    });
    return { issues, score: 50 };
  }

  // Check for published articles
  const published = articles.filter(a => a.status === 'published');
  if (published.length === 0) {
    issues.push({
      category: 'blog',
      priority: 'medium',
      title: 'Aucun article publié',
      description: 'Tous les articles sont en brouillon',
      impact: 'Pas de contenu visible pour les moteurs de recherche',
      action: 'Publier des articles optimisés',
      count: articles.length
    });
    score -= 40;
  }

  // Check for missing meta descriptions
  const missingMeta = articles.filter(a => !a.meta_description);
  if (missingMeta.length > 0) {
    issues.push({
      category: 'blog',
      priority: 'medium',
      title: `${missingMeta.length} articles sans meta description`,
      description: 'Articles sans meta description SEO',
      impact: 'Taux de clic réduit dans les SERP',
      action: 'Ajouter des meta descriptions engageantes',
      count: missingMeta.length
    });
    score -= Math.min(20, (missingMeta.length / articles.length) * 20);
  }

  return { issues, score: Math.max(0, score) };
}

function auditImages(products: any[], collections: any[]) {
  const issues = [];
  let score = 100;

  // Count products with images but no alt text
  const productsWithoutAlt = products.filter(p => p.image_url && !p.seo_description);
  
  if (productsWithoutAlt.length > 0) {
    issues.push({
      category: 'images',
      priority: 'medium',
      title: `${productsWithoutAlt.length} images produit sans alt`,
      description: 'Images principales de produits sans texte alternatif',
      impact: 'Accessibilité réduite et SEO image non optimisé',
      action: 'Générer des textes alt avec l\'IA',
      count: productsWithoutAlt.length
    });
    score -= Math.min(30, (productsWithoutAlt.length / products.length) * 30);
  }

  return { issues, score: Math.max(0, score) };
}

function auditTechnical(store: any) {
  const issues = [];
  let score = 100;

  if (!store) {
    return { issues: [], score: 50 };
  }

  // Basic technical checks
  if (!store.last_sync_at) {
    issues.push({
      category: 'technical',
      priority: 'low',
      title: 'Première synchronisation nécessaire',
      description: 'La boutique n\'a jamais été synchronisée',
      impact: 'Données potentiellement obsolètes',
      action: 'Effectuer une synchronisation complète'
    });
    score -= 10;
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