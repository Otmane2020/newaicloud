const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const KIMI_FREE_MODEL = "moonshotai/kimi-k2.6:free";

export interface KimiAltInput {
  imageUrl: string;
  title: string;
  description?: string;
  language?: string;
  contentType?: string;
  imagePosition?: number | null;
  siblingAltTexts?: string[];
}

function languageName(language = "en"): string {
  const normalized = language.toLowerCase();
  if (normalized.startsWith("fr")) return "French";
  if (normalized.startsWith("de")) return "German";
  if (normalized.startsWith("es")) return "Spanish";
  if (normalized.startsWith("it")) return "Italian";
  return "English";
}

export function cleanAltText(value: string): string {
  return value
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/^(alt(?: text)?\s*:?\s*|image of\s+|photo of\s+|image de\s+|photo de\s+|bild von\s+|imagen de\s+|immagine di\s+)/i, "")
    .replace(/^[-*•]\s*/, "")
    .split(/\n|•/)[0]
    .trim()
    .slice(0, 125);
}

export function isUsefulAltText(value: string | null | undefined): boolean {
  if (!value || value.trim().length < 4) return false;
  const normalized = value.toLowerCase().trim();
  return ![
    "image",
    "photo",
    "picture",
    "product image",
    "image de produit",
    "photo de produit",
    "produktbild",
    "imagen de producto",
    "immagine del prodotto",
  ].includes(normalized);
}

function normalizeForComparison(value: string): string {
  return cleanAltText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isDuplicateOfSibling(value: string, siblings: string[] = []): boolean {
  const normalized = normalizeForComparison(value);
  if (!normalized) return false;
  return siblings.some((sibling) => normalizeForComparison(sibling) === normalized);
}

async function requestKimi(input: KimiAltInput, prompt: string): Promise<string> {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://catalogoptimize.com",
      "X-Title": "CatalogOptimize AI",
    },
    body: JSON.stringify({
      model: KIMI_FREE_MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: input.imageUrl } },
          ],
        },
      ],
      max_tokens: 100,
      temperature: 0.18,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Kimi/OpenRouter ${response.status}: ${details.slice(0, 300)}`);
  }

  const data = await response.json();
  const raw = data?.choices?.[0]?.message?.content;
  const text = cleanAltText(typeof raw === "string" ? raw : "");

  if (!isUsefulAltText(text)) {
    throw new Error("Kimi returned an empty or generic ALT text");
  }

  return text;
}

export async function generateAltWithKimi(input: KimiAltInput): Promise<string> {
  const language = languageName(input.language);
  const contentType = input.contentType || "product";
  const isProduct = contentType === "product";
  const description = (input.description || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").slice(0, 500);
  const siblingAltTexts = (input.siblingAltTexts || []).filter(Boolean).slice(0, 10);
  const siblingContext = siblingAltTexts.length
    ? `\nALT texts already used for other images of this same product/content:\n${siblingAltTexts.map((alt, index) => `${index + 1}. ${alt}`).join("\n")}\nYour ALT MUST describe this image differently and MUST NOT duplicate any of those lines.`
    : "";
  const positionContext = input.imagePosition
    ? `\nThis is image position ${input.imagePosition} for this product/content. Use the position only as context; never write the position number in the ALT.`
    : "";

  const prompt = `You are an e-commerce image SEO specialist.
Generate exactly ONE useful ALT text in ${language} for the supplied ${contentType} image.

Context title: ${input.title || "Untitled"}
${description ? `Context description: ${description}` : ""}${positionContext}${siblingContext}

Rules:
- 8 to 12 words when natural, never more than 125 characters.
- Describe what is actually visible in THIS image; do not invent attributes.
- ${isProduct ? "Focus on the product itself: type, material, finish, color, visible design, angle or detail. If the same product has several images, vary the ALT according to what is uniquely visible in this specific image (front view, side view, close-up, texture, finish, color, detail, etc.). Ignore staging/decor unless needed to identify the product." : "Describe the key visible subject, style or purpose of this specific content image."}
- Use the product/content title only when it helps identify the subject.
- Never reuse the exact same ALT for two images of the same product/content.
- No keyword stuffing.
- Do not start with “Image of”, “Photo of”, “Image de” or similar.
- No quotes, bullets, explanations, labels or multiple options.

Return only the final ALT text.`;

  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const text = await requestKimi(input, prompt);
      if (isDuplicateOfSibling(text, siblingAltTexts)) {
        throw new Error("Kimi returned an ALT already used by a sibling image");
      }
      return text;
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 700));
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Kimi ALT generation failed");
}

export const KIMI_ALT_MODEL = KIMI_FREE_MODEL;
