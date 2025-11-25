import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Safe HealthCheck handler
  const body = await req.json().catch(() => ({}));
  if (body?.healthCheck === true) {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
  }

  try {
    const { imageUrls } = body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    console.log(`🔍 Analyzing ${imageUrls.length} images for technical dimensions...`);

    const results = await Promise.all(
      imageUrls.map(async (url: string) => {
        try {
          const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: `Analyze this image and determine if it contains technical dimensions, measurements, or engineering schematics.

If YES (technical drawing detected):
- Extract ALL visible dimensions and measurements with their units (mm, cm, etc.)
- Describe the views shown (front, side, top, perspective, etc.)
- List all labeled measurements
- Indicate if it's a 2D blueprint, 3D schematic, or assembly diagram

If NO (regular product photo):
- Simply respond with "NOT_TECHNICAL"

Format your response as JSON:
{
  "isTechnical": true/false,
  "type": "blueprint|schematic|assembly|NOT_TECHNICAL",
  "views": ["front", "side", "top"],
  "dimensions": [
    {"measurement": "899", "unit": "mm", "label": "width"},
    {"measurement": "1355", "unit": "mm", "label": "height"}
  ],
  "description": "Detailed description of what technical information is shown"
}`
                    },
                    {
                      type: "image_url",
                      image_url: { url }
                    }
                  ]
                }
              ],
              temperature: 0.3,
              max_tokens: 1000,
            }),
          });

          if (!response.ok) {
            console.error(`❌ Vision API error for ${url}:`, response.status);
            return { url, isTechnical: false, error: true };
          }

          const data = await response.json();
          const content = data?.choices?.[0]?.message?.content || "";
          
          // Try to parse JSON response
          try {
            const parsed = JSON.parse(content);
            return {
              url,
              ...parsed
            };
          } catch {
            // If not JSON, check if it says NOT_TECHNICAL
            if (content.includes("NOT_TECHNICAL")) {
              return { url, isTechnical: false };
            }
            // Otherwise assume it's technical but couldn't parse
            return { 
              url, 
              isTechnical: true, 
              description: content,
              type: "unknown"
            };
          }
        } catch (error) {
          console.error(`❌ Error analyzing image ${url}:`, error);
          return { url, isTechnical: false, error: true };
        }
      })
    );

    // Separate technical from regular images
    const technicalImages = results.filter(r => r.isTechnical);
    const regularImages = results.filter(r => !r.isTechnical);

    console.log(`✅ Analysis complete: ${technicalImages.length} technical, ${regularImages.length} regular`);

    return new Response(
      JSON.stringify({
        success: true,
        technical: technicalImages,
        regular: regularImages,
        summary: {
          totalAnalyzed: results.length,
          technicalCount: technicalImages.length,
          regularCount: regularImages.length,
        }
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("❌ Error in analyze-dimension-images:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

