from pathlib import Path
import re


def read(path):
    return Path(path).read_text()


def write(path, text):
    Path(path).write_text(text)


def add_import(text, anchor, new_import):
    if new_import in text:
        return text
    if anchor not in text:
        raise SystemExit(f'import anchor not found: {anchor}')
    return text.replace(anchor, anchor + '\n' + new_import, 1)


def replace_regex(text, pattern, replacement, label):
    new_text, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 replacement, got {count}')
    return new_text

# ---------------------------------------------------------------------------
# PAGE + HOMEPAGE SEO
# ---------------------------------------------------------------------------
path = 'supabase/functions/generate-page-seo/index.ts'
text = read(path)
text = add_import(
    text,
    'import { resolveLanguage } from "../_shared/language-detector.ts";',
    'import { routeAI } from "../_shared/ai-router.ts";'
)
page_replacement = r'''let content = "";
    let aiProvider = "deterministic-fallback";
    let aiModel = "context-only";

    try {
      const routed = await routeAI({
        messages: [
          {
            role: "system",
            content: `${systemRole} Use only facts present in the supplied page/store context. Never invent offers, shipping, warranties, materials or claims. Return valid JSON only.`,
          },
          { role: "user", content: prompt },
        ],
        maxTokens: 1000,
        temperature: 0.35,
      });
      content = routed.content;
      aiProvider = routed.provider;
      aiModel = routed.model;
    } catch (aiError) {
      console.warn('[GENERATE-PAGE-SEO] All AI providers unavailable, using context-only fallback:', aiError);
      const factualText = String(textContent || "")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const factualTitle = String(pageTitle || (isHomepage ? "Home" : "Page"))
        .replace(/\s+/g, " ")
        .trim();
      const fallbackTitle = factualTitle.slice(0, 60) || (isHomepage ? "Home" : "Page");
      const fallbackDescription = (factualText || factualTitle).slice(0, 160);
      content = JSON.stringify({
        seo_title: fallbackTitle,
        seo_description: fallbackDescription,
      });
    }
    '''
text = replace_regex(
    text,
    r'''const aiResponse = await fetch\('https://ai\.gateway\.lovable\.dev/v1/chat/completions', \{.*?const content = aiData\.choices\[0\]\.message\.content;\s*''',
    page_replacement,
    'generate-page-seo gateway block'
)
# Surface provider metadata without changing existing client contract.
text = text.replace(
    'const responseData: any = { \n      success: true, \n      seo_title: seoData.seo_title,\n      seo_description: seoData.seo_description\n    };',
    'const responseData: any = { \n      success: true, \n      seo_title: seoData.seo_title,\n      seo_description: seoData.seo_description,\n      ai_provider: aiProvider,\n      ai_model: aiModel\n    };'
)
write(path, text)

# ---------------------------------------------------------------------------
# COLLECTION SEO
# ---------------------------------------------------------------------------
path = 'supabase/functions/generate-collection-seo/index.ts'
text = read(path)
text = add_import(
    text,
    'import { getGenerationLanguage } from "../_shared/language-detector.ts";',
    'import { routeAI } from "../_shared/ai-router.ts";'
)
text = text.replace('    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;\n', '')
collection_replacement = r'''let content = "";
        let aiProvider = "deterministic-fallback";
        let aiModel = "context-only";
        try {
          const routed = await routeAI({
            messages: [
              { role: "system", content: `${systemRole} Use only supplied collection and product facts. Never invent offers, shipping, warranties or product attributes. Return valid JSON only.` },
              { role: "user", content: prompt }
            ],
            maxTokens: 700,
            temperature: 0.35,
          });
          content = routed.content.trim();
          aiProvider = routed.provider;
          aiModel = routed.model;
        } catch (aiError) {
          console.warn(`[COLLECTION-SEO] AI unavailable for ${collection_id}; using factual fallback`, aiError);
          const existingText = String(collection.body_html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
          const productText = String(productTitles || "").replace(/\s+/g, " ").trim();
          const factualDescription = (existingText || `${collection.title}${productText ? ` — ${productText}` : ""}`).slice(0, 160);
          content = JSON.stringify({
            seo_title: String(collection.title || "Collection").slice(0, 60),
            seo_description: factualDescription,
            body_html: collection.body_html || `<p>${String(collection.title || "Collection").replace(/[<>&]/g, "")}</p>`,
          });
        }
        console.log(`[COLLECTION-SEO] provider=${aiProvider}, model=${aiModel}`);
        '''
