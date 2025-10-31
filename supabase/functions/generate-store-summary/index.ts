import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { storeId } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const deepseekApiKey = Deno.env.get("DEEPSEEK_API_KEY");
    
    if (!deepseekApiKey) {
      throw new Error("DEEPSEEK_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get store information
    const { data: store, error: storeError } = await supabase
      .from("shopify_connections")
      .select("*")
      .eq("id", storeId)
      .single();
    
    if (storeError) throw storeError;
    
    // Get products count and basic info
    const { data: products, error: productsError } = await supabase
      .from("shopify_products")
      .select("title, product_type, vendor")
      .eq("store_id", storeId)
      .limit(50);
    
    if (productsError) throw productsError;
    
    // Get collections count
    const { count: collectionsCount } = await supabase
      .from("shopify_collections")
      .select("*", { count: "exact", head: true })
      .eq("store_id", storeId);
    
    // Build context for DeepSeek
    const context = {
      storeName: store.store_name || store.store_url,
      storeUrl: store.store_url,
      productsCount: products?.length || 0,
      collectionsCount: collectionsCount || 0,
      productTypes: [...new Set(products?.map(p => p.product_type).filter(Boolean))],
      vendors: [...new Set(products?.map(p => p.vendor).filter(Boolean))],
    };
    
    // Call DeepSeek API
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${deepseekApiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "Tu es un expert en e-commerce. Génère un résumé concis et attractif d'une boutique en ligne en français, en 2-3 phrases maximum. Mets en avant les points forts et l'identité de la boutique."
          },
          {
            role: "user",
            content: `Génère un résumé de cette boutique e-commerce :
- Nom : ${context.storeName}
- URL : ${context.storeUrl}
- Nombre de produits : ${context.productsCount}
- Nombre de collections : ${context.collectionsCount}
- Types de produits : ${context.productTypes.join(", ")}
- Marques/Vendeurs : ${context.vendors.join(", ")}

Résumé (2-3 phrases max, focus sur l'identité et les points forts) :`
          }
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("DeepSeek API error:", response.status, errorText);
      throw new Error(`DeepSeek API error: ${response.status}`);
    }
    
    const data = await response.json();
    const summary = data.choices[0]?.message?.content || "Boutique e-commerce proposant une sélection de produits de qualité.";
    
    return new Response(
      JSON.stringify({ summary, context }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});