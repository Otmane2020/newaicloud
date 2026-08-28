import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { generateCloudflareImage } from "../_shared/cloudflare-image.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  prompt: string;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  style?: string;
  healthCheck?: boolean;
}

const dimensions: Record<string, { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 },
  "16:9": { width: 1024, height: 576 },
  "9:16": { width: 576, height: 1024 },
  "4:3": { width: 1024, height: 768 },
  "3:4": { width: 768, height: 1024 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body: RequestBody = await req.json();
    if (body.healthCheck) {
      return new Response(JSON.stringify({ status: "ok", provider: "cloudflare-workers-ai", compatibilityEndpoint: "generate-nano-banana-image" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { prompt, aspectRatio = "16:9", style } = body;
    if (!prompt) throw new Error("Prompt is required");
    const dims = dimensions[aspectRatio] || dimensions["16:9"];
    const finalPrompt = `${prompt}${style ? `, ${style} style` : ""}. Professional photorealistic advertising/ecommerce image. No text, watermark or logo. Aspect ratio ${aspectRatio}.`;

    const generated = await generateCloudflareImage({
      prompt: finalPrompt,
      width: dims.width,
      height: dims.height,
      guidance: 9,
      numSteps: 20,
    });

    return new Response(JSON.stringify({
      success: true,
      imageUrl: generated.dataUrl,
      prompt: finalPrompt,
      aspectRatio,
      provider: generated.provider,
      model: generated.model,
      policy: "cloudflare-free-only",
      compatibilityEndpoint: "generate-nano-banana-image",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