text = replace_regex(
    text,
    r'''const aiResponse = await fetch\("https://ai\.gateway\.lovable\.dev/v1/chat/completions", \{.*?const content = result\.choices\[0\]\.message\.content\.trim\(\);\s*''',
    collection_replacement,
    'generate-collection-seo gateway block'
)
write(path, text)

# ---------------------------------------------------------------------------
# ARTICLE SEO
# ---------------------------------------------------------------------------
path = 'supabase/functions/generate-article-seo/index.ts'
text = read(path)
text = add_import(
    text,
    'import { resolveLanguage } from "../_shared/language-detector.ts";',
    'import { routeAI } from "../_shared/ai-router.ts";'
)
text = text.replace('    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");\n    \n    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");\n', '')
article_replacement = r'''let content = "";
        let aiProvider = "deterministic-fallback";
        let aiModel = "context-only";
        try {
          const routed = await routeAI({
            messages: [
              { role: "system", content: `${systemRole} Use only facts from the supplied article. Never invent claims. Return valid JSON only.` },
              { role: "user", content: prompt }
            ],
            maxTokens: 700,
            temperature: 0.35,
          });
          content = routed.content.trim();
          aiProvider = routed.provider;
          aiModel = routed.model;
        } catch (aiError) {
          console.warn(`[ARTICLE-SEO] AI unavailable for ${article_id}; using factual fallback`, aiError);
          const factualContent = String(article.content || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
          content = JSON.stringify({
            seo_title: String(article.title || "Article").slice(0, 60),
            meta_description: (factualContent || String(article.title || "Article")).slice(0, 160),
            keywords: Array.isArray(article.keywords) ? article.keywords : [],
          });
        }
        console.log(`[ARTICLE-SEO] provider=${aiProvider}, model=${aiModel}`);
        '''
text = replace_regex(
    text,
    r'''const aiResponse = await fetch\("https://ai\.gateway\.lovable\.dev/v1/chat/completions", \{.*?const content = result\.choices\[0\]\.message\.content\.trim\(\);\s*''',
    article_replacement,
    'generate-article-seo gateway block'
)
write(path, text)

# ---------------------------------------------------------------------------
# PRODUCT SEO
# ---------------------------------------------------------------------------
path = 'supabase/functions/generate-seo-with-deepseek/index.ts'
text = read(path)
text = add_import(
    text,
    'import { resolveLanguage, getLanguageName, getGenerationLanguage } from "../_shared/language-detector.ts";',
    'import { routeAI } from "../_shared/ai-router.ts";'
)
# Remove legacy Lovable-only helper.
text = replace_regex(
    text,
    r'''// Lovable AI caller \(replacing DeepSeek due to insufficient balance\).*?\n\}\n\n// Enhanced SEO content validator''',
    '// Enhanced SEO content validator',
    'generate-seo-with-deepseek legacy helper'
)
product_replacement = r'''let seoContent = "";
    let aiProvider = "deterministic-fallback";
    let aiModel = "context-only";
    try {
      const routed = await routeAI({
        messages: [
          { role: "system", content: `${systemRole} Use only real product data supplied in the prompt. Never invent features, offers, materials, delivery promises or warranties. Return valid JSON only.` },
          { role: "user", content: enhancedSeoPrompt }
        ],
        maxTokens: 1000,
        temperature: 0.35,
      });
      seoContent = routed.content.trim();
      aiProvider = routed.provider;
      aiModel = routed.model;
    } catch (aiError) {
      console.warn(`[SEO-GENERATION] AI unavailable for ${productId}; using factual fallback`, aiError);
      const factualDescription = String(product.description || "")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const factualParts = [product.title, product.product_type, product.category, product.vendor, product.tags]
        .filter(Boolean)
        .map((value) => String(value).replace(/\s+/g, " ").trim());
      seoContent = JSON.stringify({
        seo_title: String(product.title || "Product").slice(0, 65),
        seo_description: (factualDescription || factualParts.join(" — ")).slice(0, 165),
      });
    }

    // Extract JSON even when a provider wraps it in markdown or extra text.
    seoContent = seoContent.replace(/```json\s*|```/gi, "").trim();
    const jsonStart = seoContent.indexOf("{");
    const jsonEnd = seoContent.lastIndexOf("}");
    if (jsonStart >= 0 && jsonEnd > jsonStart) seoContent = seoContent.slice(jsonStart, jsonEnd + 1);

    const parsed = JSON.parse(seoContent);
    const { seo_title, seo_description } = parsed;
    '''
