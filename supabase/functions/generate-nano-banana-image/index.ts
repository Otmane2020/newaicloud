import "../_shared/strict-ai-generation.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
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

    // Use Lovable AI Gateway with Nano Banana model
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [
          {
            role: "user",
            content: finalPrompt
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Nano Banana Pro] API error:", response.status, errorText);
      
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      if (response.status === 402) {
        throw new Error("Insufficient credits. Please add credits to your workspace.");
      }
      
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("[Nano Banana Pro] Response received");

    // Extract image from Lovable AI response format
    let imageUrl: string | null = null;

    if (data.choices?.[0]?.message?.images?.[0]?.image_url?.url) {
      imageUrl = data.choices[0].message.images[0].image_url.url;
    }

    if (!imageUrl) {
      console.error("[Nano Banana Pro] No image in response:", JSON.stringify(data).slice(0, 500));
      throw new Error("No image generated in response");
    }

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
