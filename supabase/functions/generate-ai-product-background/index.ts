import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerationRequest {
  imageUrl: string;
  productTitle: string;
  productId: string;
  imageId: string;
  prompt: string;
  enrichedPrompt?: string;
  style: "professional" | "lifestyle" | "minimalist" | "creative";
  format: "square" | "portrait" | "landscape";
  targetType: "main" | "variant";
  variantOptions?: string; // e.g., "Red - Large"
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Check usage limits first
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);

      if (user) {
        const currentMonth = new Date().toISOString().substring(0, 7) + "-01";
        const { data: usage } = await supabaseAdmin
          .from("usage_tracking")
          .select("optimizations_count")
          .eq("seller_id", user.id)
          .eq("month", currentMonth)
          .maybeSingle();

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("subscription_status, current_plan_id")
          .eq("id", user.id)
          .single();

        const { data: plan } = await supabaseAdmin
          .from("subscription_plans")
          .select("max_optimizations_monthly, trial_max_optimizations")
          .eq("id", profile?.current_plan_id || "trial")
          .single();

        const currentUsage = usage?.optimizations_count || 0;
        const maxOptimizations =
          profile?.subscription_status === "trialing"
            ? plan?.trial_max_optimizations || 50
            : plan?.max_optimizations_monthly || 999999;

        console.log(`[ai-bg-gen] Usage: ${currentUsage}/${maxOptimizations}`);

        if (currentUsage >= maxOptimizations) {
          console.error(`[ai-bg-gen] LIMIT REACHED`);
          return new Response(
            JSON.stringify({
              success: false,
              error: "LIMIT_REACHED",
              message: "Limite d'optimisations atteinte",
              usage: currentUsage,
              limit: maxOptimizations,
            }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Increment usage immediately (8 credits per background generation)
        const AI_BG_COST = 8;
        await supabaseAdmin.rpc("increment_usage", {
          p_seller_id: user.id,
          p_field: "optimizations_count",
          p_increment: AI_BG_COST,
        });
        console.log(`[ai-bg-gen] Usage incremented: +${AI_BG_COST}`);
      }
    }

    const {
      imageUrl,
      productTitle,
      productId,
      imageId,
      prompt,
      enrichedPrompt,
      style,
      format,
      targetType,
      variantOptions,
    } = (await req.json()) as GenerationRequest;

    if (!imageUrl || !productTitle || !prompt || !productId || !imageId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`🎨 Generating AI background for: ${productTitle} (${targetType})`);
    if (variantOptions) {
      console.log(`   Variant: ${variantOptions}`);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Build comprehensive prompt based on configuration
    const isMainImage = targetType === "main";
    const variantInfo = variantOptions ? ` (Variant: ${variantOptions})` : "";

    const styleDescriptions = {
      professional: "Clean studio lighting, neutral backdrop, professional e-commerce quality",
      lifestyle: "Natural environment, lifestyle setting, warm and inviting atmosphere",
      minimalist: "Modern minimalist aesthetic, clean geometric shapes, neutral tones",
      creative: "Artistic composition, creative lighting, unique and engaging perspective",
    };

    const formatSpecs = {
      square: "1024x1024 square format",
      portrait: "768x1024 portrait orientation (3:4)",
      landscape: "1024x768 landscape orientation (4:3)",
    };

    const comprehensivePrompt = `
You are a professional e-commerce product photographer creating a stunning product image.

PRODUCT: ${productTitle}${variantInfo}
IMAGE TYPE: ${isMainImage ? "MAIN PRODUCT IMAGE" : "VARIANT IMAGE"}
STYLE: ${styleDescriptions[style]}
FORMAT: ${formatSpecs[format]}

USER REQUEST: ${prompt}

CRITICAL REQUIREMENTS:
${
  isMainImage
    ? `
1. MAIN IMAGE REQUIREMENTS:
   - Product MUST be perfectly centered and sharp
   - Product occupies 70-80% of the frame
   - Product faces camera directly
   - All product details clearly visible
   - Preserve all textures, colors, and materials
   - Professional product listing quality
   - Natural shadows for depth
`
    : `
1. VARIANT IMAGE REQUIREMENTS:
   - Product prominently displayed
   - Clear visibility of variant-specific features (color, size, pattern)
   - Maintain product integrity and details
   - Professional gallery-quality image
   - Show product in context if applicable
`
}

2. BACKGROUND & LIGHTING:
   - ${prompt}
   - ${styleDescriptions[style]}
   - Professional color grading
   - Balanced exposure and contrast
   - No watermarks, text, or logos

3. TECHNICAL SPECS:
   - Format: ${formatSpecs[format]}
   - High resolution and sharp focus
   - Professional post-processing
   - E-commerce ready quality

4. CREATIVE EXECUTION:
   - Match mood to product category
   - Background enhances, never distracts
   - Professional photography aesthetic
   - Suitable for ${isMainImage ? "main product listing (Shopify/Amazon)" : "product gallery"}

RESULT: A stunning, professional product photo that looks like it was created by a top e-commerce photographer.
    `.trim();

    console.log("📝 Sending prompt to Lovable AI...");

    // Call Lovable AI with image editing
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: comprehensivePrompt },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Lovable AI error (${response.status}):`, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "RATE_LIMIT",
            message: "Limite de taux atteinte, veuillez réessayer dans quelques instants",
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "PAYMENT_REQUIRED",
            message: "Crédits Lovable AI épuisés",
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`Lovable AI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const generatedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!generatedImageUrl) {
      console.error("⚠️ No image in Lovable AI response:", JSON.stringify(data, null, 2));
      throw new Error("No image generated by Lovable AI");
    }

    console.log("✅ Successfully generated AI background");

    // Save to product_image_history if user is authenticated
    if (authHeader) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);

      if (user) {
        try {
          // Get next version number
          const { data: versionData } = await supabaseAdmin
            .rpc('get_next_image_version', { p_image_id: imageId });
          
          const versionNumber = versionData || 1;

          // Mark all previous versions as not current
          await supabaseAdmin
            .from('product_image_history')
            .update({ is_current: false })
            .eq('image_id', imageId);

          // Insert new history entry
          await supabaseAdmin
            .from('product_image_history')
            .insert({
              product_id: productId,
              image_id: imageId,
              user_id: user.id,
              optimization_type: 'ai_background',
              original_url: imageUrl,
              optimized_url: generatedImageUrl,
              version_number: versionNumber,
              is_current: true,
              ai_model: 'google/gemini-2.5-flash-image-preview',
              ai_prompt: enrichedPrompt || prompt,
              metadata: {
                style,
                format,
                targetType,
                variantOptions,
              }
            });

          console.log("✅ Saved to product_image_history");
        } catch (error) {
          console.error("⚠️ Failed to save to history:", error);
          // Continue even if history save fails
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: generatedImageUrl,
        metadata: {
          productTitle,
          style,
          format,
          targetType,
          variantOptions,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    console.error("❌ generate-ai-product-background error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