text = replace_regex(
    text,
    r'''const response = await callLovableAI\(.*?const \{ seo_title, seo_description \} = parsed;\s*''',
    product_replacement,
    'generate-seo-with-deepseek generation block'
)
text = text.replace('          model: "google/gemini-2.5-flash",', '          model: aiModel,\n          provider: aiProvider,')
write(path, text)

# ---------------------------------------------------------------------------
# PRODUCT LANDING / DESCRIPTION HTML
# ---------------------------------------------------------------------------
path = 'supabase/functions/generate-product-description-html/index.ts'
text = read(path)
text = add_import(
    text,
    "import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';",
    'import { routeAI } from "../_shared/ai-router.ts";'
)
text = text.replace('    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");\n    if (!LOVABLE_API_KEY) {\n      throw new Error("LOVABLE_API_KEY is not configured");\n    }\n\n', '')
landing_replacement = r'''let content = "";
    let aiProvider = "deterministic-fallback";
    let aiModel = "context-only";
    try {
      const routed = await routeAI({
        messages: [
          { role: "system", content: "You are an expert e-commerce content designer. Use only product facts supplied by the user. Never invent warranty, shipping, materials, dimensions, awards, ratings, eco claims or promotions. Return valid JSON only." },
          { role: "user", content: cleanPrompt }
        ],
        temperature: 0.45,
        maxTokens: 12000,
      });
      content = routed.content.trim();
      aiProvider = routed.provider;
      aiModel = routed.model;
    } catch (aiError) {
      console.warn('[PRODUCT-LANDING] All AI providers unavailable; using minimal factual HTML fallback', aiError);
      const escapeHtml = (value: unknown) => String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
      const plainDescription = String(existingDescription || "")
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const safeImages = Array.isArray(images) ? images.slice(0, 8) : [];
      const gallery = safeImages.map((img: any, index: number) => {
        const src = typeof img === "string" ? img : img?.src;
        return src ? `<figure><img src="${escapeHtml(src)}" alt="${escapeHtml(title)} ${index + 1}" loading="lazy" class="w-full h-auto rounded-xl" /></figure>` : "";
      }).join("");
      const fallbackHtml = `<main class="mx-auto max-w-5xl space-y-8 p-6 text-gray-900"><header class="space-y-3"><h1 class="text-3xl font-semibold">${escapeHtml(title)}</h1>${plainDescription ? `<p class="text-gray-700">${escapeHtml(plainDescription)}</p>` : ""}</header>${gallery ? `<section class="grid grid-cols-1 gap-4 md:grid-cols-2" aria-label="Product gallery">${gallery}</section>` : ""}</main>`;
      content = JSON.stringify({ title: String(title).slice(0, 70), html: fallbackHtml });
    }

    if (!content) throw new Error("No content generated");
    console.log(`[PRODUCT-LANDING] provider=${aiProvider}, model=${aiModel}`);
    '''
text = replace_regex(
    text,
    r'''// 🔹 Call Lovable AI with increased token limit\s*const response = await fetch\("https://ai\.gateway\.lovable\.dev/v1/chat/completions", \{.*?if \(!content\) throw new Error\("No content generated by AI"\);\s*''',
    landing_replacement,
    'generate-product-description-html gateway block'
)
write(path, text)

# Guard: no direct Lovable gateway should remain in the five repaired generators.
targets = [
    'supabase/functions/generate-page-seo/index.ts',
    'supabase/functions/generate-collection-seo/index.ts',
    'supabase/functions/generate-article-seo/index.ts',
    'supabase/functions/generate-seo-with-deepseek/index.ts',
    'supabase/functions/generate-product-description-html/index.ts',
]
for target in targets:
    content = read(target)
    if 'ai.gateway.lovable.dev' in content:
        raise SystemExit(f'direct Lovable AI gateway still present in {target}')
    if '../_shared/ai-router.ts' not in content:
        raise SystemExit(f'ai-router import missing in {target}')

print('Patched SEO generators:', ', '.join(targets))
