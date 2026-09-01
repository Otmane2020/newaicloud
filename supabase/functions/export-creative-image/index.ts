import "../_shared/strict-ai-generation.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CreativeFormat = "square" | "portrait" | "story" | "landscape";
type GenerationMode = "showcase" | "strengths";

type GatewayImage = {
  base64: string;
  mimeType: string;
};

const FORMAT_CONFIG: Record<CreativeFormat, { ratio: string; dimensions: string; composition: string }> = {
  square: {
    ratio: "1:1",
    dimensions: "1080x1080",
    composition: "balanced square composition with generous safe margins on every side",
  },
  portrait: {
    ratio: "4:5",
    dimensions: "1080x1350",
    composition: "vertical Instagram feed composition; keep the hero product and all important elements inside the central safe area",
  },
  story: {
    ratio: "9:16",
    dimensions: "1080x1920",
    composition: "tall Story/Reel composition; keep important content away from top and bottom platform UI safe zones",
  },
  landscape: {
    ratio: "16:9",
    dimensions: "1920x1080",
    composition: "wide horizontal advertising composition with product and visual hierarchy balanced across the frame",
  },
};

const normalizeFormat = (value: unknown): CreativeFormat => {
  if (value === "portrait" || value === "story" || value === "landscape") return value;
  return "square";
};

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
  }
  return btoa(binary);
};

const parseDataUrl = (value: string): GatewayImage | null => {
  const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
};

const downloadImageUrl = async (url: string): Promise<GatewayImage> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Generated image download failed (${response.status})`);

  const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";
  if (!contentType.startsWith("image/")) {
    throw new Error(`Generated asset is not an image (${contentType})`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length === 0) throw new Error("Generated image is empty");
  if (bytes.length > 20 * 1024 * 1024) throw new Error("Generated image is larger than 20 MB");

  return { base64: bytesToBase64(bytes), mimeType: contentType };
};

const extractGatewayImage = async (payload: any): Promise<GatewayImage | null> => {
  const message = payload?.choices?.[0]?.message;
  const imageCandidates: unknown[] = [
    message?.images?.[0]?.image_url?.url,
    message?.images?.[0]?.url,
    payload?.data?.[0]?.url,
    payload?.output?.[0]?.url,
  ];

  if (Array.isArray(message?.content)) {
    for (const part of message.content) {
      imageCandidates.push(part?.image_url?.url, part?.url, part?.image_url);
      if (typeof part?.b64_json === "string") {
        return { base64: part.b64_json, mimeType: part?.mime_type || "image/png" };
      }
    }
  }

  const directBase64 =
    payload?.data?.[0]?.b64_json ||
    payload?.data?.[0]?.base64 ||
    payload?.image?.base64 ||
    message?.image?.base64;

  if (typeof directBase64 === "string" && directBase64.length > 100) {
    return { base64: directBase64, mimeType: payload?.data?.[0]?.mime_type || "image/png" };
  }

  for (const candidate of imageCandidates) {
    if (typeof candidate !== "string" || !candidate.trim()) continue;
    const dataImage = parseDataUrl(candidate);
    if (dataImage) return dataImage;
    if (/^https:\/\//i.test(candidate)) return await downloadImageUrl(candidate);
  }

  return null;
};

const gatewayRequest = async ({
  apiKey,
  model,
  prompt,
  productImageUrl,
}: {
  apiKey: string;
  model: string;
  prompt: string;
  productImageUrl?: string | null;
}) => {
  const content = productImageUrl
    ? [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: productImageUrl } },
      ]
    : prompt;

  return await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Lovable-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content }],
      modalities: ["image", "text"],
    }),
  });
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
      whiteBgImage,
      mode = "showcase",
      language = "fr",
      caption = "",
      showPrice = true,
    } = body;

    if (!product?.title) throw new Error("Product is required");
    if (!template?.id) throw new Error("Creative template is required");
    if (!template?.aiPromptStyle?.trim()) throw new Error("The selected template has no AI prompt");

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const outputFormat = normalizeFormat(template.size);
    const formatConfig = FORMAT_CONFIG[outputFormat];
    const generationMode: GenerationMode = mode === "strengths" ? "strengths" : "showcase";
    const productImageUrl = whiteBgImage || product.image || null;

    const originalPrice = Number.parseFloat(product.compare_at_price) || 0;
    const salePrice = Number.parseFloat(product.price) || 0;
    const discount = showPrice && originalPrice > salePrice && salePrice > 0
      ? Math.round((1 - salePrice / originalPrice) * 100)
      : 0;

    const attributes = product.vision_attributes || {};
    const knownFeatures = Array.isArray(attributes.features)
      ? attributes.features.filter((feature: unknown) => typeof feature === "string" && feature.trim()).slice(0, 5)
      : [];

    const enrichmentDetails = [
      attributes.color ? `Primary color: ${attributes.color}` : null,
      attributes.material ? `Material: ${attributes.material}` : null,
      attributes.style ? `Design style: ${attributes.style}` : null,
      attributes.shape ? `Shape: ${attributes.shape}` : null,
      knownFeatures.length ? `Known features: ${knownFeatures.join(", ")}` : null,
    ].filter(Boolean).join("\n");

    const modeInstruction = generationMode === "strengths"
      ? `STRENGTHS MODE:\n- Highlight 2 or 3 real product strengths using only the supplied product data or visually observable characteristics.\n- Do not invent specifications, certifications, guarantees, materials, dimensions or claims.\n- Keep the product itself dominant; benefit cues must remain secondary.`
      : `SHOWCASE MODE:\n- Treat the product as the single hero element.\n- Build a premium aspirational scene around it while preserving its identity exactly.\n- Avoid feature callouts unless they are needed by the selected template.`;

    const customInstruction = typeof caption === "string" && caption.trim()
      ? `\n=== USER CREATIVE INSTRUCTION ===\n${caption.trim()}\nFollow this instruction when compatible with product fidelity and the selected template.`
      : "";

    const pricingInstruction = showPrice
      ? `\n=== PRICE / PROMOTION ===\n${discount > 0 ? `Discount available: -${discount}%` : "No verified discount badge is required."}\n${salePrice > 0 ? `Current price: ${salePrice}€` : "No verified current price is available."}\n${discount > 0 && originalPrice > 0 ? `Original price: ${originalPrice}€` : ""}\nOnly render price/discount text when a verified value is provided above. Keep typography legible and minimal.`
      : `\n=== PRICE / PROMOTION ===\nDO NOT show any price, previous price, discount, percentage, sale badge or invented promotion anywhere in the image.`;

    const ctaText = language === "fr" ? "ACHETER MAINTENANT" : "SHOP NOW";

    const imagePrompt = `CREATE ONE PROFESSIONAL E-COMMERCE SOCIAL AD IMAGE.

