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

  if (part?.b64_json) return `data:${part?.mime_type || part?.mimeType || "image/png"};base64,${part.b64_json}`;
  return null;
};

const extractGeneratedImage = (payload: any): string | null => {
  const directCandidates = [
    payload?.imageUrl,
    payload?.image_url,
    payload?.url,
    payload?.data?.[0]?.url,
    payload?.data?.[0]?.b64_json ? `data:${payload?.data?.[0]?.mime_type || "image/png"};base64,${payload.data[0].b64_json}` : null,
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
  if (!/^https:\/\//i.test(value)) throw new Error("The AI returned an unsupported image payload");
  return await downloadImageAsDataUrl(value);
};

const buildFormat = (size: string) => {
  if (size === "portrait") {
    return {
      id: "portrait",
      ratio: "4:5",
      dimensions: "1080x1350",
      aspectHint: "vertical Instagram portrait 4:5 format (1080x1350)",
      compositionHint: "portrait composition with all product details and text inside the central safe area",
    };
  }
  if (size === "story") {
    return {
      id: "story",
      ratio: "9:16",
      dimensions: "1080x1920",
      aspectHint: "vertical 9:16 story/reel format (1080x1920)",
      compositionHint: "mobile-first vertical composition with generous top and bottom platform UI safe zones",
    };
  }
  if (size === "landscape") {
    return {
      id: "landscape",
      ratio: "16:9",
      dimensions: "1920x1080",
      aspectHint: "horizontal 16:9 landscape format (1920x1080)",
      compositionHint: "wide composition with product and copy balanced across the frame",
    };
  }
  return {
    id: "square",
    ratio: "1:1",
    dimensions: "1080x1080",
    aspectHint: "square 1:1 social format (1080x1080)",
    compositionHint: "balanced square composition with safe margins on every side",
  };
};

const callGateway = async ({
  apiKey,
  model,
  prompt,
  sourceDataUrl,
}: {
  apiKey: string;
  model: string;
  prompt: string;
  sourceDataUrl: string;
}) => {
  return await withTimeout(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Lovable-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
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
    if (!template?.aiPromptStyle?.trim()) {
      return new Response(JSON.stringify({ error: "The selected creative template has no AI prompt" }), {
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
    const output = buildFormat(template.size);

    const originalPrice = Number.parseFloat(product.compare_at_price) || 0;
    const salePrice = Number.parseFloat(product.price) || 0;
    const discount = showPrice && originalPrice > salePrice && salePrice > 0
      ? Math.round((1 - salePrice / originalPrice) * 100)
      : 0;

    const visualStyle = template.aiPromptStyle.trim();
    const languageInstruction = language === "fr"
      ? "If commercial copy is rendered in the image, write it in French only."
      : "If commercial copy is rendered in the image, write it in English only.";
    const ctaText = language === "fr" ? "DÉCOUVRIR" : "DISCOVER";

    const attributes = product.vision_attributes || {};
    const visibleFeatures = Array.isArray(attributes.features)
      ? attributes.features.filter((item: unknown) => typeof item === "string" && item.trim()).slice(0, 5)
      : [];
    const enrichment = [
      attributes.color && `Color: ${attributes.color}`,
      attributes.material && `Material: ${attributes.material}`,
      attributes.style && `Style: ${attributes.style}`,
      attributes.shape && `Shape: ${attributes.shape}`,
      visibleFeatures.length && `Known/visible features: ${visibleFeatures.join(", ")}`,
    ].filter(Boolean).join("\n");

    const modeInstruction = mode === "strengths"
      ? `STRENGTHS MODE:\n- Highlight 2 or 3 genuine product strengths using ONLY the known/visible product information supplied above and the source image.\n- Do not invent dimensions, materials, technologies, guarantees, certifications, awards, performance claims or delivery promises.\n- The product remains the hero; benefit callouts stay visually secondary.`
      : `SHOWCASE MODE:\n- Use a premium hero-product composition.\n- Keep the exact product as the dominant visual element.\n- Build aspiration through scene, lighting and composition, not through invented product claims.`;

    const priceInstruction = showPrice
      ? [
          salePrice > 0 ? `Verified price that may be displayed: ${salePrice}€.` : "No verified price is available; do not invent one.",
          discount > 0 ? `Verified discount that may be displayed: -${discount}%.` : "No verified discount is available; do not invent a sale badge or percentage.",
          discount > 0 && originalPrice > 0 ? `Verified previous price: ${originalPrice}€.` : "",
        ].filter(Boolean).join("\n")
      : "PRICE RULE: Do NOT show any price, previous price, discount, percentage, sale badge, deal text or promotion anywhere in the image.";

    const customInstruction = typeof caption === "string" && caption.trim()
      ? `USER CREATIVE INSTRUCTION:\n${caption.trim()}\nFollow this instruction only when it does not conflict with product fidelity or the selected template.`
      : "No additional user instruction was provided.";

    const prompt = `Create ONE polished professional ecommerce advertising image in ${output.aspectHint}.

SOURCE IMAGE IS AN IMMUTABLE PRODUCT REFERENCE:
- The supplied image contains the exact product that must appear in the final creative.
- Preserve product geometry, dimensions, proportions, layout, materials, color, finish, doors, drawers, handles, legs, fireplace/lighting elements and all distinctive details.
- Do NOT replace it with a similar product and do NOT redesign it.
- Do NOT add, remove, duplicate or deform product parts.
- You may change only the surrounding scene, lighting, shadows and advertising composition.
- Show the complete hero product unless the chosen format absolutely requires a tighter crop; never crop important product details.

OUTPUT FORMAT — REQUIRED:
- Canvas: ${output.aspectHint}
- Exact requested ratio: ${output.ratio}
- Target framing: ${output.dimensions}
- ${output.compositionHint}
- Do not silently change the requested aspect ratio.

TEMPLATE AI PROMPT — PRIMARY VISUAL DIRECTION, REQUIRED:
Template: ${template.name || template.id}
Category: ${template.category || "creative"}
${visualStyle}
Follow this template prompt as the primary art direction. Do not ignore or replace it with a generic style.

PRODUCT:
Name: ${product.title}
${product.vendor ? `Brand: ${product.vendor}` : ""}
${product.product_type ? `Category: ${product.product_type}` : ""}
${enrichment}

GENERATION DIRECTION:
${modeInstruction}

${customInstruction}

PRICE / PROMOTION:
${priceInstruction}

COPY RULES:
- Keep text sparse, readable and inside safe margins.
- CTA may read "${ctaText}" only if typography can be rendered cleanly.
- Never invent claims, ratings, awards, specifications, delivery promises, prices or promotions.
- Never render gibberish, fake brand text, fake logos or watermarks.
- ${languageInstruction}

QUALITY:
- Photorealistic premium commercial advertising quality.
- Coherent contact shadows, reflections and perspective.
- Ready for Facebook/Instagram publishing.
- Product fidelity is more important than visual spectacle.`;

    const configuredModel = Deno.env.get("LOVABLE_IMAGE_MODEL")?.trim();
    const models = Array.from(new Set([
      configuredModel,
      "google/gemini-3.1-flash-image-preview",
      "google/gemini-2.5-flash-image-preview",
    ].filter((value): value is string => Boolean(value))));

    console.log("🎨 Ad creative generation", {
      product: product.title,
      template: template.id,
      size: output.id,
      ratio: output.ratio,
      mode,
      showPrice: Boolean(showPrice),
      models,
    });

    const attempts: string[] = [];

    for (const model of models) {
      let response: Response;
      try {
        response = await callGateway({
          apiKey: LOVABLE_API_KEY,
          model,
          prompt,
          sourceDataUrl,
        });
      } catch (error: any) {
        if (error?.name === "AbortError") {
          attempts.push(`${model}: timed out`);
          continue;
        }
        throw error;
      }

      const responseText = await response.text();
      if (!response.ok) {
        const concise = responseText.slice(0, 900);
        console.error("AI gateway error", model, response.status, concise);

        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "AI image generation credits are unavailable for this workspace.", details: concise }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "AI generation is temporarily rate limited. Please try again in a moment.", details: concise }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        attempts.push(`${model}: HTTP ${response.status}`);
        if ([400, 404, 422].includes(response.status)) continue;

        return new Response(JSON.stringify({ error: `AI image generation failed (${response.status}).`, details: concise }), {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let payload: any;
      try {
        payload = JSON.parse(responseText);
      } catch {
        attempts.push(`${model}: invalid JSON response`);
        continue;
      }

      const generated = extractGeneratedImage(payload);
      if (!generated) {
        attempts.push(`${model}: response contained no image`);
        console.warn("AI response did not contain an image", model, JSON.stringify(payload).slice(0, 1200));
        continue;
      }

      try {
        const generatedDataUrl = await resolveGeneratedDataUrl(generated);
        const parsed = dataUrlParts(generatedDataUrl);
        if (!parsed) {
          attempts.push(`${model}: invalid image payload`);
          continue;
        }

        return new Response(JSON.stringify({
          base64: parsed.base64,
          mimeType: parsed.mimeType,
          outputFormat: output.id,
          ratio: output.ratio,
          dimensions: output.dimensions,
          model,
          generatedByAI: true,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error: any) {
        attempts.push(`${model}: ${error?.message || "unable to resolve generated image"}`);
      }
    }

    throw new Error(`The available AI image models did not return a valid image. ${attempts.join(" | ")}`);
  } catch (error: any) {
    const message = error?.name === "AbortError"
      ? "AI image generation timed out. Please try again."
      : error?.message || "Creative generation failed";
    console.error("export-creative-image error:", error);
    return new Response(JSON.stringify({ error: message, details: "Ads creative generation did not produce a valid image." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
