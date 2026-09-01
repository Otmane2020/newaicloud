import "../_shared/strict-ai-generation.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_SOURCE_BYTES = 15 * 1024 * 1024;

const withTimeout = async (url: string, init: RequestInit, timeoutMs: number) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
};

const normalizeDataUrl = (value: unknown): string | null => {
  if (typeof value !== "string" || !value.trim()) return null;
  if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(value)) return value;
  return null;
};

const downloadImageAsDataUrl = async (imageUrl: string): Promise<string> => {
  const inline = normalizeDataUrl(imageUrl);
  if (inline) return inline;

  const response = await withTimeout(imageUrl, { method: "GET" }, 20_000);
  if (!response.ok) throw new Error(`Unable to read the product image (${response.status})`);

  const contentType = (response.headers.get("content-type") || "image/jpeg").split(";")[0];
  if (!contentType.startsWith("image/")) throw new Error("The selected product source is not a valid image");

  const buffer = await response.arrayBuffer();
  if (!buffer.byteLength) throw new Error("The selected product image is empty");
  if (buffer.byteLength > MAX_SOURCE_BYTES) throw new Error("The selected product image is too large. Please use an image under 15 MB");

  return `data:${contentType};base64,${arrayBufferToBase64(buffer)}`;
};

const dataUrlParts = (dataUrl: string): { mimeType: string; base64: string } | null => {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
};

const partToDataUrl = (part: any): string | null => {
  const direct = normalizeDataUrl(part?.image_url?.url) || normalizeDataUrl(part?.url);
  if (direct) return direct;

  const inline = part?.inline_data || part?.inlineData;
  if (inline?.data) {
    return `data:${inline.mime_type || inline.mimeType || "image/png"};base64,${inline.data}`;
  }

  if (part?.b64_json) return `data:image/png;base64,${part.b64_json}`;
  return null;
};

const extractGeneratedImage = (payload: any): string | null => {
  const directCandidates = [
    payload?.imageUrl,
    payload?.image_url,
    payload?.url,
    payload?.data?.[0]?.url,
    payload?.data?.[0]?.b64_json ? `data:image/png;base64,${payload.data[0].b64_json}` : null,
    payload?.choices?.[0]?.message?.images?.[0]?.image_url?.url,
    payload?.choices?.[0]?.message?.images?.[0]?.url,
    payload?.choices?.[0]?.images?.[0]?.image_url?.url,
    payload?.choices?.[0]?.images?.[0]?.url,
  ];

  for (const candidate of directCandidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate;
  }

  const messageContent = payload?.choices?.[0]?.message?.content;
  if (Array.isArray(messageContent)) {
    for (const part of messageContent) {
      const image = partToDataUrl(part);
      if (image) return image;
    }
  }

  const candidateParts = payload?.candidates?.[0]?.content?.parts;
  if (Array.isArray(candidateParts)) {
    for (const part of candidateParts) {
      const image = partToDataUrl(part);
      if (image) return image;
    }
  }

  return null;
};

