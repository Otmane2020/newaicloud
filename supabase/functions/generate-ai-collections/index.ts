import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Product {
  id: string;
  title: string;
  product_type: string | null;
  vendor: string | null;
  tags: string | null;
  image_url: string | null;
}

interface CollectionSuggestion {
  name: string;
  description: string;
  product_ids: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { storeId, language = 'fr' } = await req.json();

    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!DEEPSEEK_API_KEY && !LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch ALL products for the store (no limit)
    const { data: products, error: productsError } = await supabase
      .from("shopify_products")
      .select("id, title, product_type, vendor, tags, image_url")
      .eq("store_id", storeId)
      .eq("seller_id", user.id);

    if (productsError) {
      console.error("Error fetching products:", productsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch products" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({ error: "No products found to analyze" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📦 Analyzing ${products.length} products for collection grouping`);

    // Prepare product list for AI analysis - simplified for token efficiency
    const productList = products.map((p: Product) => ({
      id: p.id,
      title: p.title,
      type: p.product_type || '',
      vendor: p.vendor || '',
      tags: p.tags || ''
    }));

    // Calculate how many collections we need (target ~50-100 products per collection)
    const targetProductsPerCollection = 80;
    const estimatedCollections = Math.min(20, Math.max(5, Math.ceil(products.length / targetProductsPerCollection)));
    
    console.log(`📊 Target: ${estimatedCollections} collections for ${products.length} products`);

    // For large catalogs, send product summary instead of full list to avoid token overflow
    let productDataForAI: string;
    
    if (products.length > 200) {
      // Group products by type/vendor for summary
      const typeGroups: Record<string, { count: number; sample_ids: string[]; vendors: Set<string> }> = {};
      
      for (const p of productList) {
        const key = p.type || 'Non catégorisé';
        if (!typeGroups[key]) {
          typeGroups[key] = { count: 0, sample_ids: [], vendors: new Set() };
        }
        typeGroups[key].count++;
        if (typeGroups[key].sample_ids.length < 10) {
          typeGroups[key].sample_ids.push(p.id);
        }
        if (p.vendor) typeGroups[key].vendors.add(p.vendor);
      }
      
      const summary = Object.entries(typeGroups).map(([type, data]) => ({
        type,
        count: data.count,
        sample_ids: data.sample_ids,
        vendors: Array.from(data.vendors).slice(0, 5)
      }));
      
      productDataForAI = JSON.stringify({
        total_products: products.length,
        groups: summary,
        all_product_ids: productList.map(p => ({ id: p.id, type: p.type }))
      });
      
      console.log(`📝 Using summary mode: ${summary.length} product groups`);
    } else {
      productDataForAI = JSON.stringify(productList);
    }
    
    const systemPrompt = language === 'fr'
      ? `Tu es un expert en e-commerce et merchandising. Analyse les produits et regroupe-les en collections logiques.
         
         RÈGLES STRICTES:
         - Crée entre ${Math.max(5, estimatedCollections - 2)} et ${estimatedCollections + 2} collections
         - TOUS les produits doivent être assignés à au moins une collection
         - Chaque collection peut avoir jusqu'à 150 produits
         - Chaque collection doit avoir un nom court et accrocheur (max 30 caractères)
         - Description courte: 1 phrase SEO max 150 caractères
         - Réponds UNIQUEMENT en JSON valide, SANS markdown, SANS \`\`\`
         - IMPORTANT: Utilise les IDs de produits fournis EXACTEMENT comme dans les données
         
         FORMAT JSON STRICT:
         {"collections":[{"name":"Nom","description":"Description courte","product_ids":["id1","id2",...]}]}`
      : `You are an e-commerce and merchandising expert. Analyze products and group them into logical collections.
         
         STRICT RULES:
         - Create between ${Math.max(5, estimatedCollections - 2)} and ${estimatedCollections + 2} collections
         - ALL products must be assigned to at least one collection
         - Each collection can have up to 150 products
         - Each collection should have a short catchy name (max 30 chars)
         - Short description: 1 SEO sentence max 150 chars
         - Respond ONLY with valid JSON, NO markdown, NO \`\`\`
         - IMPORTANT: Use product IDs EXACTLY as provided in the data
         
         STRICT JSON FORMAT:
         {"collections":[{"name":"Name","description":"Short description","product_ids":["id1","id2",...]}]}`;

    const userPrompt = language === 'fr' 
      ? `Analyse ces ${products.length} produits et crée des collections qui couvrent TOUS les produits:\n${productDataForAI}`
      : `Analyze these ${products.length} products and create collections that cover ALL products:\n${productDataForAI}`;

    // Call DeepSeek or Lovable AI
    let aiResponse: string;
    
    if (DEEPSEEK_API_KEY) {
      const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.3,
          max_tokens: 8000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("DeepSeek error:", errorText);
        throw new Error("AI analysis failed");
      }

      const data = await response.json();
      aiResponse = data.choices[0].message.content;
    } else {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Lovable AI error:", errorText);
        throw new Error("AI analysis failed");
      }

      const data = await response.json();
      aiResponse = data.choices[0].message.content;
    }

