import "../_shared/strict-ai-generation.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { generateCloudflareImage } from "../_shared/cloudflare-image.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ===== MAIN FUNCTION =====
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      prompt,
      article_id,
      collection_id,
      product_type,
      style = "professional",
      type = "white",
      aspect_ratio = "1:1",
    } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- CONFIG ---

    console.log("🧠 Generating image for:", prompt);

    // Determine if it's for a blog article (16:9) or product/collection (1:1)
    const isArticle = !!article_id;
    const finalAspectRatio = isArticle ? "16:9" : aspect_ratio;
    const resolution = isArticle ? "1920x1080" : "1024x1024";

    // --- SIMPLIFIED PROMPT ---
    const enhancedPrompt = `Generate a professional ${isArticle ? 'blog featured' : 'product'} image.

${prompt}

Requirements:
- Aspect ratio: ${finalAspectRatio}
- High resolution: ${resolution}
- ${type === "white" ? "Pure white background" : "Natural lifestyle setting"}
- Professional lighting and composition
- No text, watermarks, or borders`.trim();

    // --- CLOUDFLARE WORKERS AI IMAGE GENERATION ---
    const targetDims = isArticle ? { width: 1344, height: 768 } : { width: 1024, height: 1024 };
    const generated = await generateCloudflareImage({
      prompt: enhancedPrompt,
      width: targetDims.width,
      height: targetDims.height,
    });

    if (!generated?.imageUrl) {
      return new Response(
        JSON.stringify({ success: false, error: "Cloudflare Workers AI image generation failed or is not configured." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const imageUrl = generated.imageUrl;

    // Extract base64 from data URL (format: data:image/png;base64,...)
    const base64Match = imageUrl.match(/data:image\/[^;]+;base64,(.+)/);
    const base64Data = base64Match ? base64Match[1] : imageUrl;

    const imageBuffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    // --- SUPABASE UPLOAD ---
    let publicUrl = null;
    let storageMetadata = null;

    if (collection_id || article_id) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const filename = `ai_gen_${collection_id || "product"}_${article_id || "img"}_${Date.now()}.png`;

        const { error: uploadError } = await supabase.storage.from("generated-images").upload(filename, imageBuffer, {
          contentType: "image/png",
        });

        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("generated-images").getPublicUrl(filename);
          publicUrl = urlData.publicUrl;
          storageMetadata = {
            filename,
            bucket: "generated-images",
            uploaded_at: new Date().toISOString(),
          };
          console.log("☁️ Upload réussi:", filename);
        } else {
          console.error("Erreur upload Supabase:", uploadError);
        }
      }
    }

    // --- SUCCESS RESPONSE ---
    return new Response(
      JSON.stringify({
        success: true,
        image_url: publicUrl || imageUrl,
        metadata: {
          model: generated.model,
          product_type,
          style,
          aspect_ratio: finalAspectRatio,
          resolution: resolution,
          generated_at: new Date().toISOString(),
          storage: storageMetadata,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("❌ Image generation error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        suggestion: "Vérifiez votre prompt ou essayez un texte plus précis (couleur, matériau, ambiance).",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
