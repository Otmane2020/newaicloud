import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getSeoPrompt, getSystemRole } from "../_shared/multilingual-prompts.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Multilingual translations
const TRANSLATIONS = {
  fr: {
    missingSupabaseCredentials: "Identifiants Supabase manquants",
    deepseekNotConfigured: "DEEPSEEK_API_KEY non configuré",
    deepseekApiError: "Erreur API DeepSeek",
    productIdsRequired: "Le tableau productIds est requis",
    errorOptimizingProduct: "Erreur lors de l'optimisation du produit",
    unknownError: "Erreur inconnue",
    errorInOptimize: "Erreur dans optimize-shopping-feed",
  },
  en: {
    missingSupabaseCredentials: "Missing Supabase credentials",
    deepseekNotConfigured: "DEEPSEEK_API_KEY not configured",
    deepseekApiError: "DeepSeek API error",
    productIdsRequired: "productIds array is required",
    errorOptimizingProduct: "Error optimizing product",
    unknownError: "Unknown error",
    errorInOptimize: "Error in optimize-shopping-feed",
  },
};

function detectLanguage(req: Request): 'fr' | 'en' {
  const acceptLanguage = req.headers.get('Accept-Language') || '';
  return acceptLanguage.toLowerCase().includes('fr') ? 'fr' : 'en';
}

function getSupabaseClient(authHeader: string, lang: 'fr' | 'en' = 'en') {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseKey) throw new Error(TRANSLATIONS[lang].missingSupabaseCredentials);
  return createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authHeader } },
  });
}

async function callDeepSeek(prompt: string, lang: 'fr' | 'en' = 'en'): Promise<string> {
  const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
  if (!apiKey) throw new Error(TRANSLATIONS[lang].deepseekNotConfigured);

  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "You are an expert in Google Shopping optimization. Provide clear, concise responses in JSON format only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`${TRANSLATIONS[lang].deepseekApiError}: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const lang = detectLanguage(req);
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = getSupabaseClient(authHeader, lang);
    
    const { productIds } = await req.json();
    
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return new Response(
        JSON.stringify({ error: TRANSLATIONS[lang].productIdsRequired }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = [];
    
    for (const productId of productIds) {
      try {
        // Fetch product details
        const { data: product, error: productError } = await supabase
          .from('shopify_products')
          .select('*')
          .eq('id', productId)
          .single();
        
        if (productError) throw productError;
        
        // Fetch variants to build optimized titles
        const { data: variants } = await supabase
          .from('product_variants')
          .select('*')
          .eq('product_id', productId);
        
        // Generate optimized title and description using DeepSeek
        const prompt = `
Given this product information:
Title: ${product.title}
Description: ${product.description || 'No description'}
Vendor: ${product.vendor || 'Unknown'}
Product Type: ${product.product_type || 'Unknown'}
Tags: ${product.tags || 'None'}
Variants: ${variants?.map(v => `${v.title} (${v.option1}${v.option2 ? ', ' + v.option2 : ''}${v.option3 ? ', ' + v.option3 : ''})`).join(', ') || 'No variants'}

Generate Google Shopping optimized content in JSON format:
{
  "optimized_title": "Product title with key attributes (max 150 chars)",
  "optimized_description": "Compelling description for Google Shopping (max 5000 chars)",
  "google_product_category": "Google Shopping category taxonomy",
  "google_brand": "Brand name"
}

Focus on making the title clear, descriptive, and include key attributes. The description should be compelling and highlight benefits.
`;

        const aiResponse = await callDeepSeek(prompt, lang);
        
        // Clean up AI response (remove markdown code blocks if present)
        let cleanedResponse = aiResponse.trim();
        if (cleanedResponse.startsWith('```json')) {
          cleanedResponse = cleanedResponse.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        } else if (cleanedResponse.startsWith('```')) {
          cleanedResponse = cleanedResponse.replace(/^```\n?/, '').replace(/\n?```$/, '');
        }
        
        const optimizedData = JSON.parse(cleanedResponse);
        
        // Update product with optimized data
        const updateData = {
          optimized_title: optimizedData.optimized_title,
          optimized_description: optimizedData.optimized_description,
          google_product_category: optimizedData.google_product_category,
          google_brand: optimizedData.google_brand || product.vendor,
        };
        
        const { error: updateError } = await supabase
          .from('shopify_products')
          .update(updateData)
          .eq('id', productId);
        
        if (updateError) throw updateError;
        
        results.push({ 
          productId, 
          status: 'success',
          optimizations: updateData
        });
      } catch (error) {
        console.error(`${TRANSLATIONS[lang].errorOptimizingProduct} ${productId}:`, error);
        results.push({ 
          productId, 
          status: 'error',
          error: error instanceof Error ? error.message : TRANSLATIONS[lang].unknownError
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const lang = detectLanguage(req);
    console.error(`${TRANSLATIONS[lang].errorInOptimize}:`, error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : TRANSLATIONS[lang].unknownError }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