    // Parse AI response
    let collectionsSuggestions: { collections: CollectionSuggestion[] };
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanedResponse = aiResponse.trim();
      
      // Remove markdown code blocks more robustly
      cleanedResponse = cleanedResponse.replace(/^```json\s*/i, '');
      cleanedResponse = cleanedResponse.replace(/^```\s*/i, '');
      cleanedResponse = cleanedResponse.replace(/\s*```$/i, '');
      cleanedResponse = cleanedResponse.trim();
      
      // Try to find JSON object if still not clean
      if (!cleanedResponse.startsWith('{')) {
        const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanedResponse = jsonMatch[0];
        }
      }
      
      console.log("Cleaned response preview:", cleanedResponse.substring(0, 200));
      collectionsSuggestions = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiResponse);
      console.error("Parse error:", parseError);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI suggestions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`AI suggested ${collectionsSuggestions.collections.length} collections`);

    // Create collections in database
    const createdCollections = [];
    
    for (const suggestion of collectionsSuggestions.collections) {
      // Generate a handle from the name
      const handle = suggestion.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      // Check if collection already exists
      const { data: existingCollection } = await supabase
        .from("shopify_collections")
        .select("id")
        .eq("store_id", storeId)
        .eq("user_id", user.id)
        .eq("handle", handle)
        .single();

      if (existingCollection) {
        console.log(`Collection ${suggestion.name} already exists, skipping`);
        continue;
      }

      // Get a representative product image for the collection
      let collectionImageUrl = null;
      if (suggestion.product_ids && suggestion.product_ids.length > 0) {
        const firstProductId = suggestion.product_ids[0];
        const product = products.find((p: Product) => p.id === firstProductId);
        if (product?.image_url) {
          collectionImageUrl = product.image_url;
        }
      }

      // Create the collection
      const { data: newCollection, error: insertError } = await supabase
        .from("shopify_collections")
        .insert({
          title: suggestion.name,
          handle: handle,
          body_html: `<p>${suggestion.description}</p>`,
          image_url: collectionImageUrl,
          image_alt: suggestion.name,
          user_id: user.id,
          store_id: storeId,
          shopify_collection_id: Math.floor(Math.random() * 1000000000), // Temporary ID for non-synced collections
        })
        .select()
        .single();

      if (insertError) {
        console.error(`Error creating collection ${suggestion.name}:`, insertError);
        continue;
      }

      // Update products with this collection ID
      if (suggestion.product_ids && suggestion.product_ids.length > 0) {
        for (const productId of suggestion.product_ids) {
          // Get current collection_ids
          const { data: productData } = await supabase
            .from("shopify_products")
            .select("collection_ids")
            .eq("id", productId)
            .single();

          if (productData) {
            const currentCollections = productData.collection_ids || [];
            if (!currentCollections.includes(newCollection.id)) {
              await supabase
                .from("shopify_products")
                .update({
                  collection_ids: [...currentCollections, newCollection.id]
                })
                .eq("id", productId);
            }
          }
        }
      }

      createdCollections.push({
        id: newCollection.id,
        name: suggestion.name,
        productCount: suggestion.product_ids?.length || 0
      });
    }

    console.log(`Created ${createdCollections.length} new collections`);

    return new Response(
      JSON.stringify({
        success: true,
        collections: createdCollections,
        message: language === 'fr' 
          ? `${createdCollections.length} collections créées avec succès`
          : `${createdCollections.length} collections created successfully`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-ai-collections:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
