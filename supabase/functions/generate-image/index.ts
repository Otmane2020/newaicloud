import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { generateCloudflareImage } from "../_shared/cloudflare-image.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ratioDimensions: Record<string, { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 },
  "16:9": { width: 1024, height: 576 },
  "4:3": { width: 1024, height: 768 },
  "3:4": { width: 768, height: 1024 },
};

function dataUrlBytes(dataUrl: string): { bytes: Uint8Array; mime: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid generated image data");
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { bytes, mime: match[1] };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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

    const isArticle = Boolean(article_id);
    const finalAspectRatio = isArticle ? "16:9" : aspect_ratio;
    const dims = ratioDimensions[finalAspectRatio] || ratioDimensions["1:1"];
    const enhancedPrompt = `
Generate a professional ${isArticle ? "editorial/blog featured" : "ecommerce"} image.
Subject: ${prompt}
Style: ${style}.
${type === "white" ? "Use a clean pure white or very light neutral background." : "Use a natural premium lifestyle setting."}
Photorealistic, professional lighting and composition, no text, watermark, border or logo.
Aspect ratio ${finalAspectRatio}; output ${dims.width}x${dims.height}.
`.trim();

    const generated = await generateCloudflareImage({
      prompt: enhancedPrompt,
      width: dims.width,
      height: dims.height,
      guidance: 9,
      numSteps: 20,
    });

    let imageUrl = generated.dataUrl;
    let storageMetadata = null;

    if (collection_id || article_id) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey);
          const { bytes, mime } = dataUrlBytes(generated.dataUrl);
          const filename = `ai_gen_${collection_id || "product"}_${article_id || "img"}_${Date.now()}.png`;
          const { error } = await supabase.storage.from("generated-images").upload(filename, bytes, { contentType: mime });
          if (!error) {
            const { data } = supabase.storage.from("generated-images").getPublicUrl(filename);
            imageUrl = data.publicUrl;
            storageMetadata = { filename, bucket: "generated-images", uploaded_at: new Date().toISOString() };
          }
        }
      } catch (error) {
        console.warn("[generate-image] storage upload failed; returning data URL", error);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      image_url: imageUrl,
      metadata: {
        provider: generated.provider,
        model: generated.model,
        product_type,
        style,
        aspect_ratio: finalAspectRatio,
        resolution: `${dims.width}x${dims.height}`,
        generated_at: new Date().toISOString(),
        storage: storageMetadata,
        policy: "cloudflare-free-only",
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[generate-image] error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
