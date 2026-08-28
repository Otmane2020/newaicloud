import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { routeVision } from "../_shared/ai-router.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VisionRequest {
  imageUrl: string;
  productContext?: {
    title?: string;
    category?: string;
    type?: string;
  };
}

function cleanJSON(text: string): string {
  return text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

async function toDataUrl(imageUrl: string): Promise<string> {
  if (imageUrl.startsWith("data:image")) return imageUrl;

  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error(`Cannot fetch image: ${response.status}`);

  const mimeType = response.headers.get("content-type")?.split(";")[0] || "image/jpeg";
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return `data:${mimeType};base64,${btoa(binary)}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const body = await req.json().catch(() => ({}));
  if (body?.healthCheck === true) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { imageUrl, productContext } = body as VisionRequest;
    if (!imageUrl) throw new Error("imageUrl is required");

    const dataUrl = await toDataUrl(imageUrl);
    const context = productContext
      ? `Contexte produit: ${productContext.title || ""} ${productContext.category || ""} ${productContext.type || ""}`
      : "";

    const prompt = `
Analyse cette image d'un produit e-commerce. Observe réellement l'image : n'invente pas un attribut invisible.
${context}

Retourne STRICTEMENT un JSON valide sous cette forme :
{
  "visualAttributes": {
    "primaryColor": "string | null",
    "secondaryColors": ["string"],
    "materials": ["string"],
    "style": ["string"],
    "finish": "string | null",
    "texture": "string | null",
    "roomType": ["string"],
    "features": ["string"],
    "technicalDimensions": {
      "length": "number | null",
      "lengthUnit": "string | null",
      "width": "number | null",
      "widthUnit": "string | null",
      "height": "number | null",
      "heightUnit": "string | null",
      "diameter": "number | null",
      "diameterUnit": "string | null",
      "depth": "number | null",
      "depthUnit": "string | null",
      "weight": "number | null",
      "weightUnit": "string | null",
      "seatHeight": "number | null",
      "seatHeightUnit": "string | null"
    }
  },
  "visualContext": {
    "hasTechnicalSchema": false,
    "dimensionSource": "visible | estimated | none",
    "presentationQuality": 0.0,
    "craftmanshipLevel": "standard | premium | luxury",
    "lightingType": "string | null",
    "backgroundStyle": "white | neutral | contextualized | lifestyle | other",
    "whiteBackground": false,
    "shoppingImageReady": false
  },
  "confidence": 0.0
}

Règles :
- whiteBackground=true seulement si le fond principal est réellement blanc ou quasi blanc et propre autour du produit.
- shoppingImageReady=true seulement si l'image principale est exploitable pour un flux Shopping (produit visible, pas de montage trompeur, qualité suffisante).
- hasTechnicalSchema=true uniquement si des cotes/dimensions sont lisibles sur l'image.
- Les dimensions visibles ont dimensionSource="visible". N'estime pas de dimensions à partir de la photo seule.
- confidence est compris entre 0 et 1.
- Retourne uniquement le JSON, sans Markdown.
`;

    const routedVision = await routeVision([
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ], 1200);

    console.log(`[analyze-image-with-vision] provider=${routedVision.provider} model=${routedVision.model}`);

    let parsed: any;
    try {
      parsed = JSON.parse(cleanJSON(routedVision.content));
    } catch {
      console.error("❌ Invalid JSON from vision router:", routedVision.content.substring(0, 500));
      throw new Error("Vision provider returned invalid JSON");
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...parsed,
        ai_provider: routedVision.provider,
        ai_model: routedVision.model,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: any) {
    const message = err?.message || "Unknown error";
    console.error("❌ analyze-image-with-vision failed:", message);

    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
