import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { routeVision } from "../_shared/ai-router.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VISION_RUNTIME_REVISION = "2026-08-28-openrouter-free-fallback";

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

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeVisionError(message: string): { error: string; message: string } {
  const lower = message.toLowerCase();

  if (lower.includes("429") || lower.includes("rate limit")) {
    return { error: "VISION_RATE_LIMITED", message: "Image analysis is temporarily rate limited. Please retry shortly." };
  }
  if (lower.includes("402") || lower.includes("payment") || lower.includes("billing")) {
    return { error: "VISION_PAYMENT_REQUIRED", message: "Image analysis is temporarily unavailable because provider billing is required." };
  }
  if (lower.includes("401") || lower.includes("403") || lower.includes("access denied") || lower.includes("unauthorized")) {
    return { error: "VISION_ACCESS_DENIED", message: "The image analysis provider rejected the request." };
  }
  if (lower.includes("cannot fetch image") || lower.includes("image fetch")) {
    return { error: "VISION_IMAGE_FETCH_FAILED", message: "The product image could not be downloaded for analysis." };
  }
  if (lower.includes("invalid json")) {
    return { error: "VISION_INVALID_RESPONSE", message: "The image analysis provider returned an invalid response." };
  }
  if (lower.includes("no ai provider is available")) {
    return { error: "VISION_PROVIDER_UNAVAILABLE", message: "No configured vision provider is currently available." };
  }

  return { error: "VISION_FAILED", message: "Image analysis could not be completed." };
}

async function toDataUrl(imageUrl: string): Promise<string> {
  if (imageUrl.startsWith("data:image")) return imageUrl;

  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error(`Cannot fetch image: ${response.status}`);

  const mimeType = response.headers.get("content-type")?.split(";")[0] || "image/jpeg";
  if (!mimeType.startsWith("image/")) throw new Error("Cannot fetch image: invalid content type");

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
    return jsonResponse({ ok: true, revision: VISION_RUNTIME_REVISION });
  }

  try {
    const { imageUrl, productContext } = body as VisionRequest;
    if (!imageUrl) {
      return jsonResponse({
        success: false,
        error: "VISION_IMAGE_REQUIRED",
        message: "An image is required for analysis.",
        revision: VISION_RUNTIME_REVISION,
      });
    }

    let dataUrl: string;
    try {
      dataUrl = await toDataUrl(imageUrl);
    } catch (error: any) {
      const normalized = normalizeVisionError(error?.message || "Cannot fetch image");
      console.error("❌ analyze-image-with-vision image fetch failed:", error);
      return jsonResponse({ success: false, ...normalized, revision: VISION_RUNTIME_REVISION });
    }

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

    let routedVision;
    try {
      routedVision = await routeVision([
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ], 1200);
    } catch (error: any) {
      const normalized = normalizeVisionError(error?.message || "Vision provider unavailable");
      console.error("❌ analyze-image-with-vision provider failed:", error);
      return jsonResponse({ success: false, ...normalized, revision: VISION_RUNTIME_REVISION });
    }

    console.log(`[analyze-image-with-vision] provider=${routedVision.provider} model=${routedVision.model}`);

    try {
      const parsed = JSON.parse(cleanJSON(routedVision.content));
      return jsonResponse({
        success: true,
        ...parsed,
        ai_provider: routedVision.provider,
        ai_model: routedVision.model,
        revision: VISION_RUNTIME_REVISION,
      });
    } catch (error) {
      console.error("❌ Invalid JSON from vision router:", routedVision.content.substring(0, 500), error);
      return jsonResponse({
        success: false,
        error: "VISION_INVALID_RESPONSE",
        message: "The image analysis provider returned an invalid response.",
        revision: VISION_RUNTIME_REVISION,
      });
    }
  } catch (error: any) {
    const normalized = normalizeVisionError(error?.message || "Unknown error");
    console.error("❌ analyze-image-with-vision failed:", error);

    // Provider failures are application-level failures, not Edge runtime failures.
    // Always return HTTP 200 so Supabase/Lovable does not surface a blank-screen runtime error.
    return jsonResponse({ success: false, ...normalized, revision: VISION_RUNTIME_REVISION });
  }
});