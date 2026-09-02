import "../_shared/strict-ai-generation.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { generateCloudflareImage } from "../_shared/cloudflare-image.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NanoBananaRequest {
  prompt: string;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  style?: string;
  healthCheck?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: NanoBananaRequest = await req.json();

    if (body.healthCheck) {
      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    const { prompt, aspectRatio = "16:9", style } = body;

    if (!prompt) {
      throw new Error("Prompt is required");
    }

    console.log(`[Nano Banana Pro] Generating image - Prompt: ${prompt.slice(0, 50)}..., Aspect: ${aspectRatio}`);

    // Build enhanced prompt with aspect ratio instructions
    let enhancedPrompt = prompt;
    if (style) {
      enhancedPrompt = `${prompt}, ${style} style`;
    }
    
    // Add aspect ratio instruction
    const aspectInstructions: Record<string, string> = {
      "1:1": "Create a square image (1:1 aspect ratio)",
      "16:9": "Create a widescreen landscape image (16:9 aspect ratio)",
      "9:16": "Create a vertical portrait image (9:16 aspect ratio)",
      "4:3": "Create a standard landscape image (4:3 aspect ratio)",
      "3:4": "Create a standard portrait image (3:4 aspect ratio)",
    };

    const finalPrompt = `${enhancedPrompt}. ${aspectInstructions[aspectRatio] || ""}. High quality, professional, visually stunning, suitable for advertising.`;

    const dimensions: Record<string, { width: number; height: number }> = {
      "1:1": { width: 1024, height: 1024 },
      "16:9": { width: 1344, height: 768 },
      "9:16": { width: 768, height: 1344 },
      "4:3": { width: 1024, height: 768 },
      "3:4": { width: 768, height: 1024 },
    };
    const dims = dimensions[aspectRatio] || dimensions["16:9"];
    const generated = await generateCloudflareImage({
      prompt: finalPrompt,
      width: dims.width,
      height: dims.height,
    });
    if (!generated?.imageUrl) {
      throw new Error("Cloudflare Workers AI image generation failed or is not configured");
    }
    const imageUrl = generated.imageUrl;

    console.log("[Nano Banana Pro] Image generated successfully");

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl,
        prompt: finalPrompt,
        aspectRatio,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("[Nano Banana Pro] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate image";

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
