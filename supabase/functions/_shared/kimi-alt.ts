const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const KIMI_FREE_MODEL = "moonshotai/kimi-k2.6:free";

export interface KimiAltInput {
  imageUrl: string;
  title: string;
  description?: string;
  language?: string;
  contentType?: string;
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

export async function generateAltWithKimi(input: KimiAltInput): Promise<string> {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY not configured");
  }

  const language = languageName(input.language);
  const contentType = input.contentType || "product";
  const isProduct = contentType === "product";
  const description = (input.description || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").slice(0, 500);

  const prompt = `You are an e-commerce image SEO specialist.
Generate exactly ONE useful ALT text in ${language} for the supplied ${contentType} image.

Context title: ${input.title || "Untitled"}
${description ? `Context description: ${description}` : ""}

Rules:
- 8 to 12 words when natural, never more than 125 characters.
- Describe what is actually visible in the image; do not invent attributes.
- ${isProduct ? "Focus on the product itself: type, material, finish, color and visible design. Ignore staging/decor unless needed to identify the product." : "Describe the key visible subject, style or purpose of the content image."}
- Use the title only when it helps identify the subject; no keyword stuffing.
- Do not start with “Image of”, “Photo of”, “Image de” or similar.
- No quotes, bullets, explanations, labels or multiple options.

Return only the final ALT text.`;

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
      temperature: 0.2,
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

export const KIMI_ALT_MODEL = KIMI_FREE_MODEL;