=== OUTPUT FORMAT — REQUIRED ===
- Aspect ratio: ${formatConfig.ratio}
- Target framing: ${formatConfig.dimensions}
- Composition: ${formatConfig.composition}
- Do not silently convert to another aspect ratio.
- Do not crop or distort important product details.

=== TEMPLATE CREATIVE DIRECTION — REQUIRED ===
Template: ${template.name || template.id}
Category: ${template.category || "creative"}
${template.aiPromptStyle.trim()}
Use this template prompt as the primary visual art direction. Do not ignore it.

=== SOURCE PRODUCT — IDENTITY LOCK ===
Product: ${product.title}
${product.vendor ? `Brand: ${product.vendor}` : ""}
${product.product_type ? `Category: ${product.product_type}` : ""}
${enrichmentDetails ? `Known visual/product attributes:\n${enrichmentDetails}` : ""}

The supplied product reference image is authoritative when present.
STRICTLY preserve the product's shape, proportions, geometry, material appearance, color, finish, texture, construction, logo/markings and distinctive details.
Do not redesign, simplify, add, remove or replace product parts. Do not create a different product variant.

=== GENERATION MODE ===
${modeInstruction}
${customInstruction}
${pricingInstruction}

=== COPY RULES ===
- Keep text minimal and advertising-quality.
- CTA may read "${ctaText}" only if typography can be rendered cleanly.
- Never invent claims, ratings, awards, specs, delivery promises or promotions.
- Never render gibberish or fake brand text.

=== QUALITY ===
- Photorealistic premium commercial photography / render quality.
- Cohesive lighting between the source product and generated environment.
- Professional Facebook/Instagram advertising composition.
- Product fidelity is more important than visual spectacle.`;

    const configuredModel = Deno.env.get("LOVABLE_IMAGE_MODEL")?.trim();
    const models = Array.from(new Set([
      configuredModel,
      "google/gemini-3.1-flash-image-preview",
      "google/gemini-2.5-flash-image-preview",
    ].filter((model): model is string => Boolean(model))));

    console.log("🎨 Ads creative generation", {
      product: product.title,
      template: template.id,
      outputFormat,
      ratio: formatConfig.ratio,
      mode: generationMode,
      showPrice: Boolean(showPrice),
      hasProductImage: Boolean(productImageUrl),
      models,
    });

    const attempts: string[] = [];
    for (const model of models) {
      const response = await gatewayRequest({ apiKey, model, prompt: imagePrompt, productImageUrl });
      const rawText = await response.text();

      if (!response.ok) {
        const concise = rawText.slice(0, 500);
        attempts.push(`${model}: HTTP ${response.status} ${concise}`);
        console.error("AI gateway model failed", { model, status: response.status, body: concise });

        if (response.status === 402) {
          throw new Error("Lovable AI billing/credits rejected the image request (402)");
        }
        if (response.status === 429) {
          throw new Error("Lovable AI rate limit reached (429). Please retry shortly.");
        }

        if ([400, 404, 422].includes(response.status)) continue;
        throw new Error(`Lovable AI request failed (${response.status})`);
      }

      let payload: any;
      try {
        payload = JSON.parse(rawText);
      } catch {
        attempts.push(`${model}: invalid JSON response`);
        continue;
      }

      const generated = await extractGatewayImage(payload);
      if (generated?.base64) {
        console.log("✅ Ads creative generated", { model, outputFormat, mimeType: generated.mimeType });
        return new Response(
          JSON.stringify({
            base64: generated.base64,
            mimeType: generated.mimeType,
            model,
            outputFormat,
            ratio: formatConfig.ratio,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      attempts.push(`${model}: response contained no supported image payload`);
    }

    const referenceNote = productImageUrl
      ? "The source product image was provided, so the function intentionally refused to generate a text-only replacement that could change the product."
      : "No product reference image was available.";

    throw new Error(`No image was returned by the available Lovable AI image models. ${referenceNote} ${attempts.join(" | ")}`);
  } catch (error: any) {
    const message = error?.message || "Creative generation failed";
    console.error("❌ export-creative-image:", message);
    return new Response(
      JSON.stringify({ error: message, details: "Ads creative generation did not produce a valid image." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
