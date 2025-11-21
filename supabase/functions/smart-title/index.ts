import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SmartTitleRequest {
  productId: string;
  language?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { productId, language = 'fr' }: SmartTitleRequest = await req.json();

    if (!productId) {
      throw new Error('Product ID is required');
    }

    console.log(`[SMART-TITLE] Processing product: ${productId}`);

    // Fetch product with images
    const { data: product, error: productError } = await supabase
      .from('shopify_products')
      .select(`
        *,
        product_images (
          id,
          src,
          position
        )
      `)
      .eq('id', productId)
      .single();

    if (productError || !product) {
      throw new Error('Product not found');
    }

    // Step 1: Analyze title/description with DeepSeek
    console.log('[SMART-TITLE] Step 1: DeepSeek analysis');
    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
    const deepseekPrompt = `Analyze this e-commerce product and extract key selling points:

Title: ${product.title}
Description: ${product.body_html || 'No description'}
Product Type: ${product.product_type || 'Unknown'}

Extract:
1. Core product category/type
2. Key features and materials
3. Target use case
4. Unique selling points

Return ONLY a JSON object with these fields:
{
  "category": "main product type",
  "features": ["feature1", "feature2", ...],
  "materials": ["material1", "material2", ...],
  "use_case": "primary use",
  "selling_points": ["point1", "point2", ...]
}`;

    const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepseekApiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: deepseekPrompt }],
        temperature: 0.3,
      }),
    });

    if (!deepseekResponse.ok) {
      const errorText = await deepseekResponse.text();
      console.error('[SMART-TITLE] DeepSeek error:', deepseekResponse.status, errorText);
      throw new Error(`DeepSeek API error: ${deepseekResponse.status}`);
    }

    const deepseekData = await deepseekResponse.json();
    
    if (!deepseekData.choices || !deepseekData.choices[0] || !deepseekData.choices[0].message) {
      console.error('[SMART-TITLE] Invalid DeepSeek response:', deepseekData);
      throw new Error('Invalid response from DeepSeek API');
    }

    const deepseekAnalysis = JSON.parse(
      deepseekData.choices[0].message.content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
    );

    console.log('[SMART-TITLE] DeepSeek analysis:', deepseekAnalysis);

    // Step 2: Analyze images with Gemini Vision
    console.log('[SMART-TITLE] Step 2: Gemini Vision analysis');
    const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    const images = product.product_images || [];
    let visionAnalysis = null;

    if (images.length > 0 && geminiApiKey) {
      const primaryImage = images.sort((a: any, b: any) => (a.position || 0) - (b.position || 0))[0];
      
      try {
        const imageResponse = await fetch(primaryImage.src);
        const imageBuffer = await imageResponse.arrayBuffer();
        const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));

        const visionPrompt = `Analyze this product image and describe:
1. Visual style and design
2. Color palette
3. Key visual features
4. Material appearance
5. Shape and form

Be specific and descriptive in ${language === 'fr' ? 'French' : 'English'}.`;

        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: visionPrompt },
                  {
                    inline_data: {
                      mime_type: 'image/jpeg',
                      data: base64Image,
                    },
                  },
                ],
              }],
            }),
          }
        );

        if (!geminiResponse.ok) {
          const errorText = await geminiResponse.text();
          console.error('[SMART-TITLE] Gemini Vision error:', geminiResponse.status, errorText);
          throw new Error(`Gemini Vision API error: ${geminiResponse.status}`);
        }

        const geminiData = await geminiResponse.json();
        visionAnalysis = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || null;
        console.log('[SMART-TITLE] Vision analysis:', visionAnalysis);
      } catch (visionError) {
        console.error('[SMART-TITLE] Vision analysis failed:', visionError);
      }
    }

    // Step 3: Generate optimized title with Google Gemini
    console.log('[SMART-TITLE] Step 3: Generate optimized title');
    
    const titlePrompt = `You are an expert e-commerce SEO copywriter. Generate an optimized product title based on this analysis:

**Text Analysis (DeepSeek):**
- Category: ${deepseekAnalysis.category}
- Features: ${deepseekAnalysis.features?.join(', ')}
- Materials: ${deepseekAnalysis.materials?.join(', ')}
- Use Case: ${deepseekAnalysis.use_case}
- Selling Points: ${deepseekAnalysis.selling_points?.join(', ')}

${visionAnalysis ? `**Visual Analysis (Gemini Vision):**
${visionAnalysis}` : ''}

**Current Title:** ${product.title}

**Language:** ${language === 'fr' ? 'French' : 'English'}

**Requirements:**
- Maximum 60 characters
- Include primary keyword at the beginning
- Include 2-3 key attributes (material, color, size, style)
- Natural and appealing to customers
- SEO optimized for search engines
- In ${language === 'fr' ? 'French' : 'English'}

Generate ONLY the optimized title, no explanations.`;

    const geminiTitleResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: titlePrompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 100,
          }
        })
      }
    );

    if (!geminiTitleResponse.ok) {
      const errorText = await geminiTitleResponse.text();
      console.error('[SMART-TITLE] Google Gemini error:', geminiTitleResponse.status, errorText);
      throw new Error(`Google Gemini error: ${geminiTitleResponse.status}`);
    }

    const geminiTitleData = await geminiTitleResponse.json();
    console.log('[SMART-TITLE] Google Gemini response:', JSON.stringify(geminiTitleData));
    
    if (!geminiTitleData.candidates || !geminiTitleData.candidates[0] || !geminiTitleData.candidates[0].content) {
      console.error('[SMART-TITLE] Invalid Google Gemini response structure:', geminiTitleData);
      throw new Error('Invalid response from Google Gemini');
    }

    const optimizedTitle = geminiTitleData.candidates[0].content.parts[0].text.trim()
      .replace(/^["']|["']$/g, '')
      .slice(0, 60);

    console.log('[SMART-TITLE] Optimized title:', optimizedTitle);

    // Step 4: Update product
    const { error: updateError } = await supabase
      .from('shopify_products')
      .update({
        title: optimizedTitle,
        optimization_count: (product.optimization_count || 0) + 1,
        last_optimization_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId);

    if (updateError) {
      throw updateError;
    }

    // Track usage
    await supabase.rpc('increment_usage', {
      p_seller_id: user.id,
      p_field: 'optimizations_count',
      p_increment: 1,
    });

    return new Response(
      JSON.stringify({
        success: true,
        originalTitle: product.title,
        optimizedTitle,
        deepseekAnalysis,
        visionAnalysis,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[SMART-TITLE] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
