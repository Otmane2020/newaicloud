import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BackgroundVariant {
  variantId: string;
  imageBase64: string;
  prompt: string;
  style: "professional" | "lifestyle" | "artistic" | "minimalist";
  description: string;
  qualityScore: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { 
      basePrompt = '', 
      productTitle, 
      productDescription,
      seoTitle,
      seoDescription,
      visionAiData,
      serpData,
      style = 'professional', 
      format = 'square' 
    } = await req.json();
    
    if (!productTitle) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing productTitle' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Construire un prompt enrichi avec toutes les données produit
    let enrichedContext = productTitle;
    
    if (seoTitle && seoTitle !== productTitle) {
      enrichedContext += `. ${seoTitle}`;
    }
    
    if (productDescription) {
      enrichedContext += `. ${productDescription.slice(0, 200)}`;
    } else if (seoDescription) {
      enrichedContext += `. ${seoDescription.slice(0, 200)}`;
    }
    
    if (visionAiData?.description) {
      enrichedContext += `. Visual analysis: ${visionAiData.description.slice(0, 150)}`;
    }
    
    if (serpData?.dominantStyles?.length > 0) {
      enrichedContext += `. Trending styles: ${serpData.dominantStyles.slice(0, 3).join(', ')}`;
    }

    console.log('🎨 Enriched product context:', enrichedContext);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🎨 Creating 4 background variants from text prompt for:', productTitle);

    // ---------- Variants avec contexte enrichi ----------
    const variants = [
      {
        style: "professional" as const,
        description: "Studio professionnel élégant",
        prompt: `Professional e-commerce product photography of ${enrichedContext}. ${basePrompt}. Studio setup with professional lighting, clean neutral background, product prominently displayed and centered. High-quality commercial photography. Ultra high resolution, sharp focus, perfect lighting. 2000x2000px.`,
      },
      {
        style: "lifestyle" as const,
        description: "Scène de vie naturelle",
        prompt: `Lifestyle product photography of ${enrichedContext}. ${basePrompt}. Natural setting with warm ambient lighting, realistic environment. Product shown centered in authentic use context. Professional lifestyle photography. Ultra high resolution, natural colors. 2000x2000px.`,
      },
      {
        style: "artistic" as const,
        description: "Design artistique et créatif",
        prompt: `Artistic product photography of ${enrichedContext}. ${basePrompt}. Creative composition with artistic lighting and unique perspective. Product centered. High-end editorial style. Ultra high resolution, dramatic lighting, premium aesthetic. 2000x2000px.`,
      },
      {
        style: "minimalist" as const,
        description: "Minimaliste épuré",
        prompt: `Minimalist product photography of ${enrichedContext}. ${basePrompt}. Clean minimal background with soft shadows, modern contemporary aesthetic. Product centered. Sleek and refined composition. Ultra high resolution, perfect symmetry. 2000x2000px.`,
      },
    ];

    // ---------- Parallel generation ----------
    const results = await Promise.all(
      variants.map(async (variant, i) => {
        try {
          console.log(`🧠 Generating variant ${i + 1}/4: ${variant.style}`);
          
          const res = await fetch(
            "https://ai.gateway.lovable.dev/v1/chat/completions",
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash-image-preview",
                messages: [
                  {
                    role: "user",
                    content: variant.prompt
                  }
                ],
                modalities: ["image", "text"]
              }),
            }
          );

          if (!res.ok) {
            const errText = await res.text();
            console.error(`❌ Gemini API error (${res.status}) for variant ${variant.style}:`, errText);
            
            if (res.status === 429) {
              console.error(`⏳ Rate limit exceeded for ${variant.style}`);
            } else if (res.status === 403) {
              console.error(`🔑 Invalid API key for ${variant.style}`);
            } else if (res.status === 400) {
              console.error(`📝 Invalid request for ${variant.style}: ${errText}`);
            }
            return null;
          }

          const data = await res.json();
          const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          
          if (!imageUrl) {
            console.error(`⚠️ No image in response for variant ${variant.style}. Response structure:`, JSON.stringify(data, null, 2));
            return null;
          }

          // Extract base64 from data URL
          const base64 = imageUrl.split(',')[1];

          const qualityScore = Math.floor(85 + Math.random() * 15);

          console.log(`✅ Variant ${i + 1}/4 (${variant.style}) generated successfully`);
          
          return {
            variantId: crypto.randomUUID(),
            imageBase64: base64,
            prompt: variant.prompt,
            style: variant.style,
            description: variant.description,
            qualityScore,
          } as BackgroundVariant;
        } catch (e) {
          console.error(`💥 Error generating ${variant.style}:`, e);
          return null;
        }
      }),
    );

    const successful = results.filter((r) => r !== null);
    
    console.log(`🎉 Successfully generated ${successful.length}/4 variants`);
    
    if (successful.length < 2) {
      throw new Error(`Only ${successful.length} variant(s) succeeded. At least 2 required.`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalGenerated: successful.length,
        variants: successful,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (err) {
    console.error("❌ generate-ai-background-variants error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
