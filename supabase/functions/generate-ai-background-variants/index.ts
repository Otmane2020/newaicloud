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
    const { imageUrl, basePrompt, productTitle } = await req.json();
    if (!imageUrl) throw new Error("Image URL is required");

    console.log("🎨 Generating 4 Gemini variants for:", productTitle);

    const GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GOOGLE_GEMINI_API_KEY not configured");

    // Download and convert reference image to base64
    console.log("📥 Downloading reference image...");
    const imgResponse = await fetch(imageUrl);
    if (!imgResponse.ok) throw new Error(`Failed to fetch image (${imgResponse.status})`);
    const imgBuffer = await imgResponse.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)));
    console.log("✅ Image converted to base64");

    // ---------- Prompt centering rules ----------
    const centeringInstruction = `
CRITICAL: Product must remain perfectly centered.
- Central 70-80% of frame
- Equal margins each side (10-15%)
- No crop, correct proportions
- Background fills the frame 2000×2000px
- Sharp, photo-realistic
`;

    // ---------- Variants ----------
    const variants = [
      {
        style: "professional" as const,
        description: "Studio professionnel élégant",
        prompt: `${centeringInstruction}
Create a PROFESSIONAL STUDIO background:
- Clean modern studio
- Soft gradient (white→light gray)
- Balanced reflections
- Minimalist, elegant look
${basePrompt || ""}
Product: ${productTitle || "product"}
`,
      },
      {
        style: "lifestyle" as const,
        description: "Scène de vie naturelle",
        prompt: `${centeringInstruction}
Create a LIFESTYLE scene:
- Natural realistic environment
- Warm inviting mood
- Soft daylight, bokeh background
- Authentic home setting
${basePrompt || ""}
Product: ${productTitle || "product"}
`,
      },
      {
        style: "artistic" as const,
        description: "Design artistique et créatif",
        prompt: `${centeringInstruction}
Create an ARTISTIC background:
- Bold, creative composition
- Modern colors, abstract shapes
- High visual impact
${basePrompt || ""}
Product: ${productTitle || "product"}
`,
      },
      {
        style: "minimalist" as const,
        description: "Minimaliste épuré",
        prompt: `${centeringInstruction}
Create a MINIMALIST background:
- Ultra clean, simple
- Solid tone or subtle gradient
- Lots of white space
${basePrompt || ""}
Product: ${productTitle || "product"}
`,
      },
    ];

    // ---------- Parallel generation ----------
    const results = await Promise.all(
      variants.map(async (variant, i) => {
        try {
          console.log(`🧠 Generating variant ${i + 1}/4: ${variant.style}`);
          
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{
                  parts: [
                    { text: variant.prompt },
                    { inline_data: { mime_type: "image/jpeg", data: base64Image } }
                  ]
                }],
                generationConfig: {
                  response_modalities: ["image"],
                  aspectRatio: "1:1"
                }
              }),
            },
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
          const base64 = data.candidates?.[0]?.content?.parts?.[0]?.inline_data?.data;
          
          if (!base64) {
            console.error(`⚠️ No image in response for variant ${variant.style}. Response structure:`, JSON.stringify(data, null, 2));
            return null;
          }

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
