import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EnrichmentRequest {
  productId: string;
}

async function callDeepSeek(messages: any[], maxTokens = 500) {
  const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');

  if (!deepseekApiKey) {
    throw new Error('DeepSeek API key not configured');
  }

  try {
    console.log(`🔁 DeepSeek API call`);

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepseekApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        temperature: 0.5,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API error:', errorText);
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('❌ Error calling DeepSeek:', error);
    throw error;
  }
}

function parseAIResponse(responseContent: string): any {
  console.log("🔧 Parsing AI response...");

  if (!responseContent || responseContent.trim() === '') {
    console.error("❌ Empty response content");
    return null;
  }

  try {
    return JSON.parse(responseContent);
  } catch (directError) {
    console.log("Direct parse failed, trying to extract JSON...");

    const patterns = [
      /```json\s*([\s\S]*?)\s*```/,
      /```\s*([\s\S]*?)\s*```/,
      /\{[\s\S]*\}/
    ];

    for (const pattern of patterns) {
      const match = responseContent.match(pattern);
      if (match) {
        try {
          const jsonContent = match[1] || match[0];
          console.log("✅ Extracted JSON with pattern");
          return JSON.parse(jsonContent);
        } catch (e) {
          console.log("Pattern failed, trying next...");
          continue;
        }
      }
    }

    try {
      const cleaned = responseContent
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
        .trim();
      return JSON.parse(cleaned);
    } catch (finalError) {
      console.error("❌ All parsing attempts failed");
      console.error("Raw content:", responseContent.substring(0, 200));
      return null;
    }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log("🎯 Edge Function: enrich-product called");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { productId }: EnrichmentRequest = await req.json();

    if (!productId) {
      throw new Error("Missing productId");
    }

    console.log(`📦 Processing product: ${productId}`);

    // Fetch product data
    const { data: product, error: fetchError } = await supabase
      .from('shopify_products')
      .select('*')
      .eq('id', productId)
      .single();

    if (fetchError || !product) {
      throw new Error(`Product not found: ${productId}`);
    }

    console.log(`✅ Product fetched: ${product.title}`);

    // Build AI prompt to detect attributes (NOT SEO fields)
    const prompt = `
Tu es un expert en analyse de produits e-commerce. Analyse ce produit et extrait UNIQUEMENT les attributs suivants (PAS de SEO).

PRODUIT:
- Titre: ${product.title || ''}
- Description: ${product.description || ''}
- Type: ${product.product_type || ''}
- Catégorie: ${product.category || ''}

INSTRUCTIONS:
1. Identifie la COULEUR principale (ex: "noir", "blanc", "bois naturel", "transparent")
2. Identifie le MATÉRIAU principal (ex: "bois", "métal", "verre", "tissu", "cuir")
3. Identifie la FORME (ex: "rectangulaire", "rond", "carré", "ovale")
4. Si l'information n'est pas disponible, utilise null

IMPORTANT: Ne génère PAS de titre SEO, meta description, tags ou alt text.

Réponds UNIQUEMENT en JSON valide:
{
  "ai_color": "couleur_principale",
  "ai_material": "matériau_principal",
  "ai_shape": "forme"
}`;

    console.log('🤖 Calling DeepSeek API for attribute detection...');
    
    const aiResponse = await callDeepSeek([
      {
        role: 'system',
        content: 'Tu es un expert en analyse de produits. Réponds UNIQUEMENT en JSON valide.'
      },
      {
        role: 'user',
        content: prompt
      }
    ], 300);

    console.log('✅ AI response received');

    const parsedData = parseAIResponse(aiResponse);

    if (!parsedData) {
      throw new Error('Failed to parse AI response');
    }

    console.log('📝 Parsed attributes:', parsedData);

    // Update ONLY AI attributes (not SEO fields)
    const { error: updateError } = await supabase
      .from('shopify_products')
      .update({
        ai_color: parsedData.ai_color || null,
        ai_material: parsedData.ai_material || null,
        ai_shape: parsedData.ai_shape || null,
        enrichment_status: 'enriched',
        last_enriched_at: new Date().toISOString(),
      })
      .eq('id', productId);

    if (updateError) {
      throw updateError;
    }

    console.log('✅ Product enriched successfully');

    // Increment usage counter
    const { data: { user } } = await supabase.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') || ''
    );

    if (user) {
      await supabase.rpc('increment_usage', {
        p_seller_id: user.id,
        p_field: 'optimizations_count',
        p_increment: 1
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        attributes: {
          ai_color: parsedData.ai_color,
          ai_material: parsedData.ai_material,
          ai_shape: parsedData.ai_shape,
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("❌ Error in enrich-product:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