const resolveGeneratedDataUrl = async (value: string): Promise<string> => {
  const inline = normalizeDataUrl(value);
  if (inline) return inline;
  return await downloadImageAsDataUrl(value);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    if (body?.healthCheck === true) {
      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      product,
      template,
      caption = "",
      whiteBgImage,
      mode = "showcase",
      showPrice = true,
      language = "en",
    } = body;

    if (!product?.title) {
      return new Response(JSON.stringify({ error: "Product is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!template?.id) {
      return new Response(JSON.stringify({ error: "Creative template is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const productImageUrl = whiteBgImage || product.image;
    if (!productImageUrl) {
      return new Response(JSON.stringify({ error: "A product source image is required for faithful creative generation" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const sourceDataUrl = await downloadImageAsDataUrl(productImageUrl);

    const originalPrice = Number.parseFloat(product.compare_at_price) || 0;
    const salePrice = Number.parseFloat(product.price) || 0;
    const discount = showPrice && originalPrice > salePrice && salePrice > 0
      ? Math.round((1 - salePrice / originalPrice) * 100)
      : 0;

    let aspectHint = "square 1:1 social format (1080x1080)";
    let compositionHint = "balanced square composition with safe margins on every side";
    if (template.size === "portrait") {
      aspectHint = "vertical Instagram portrait 4:5 format (1080x1350)";
      compositionHint = "portrait composition with all product details and text inside the central safe area";
    } else if (template.size === "story") {
      aspectHint = "vertical 9:16 story/reel format (1080x1920)";
      compositionHint = "mobile-first vertical composition with generous top and bottom UI safe zones";
    } else if (template.size === "landscape") {
      aspectHint = "horizontal 16:9 landscape format (1920x1080)";
      compositionHint = "wide composition with product and copy balanced across the frame";
    }

    const visualStyle = template.aiPromptStyle || "Premium commercial ecommerce photography with realistic lighting, clean hierarchy and refined styling.";
    const languageInstruction = language === "fr"
      ? "If any commercial copy is rendered in the image, write it in French."
      : "If any commercial copy is rendered in the image, write it in English.";
    const ctaText = language === "fr" ? "DÉCOUVRIR" : "DISCOVER";
    const modeInstruction = mode === "strengths"
      ? "Emphasize the product's strongest visible benefits without inventing technical claims."
      : "Use a premium hero-product composition. Keep the product itself as the dominant visual element.";

    const enrichment = product.vision_attributes
      ? [
          product.vision_attributes.color && `Color: ${product.vision_attributes.color}`,
          product.vision_attributes.material && `Material: ${product.vision_attributes.material}`,
          product.vision_attributes.style && `Style: ${product.vision_attributes.style}`,
          product.vision_attributes.shape && `Shape: ${product.vision_attributes.shape}`,
          product.vision_attributes.features?.length && `Visible features: ${product.vision_attributes.features.join(", ")}`,
        ].filter(Boolean).join("\n")
      : "";

    const prompt = `Create ONE polished professional ecommerce advertising image in ${aspectHint}.

SOURCE IMAGE IS AN IMMUTABLE PRODUCT REFERENCE:
- The supplied image contains the exact product that must appear in the final creative.
- Preserve product geometry, dimensions, proportions, layout, materials, color, finish, doors, drawers, handles, legs, fireplace/lighting elements and all distinctive details.
- Do NOT replace it with a similar product and do NOT redesign it.
- You may change only the surrounding scene, lighting, shadows and advertising composition.
- Show the complete hero product unless the chosen format absolutely requires a tighter crop; never crop important product details.

FORMAT:
- Canvas: ${aspectHint}
- ${compositionHint}
- Do not silently change the requested aspect ratio.

VISUAL TEMPLATE:
${visualStyle}

PRODUCT:
Name: ${product.title}
${product.vendor ? `Brand: ${product.vendor}` : ""}
${product.product_type ? `Category: ${product.product_type}` : ""}
${enrichment}

CREATIVE DIRECTION:
${modeInstruction}
${caption?.trim() ? `Optional on-image tagline: "${caption.trim()}"` : "Do not invent a tagline unless required by the template."}
${showPrice && salePrice > 0 ? `Price to display: ${salePrice}€` : "Do not display a price."}
${discount > 0 ? `Optional discount badge: -${discount}%` : "Do not invent a discount."}
CTA if the template needs one: "${ctaText}".
${languageInstruction}

QUALITY:
- Photorealistic premium commercial advertising quality.
- Coherent contact shadows, reflections and perspective.
- Text must be sparse, readable and inside safe margins.
- No extra products, duplicate furniture parts, malformed geometry, fake logos, watermarks or invented specifications.`;

    console.log("🎨 Ad creative generation", {
      product: product.title,
      template: template.id,
      size: template.size,
      mode,
    });

    const response = await withTimeout(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          modalities: ["image", "text"],
          messages: [{
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: sourceDataUrl } },
            ],
          }],
        }),
      },
      120_000,
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error", response.status, errorText.slice(0, 1200));
      const message = response.status === 429
        ? "AI generation is temporarily rate limited. Please try again in a moment."
        : response.status === 402
          ? "AI image generation credits are unavailable for this workspace."
          : `AI image generation failed (${response.status}).`;
      return new Response(JSON.stringify({ error: message }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await response.json();
    const generated = extractGeneratedImage(payload);
    if (!generated) {
      console.error("AI response did not contain an image", JSON.stringify(payload).slice(0, 1600));
      throw new Error("The AI service completed but did not return an image. Please try again.");
    }

    const generatedDataUrl = await resolveGeneratedDataUrl(generated);
    const parsed = dataUrlParts(generatedDataUrl);
    if (!parsed) throw new Error("The generated image response is invalid");

    return new Response(JSON.stringify({
      base64: parsed.base64,
      mimeType: parsed.mimeType,
      outputFormat: template.size || "square",
      generatedByAI: true,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    const message = error?.name === "AbortError"
      ? "AI image generation timed out. Please try again."
      : error?.message || "Creative generation failed";
    console.error("export-creative-image error:", error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
