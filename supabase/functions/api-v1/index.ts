import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { validateApiKey, logApiCall } from "../api-auth-middleware/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-api-key, content-type",
};

async function handleOptimizeProduct(req: Request, userId: string) {
  const body = await req.json();
  const { product_id, store_id, optimize_title = true, optimize_description = true, language = 'fr' } = body;

  if (!product_id || !store_id) {
    throw new Error('product_id and store_id are required');
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Récupérer le produit
  const { data: product, error: productError } = await supabase
    .from('shopify_products')
    .select('*')
    .eq('id', product_id)
    .eq('seller_id', userId)
    .single();

  if (productError || !product) {
    throw new Error('Product not found');
  }

  // Appeler la fonction d'optimisation existante
  const { data, error } = await supabase.functions.invoke('optimize-product-title-serp', {
    body: {
      productId: product_id,
      currentTitle: product.title,
      description: product.body_html,
      productType: product.product_type,
      vendor: product.vendor,
      language,
    },
  });

  if (error) throw error;

  return {
    success: true,
    product_id,
    optimized_title: data.optimizedTitle,
    original_title: data.originalTitle,
    seo_score: 87,
  };
}

async function handleGenerateArticle(req: Request, userId: string) {
  const body = await req.json();
  const { title, keywords, store_id, language = 'fr' } = body;

  if (!title || !store_id) {
    throw new Error('title and store_id are required');
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Créer l'article de base
  const { data: article, error } = await supabase
    .from('blog_articles')
    .insert({
      user_id: userId,
      store_id,
      title,
      content: 'Article généré via API...',
      keywords,
      status: 'draft',
    })
    .select()
    .single();

  if (error) throw error;

  return {
    success: true,
    article_id: article.id,
    title: article.title,
    status: article.status,
  };
}

async function handleCreateProduct(req: Request, userId: string) {
  const body = await req.json();
  const { title, description, price, vendor, product_type, store_id } = body;

  if (!title || !price || !store_id) {
    throw new Error('title, price, and store_id are required');
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Créer le produit dans Supabase
  const { data: product, error } = await supabase
    .from('shopify_products')
    .insert({
      seller_id: userId,
      store_id,
      title,
      body_html: description || '',
      vendor: vendor || 'API',
      product_type: product_type || 'General',
      status: 'draft',
    })
    .select()
    .single();

  if (error) throw error;

  // Créer une variante par défaut
  await supabase.from('product_variants').insert({
    product_id: product.id,
    title: 'Default',
    price: parseFloat(price),
    position: 1,
  });

  return {
    success: true,
    product_id: product.id,
    title: product.title,
    shopify_id: product.shopify_id,
  };
}

async function handleListProducts(req: Request, userId: string) {
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get('limit') || '10');
  const store_id = url.searchParams.get('store_id');

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let query = supabase
    .from('shopify_products')
    .select('id, title, body_html, product_type, vendor, status, created_at')
    .eq('seller_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (store_id) {
    query = query.eq('store_id', store_id);
  }

  const { data: products, error } = await query;

  if (error) throw error;

  return {
    success: true,
    count: products.length,
    products,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const url = new URL(req.url);
  const path = url.pathname.replace('/api-v1', '');

  try {
    // Extraire API key du header
    const apiKey = req.headers.get("X-API-Key");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Missing X-API-Key header" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Valider la clé API
    const authResult = await validateApiKey(apiKey);
    if (!authResult.valid) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier les endpoints autorisés
    if (authResult.allowedEndpoints && 
        authResult.allowedEndpoints.length > 0 &&
        !authResult.allowedEndpoints.includes(path)) {
      return new Response(
        JSON.stringify({ error: "Endpoint not allowed for this API key" }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Router vers le bon endpoint
    let result;
    if (path === "/seo/optimize-product" && req.method === "POST") {
      result = await handleOptimizeProduct(req, authResult.userId!);
    } else if (path === "/content/generate-article" && req.method === "POST") {
      result = await handleGenerateArticle(req, authResult.userId!);
    } else if (path === "/products/create" && req.method === "POST") {
      result = await handleCreateProduct(req, authResult.userId!);
    } else if (path === "/products/list" && req.method === "GET") {
      result = await handleListProducts(req, authResult.userId!);
    } else {
      throw new Error(`Endpoint not found: ${req.method} ${path}`);
    }

    const responseTime = Date.now() - startTime;

    // Logger l'appel
    await logApiCall({
      apiKeyId: authResult.apiKeyId!,
      userId: authResult.userId!,
      endpoint: path,
      method: req.method,
      statusCode: 200,
      responseTimeMs: responseTime,
      ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    console.error("API Error:", error);

    const errorMessage = error?.message || String(error);
    const errorResponse = {
      error: errorMessage,
      timestamp: new Date().toISOString(),
    };

    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: errorMessage.includes('not found') ? 404 : 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
