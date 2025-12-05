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

    const GOOGLE_GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!GOOGLE_GEMINI_API_KEY) {
      throw new Error("GOOGLE_GEMINI_API_KEY not configured");
    }

    const { prompt, aspectRatio = "16:9", style } = body;

    if (!prompt) {
      throw new Error("Prompt is required");
    }

    console.log(`[Nano Banana Pro] Generating image - Prompt: ${prompt.slice(0, 50)}..., Aspect: ${aspectRatio}`);

    // Build enhanced prompt
    let enhancedPrompt = prompt;
    if (style) {
      enhancedPrompt = `${prompt}, ${style} style`;
    }

    // Use Gemini's image generation model (google/gemini-2.5-flash-image)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${GOOGLE_GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Generate a high-quality image: ${enhancedPrompt}. Aspect ratio: ${aspectRatio}. Make it professional, visually stunning, and suitable for advertising.`
                }
              ]
            }
          ],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Nano Banana Pro] API error:", errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("[Nano Banana Pro] Response received");

    // Extract image from response
    let imageData: string | null = null;
    let mimeType = "image/png";

    if (data.candidates?.[0]?.content?.parts) {
      for (const part of data.candidates[0].content.parts) {
        if (part.inlineData) {
          imageData = part.inlineData.data;
          mimeType = part.inlineData.mimeType || "image/png";
          break;
        }
      }
    }

    if (!imageData) {
      // Try alternative response format
      if (data.images?.[0]) {
        imageData = data.images[0];
      } else {
        console.error("[Nano Banana Pro] No image in response:", JSON.stringify(data).slice(0, 500));
        throw new Error("No image generated in response");
      }
    }

    // Convert to data URL
    const imageUrl = `data:${mimeType};base64,${imageData}`;

    console.log("[Nano Banana Pro] Image generated successfully");

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl,
        prompt: enhancedPrompt,
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
