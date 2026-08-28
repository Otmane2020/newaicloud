import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { routeAI } from "../_shared/ai-router.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Platform = "chatgpt" | "gemini" | "copilot" | "claude" | "perplexity" | "aeo";
type Lang = "fr" | "en";
type QueryType = "direct" | "list" | "comparison";
type IntentType = "price" | "dimensions" | "criteria" | "comparison" | "howto" | "best";

type Product = {
  id: string;
  title: string;
  product_type?: string | null;
  vendor?: string | null;
  tags?: string | null;
  body_html?: string | null;
  seo_description?: string | null;
};

type ProjectContext = {
  project_id: string;
  brand_name: string;
  website_url?: string;
  source_id?: string;
  source_url?: string;
};

type AiAnswer = {
  platform: Platform;
  query_type: QueryType;
  question: string;
  direct_answer: string;
  answer_confidence: number;
  supporting_content: { bullets: string[]; faq: { q: string; a: string }[] };
  citation_potential: number;
  product_ids: string[];
  keywords: string[];
  difficulty: "easy" | "medium" | "hard";
  category: string;
  project_id?: string;
  source_id?: string;
  source_url?: string;
  brand_mention?: string;
  ai_provider?: string;
  ai_model?: string;
};

const PLATFORM_CONFIGS: Record<Platform, { preferredAnswerLength: number; citationWeight: number }> = {
  chatgpt: { preferredAnswerLength: 140, citationWeight: 0.95 },
  gemini: { preferredAnswerLength: 160, citationWeight: 0.90 },
  copilot: { preferredAnswerLength: 150, citationWeight: 0.85 },
  claude: { preferredAnswerLength: 145, citationWeight: 0.92 },
  perplexity: { preferredAnswerLength: 155, citationWeight: 0.88 },
  aeo: { preferredAnswerLength: 140, citationWeight: 0.95 },
};

function detectLanguage(products: Product[]): Lang {
  const text = products.map((p) => p.title.toLowerCase()).join(" ");
  const fr = [" de ", " le ", " la ", " les ", " pour ", " avec ", " en ", " du ", " des ", " une ", " un "];
  return fr.filter((w) => text.includes(w)).length >= 2 ? "fr" : "en";
}

function groupByCategory(products: Product[]): Record<string, Product[]> {
  return products.reduce<Record<string, Product[]>>((acc, p) => {
    const key = p.product_type || p.vendor || "general";
    (acc[key] ||= []).push(p);
    return acc;
  }, {});
}

function getRelevantIntents(category: string, products: Product[]): IntentType[] {
  const text = `${category} ${products.map((p) => `${p.title} ${p.body_html || ""}`).join(" ")}`.toLowerCase();
  const intents: IntentType[] = ["criteria", "best"];
  if (/€|\$|prix|price|cost|coût/.test(text)) intents.push("price");
  if (/\b\d+(?:[.,]\d+)?\s*(cm|mm|m|inch|inches)\b/.test(text)) intents.push("dimensions");
  if (products.length >= 2) intents.push("comparison");
  if (/mode d'emploi|utilisation|how to|use|installer|assembly|montage/.test(text)) intents.push("howto");
  return [...new Set(intents)];
}

function queryTypeForIntent(intent: IntentType): QueryType {
  if (intent === "comparison") return "comparison";
  if (intent === "criteria" || intent === "howto") return "list";
  return "direct";
}

function computeCitationScore(answer: string, platform: Platform, queryType: QueryType): number {
  let score = 50;
  if (answer.length <= PLATFORM_CONFIGS[platform].preferredAnswerLength) score += 20;
  if (/\d/.test(answer)) score += 10;
  if (queryType === "direct") score += 10;
  if (!/peut-être|maybe|probablement|probably/i.test(answer)) score += 5;
  return Math.min(100, Math.round(score * PLATFORM_CONFIGS[platform].citationWeight));
}

function factualFallback(category: string, products: Product[], intent: IntentType, lang: Lang) {
  const titles = products.slice(0, 3).map((p) => p.title).join(", ");
  const question: Record<IntentType, { fr: string; en: string }> = {
    price: { fr: `Quel est le prix de ${category} ?`, en: `What is the price of ${category}?` },
    dimensions: { fr: `Quelles dimensions pour ${category} ?`, en: `What dimensions are available for ${category}?` },
    criteria: { fr: `Comment choisir ${category} ?`, en: `How to choose ${category}?` },
    comparison: { fr: `Comment comparer les ${category} ?`, en: `How to compare ${category}?` },
    howto: { fr: `Comment utiliser ${category} ?`, en: `How to use ${category}?` },
    best: { fr: `Quel ${category} choisir ?`, en: `Which ${category} should I choose?` },
  };
  const answer = lang === "fr"
    ? `Comparez les caractéristiques réellement indiquées sur les fiches ${titles || category}; ne retenez que les dimensions, matières, prix et usages explicitement fournis.`
    : `Compare only facts explicitly shown on the product pages for ${titles || category}, such as dimensions, materials, prices and stated use cases.`;
  return { question: question[intent][lang], answer, details: "" };
}

async function generateAIAnswer(category: string, products: Product[], intent: IntentType, lang: Lang, projectContext?: ProjectContext) {
  const productContext = products.slice(0, 5).map((p) => ({
    id: p.id,
    title: p.title,
    type: p.product_type,
    vendor: p.vendor,
    facts: `${p.tags || ""} ${(p.body_html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").slice(0, 500)} ${p.seo_description || ""}`.trim(),
  }));

  const brandRule = projectContext?.brand_name
    ? `You may mention the brand ${projectContext.brand_name} only as the source/brand represented by the supplied data. Do not invent endorsements, guarantees or claims.${projectContext.website_url ? ` Website: ${projectContext.website_url}` : ""}`
    : "Do not invent a brand or source.";

  const languageRule = lang === "fr" ? "Réponds en français." : "Answer in English.";
  const prompt = `${languageRule}
Create one useful AEO question and one concise answer for category "${category}" with intent "${intent}".
PRODUCT/SOURCE DATA:
${JSON.stringify(productContext)}
${brandRule}

STRICT FACT RULES:
- Use only facts present in PRODUCT/SOURCE DATA.
- Never invent a price, dimension, warranty, delivery time, review score, material or certification.
- If the requested intent needs a fact that is absent, explicitly say that the exact value must be checked on the product page rather than guessing.
- Answer in maximum 2 short sentences and make it directly useful/citable.

Return JSON only: {"question":"...","answer":"...","details":"facts used"}`;

  try {
    const routed = await routeAI({
      messages: [
        { role: "system", content: "You are an AEO specialist. Factual accuracy is mandatory. Return JSON only." },
        { role: "user", content: prompt },
      ],
      maxTokens: 550,
      temperature: 0.2,
    });
    const match = routed.content.replace(/```json|```/gi, "").match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON object returned");
    const parsed = JSON.parse(match[0]);
    if (!parsed.question || !parsed.answer) throw new Error("Incomplete AEO response");
    return { question: String(parsed.question), answer: String(parsed.answer), details: String(parsed.details || ""), provider: routed.provider, model: routed.model };
  } catch (error) {
    console.warn("[generate-ai-query-opportunities] free AI unavailable; using factual deterministic fallback", error);
    return { ...factualFallback(category, products, intent, lang), provider: "deterministic-fallback", model: "none" };
  }
}

function supportingBullets(category: string, lang: Lang): string[] {
  return lang === "fr"
    ? [`Vérifier les caractéristiques publiées pour ${category}`, "Comparer uniquement des données équivalentes", "Confirmer les informations importantes sur la fiche produit"]
    : [`Check published specifications for ${category}`, "Compare like-for-like product facts", "Confirm important information on the product page"];
}

function faq(category: string, answer: string, lang: Lang): { q: string; a: string }[] {
  return lang === "fr"
    ? [{ q: `Que vérifier avant de choisir ${category} ?`, a: answer }]
    : [{ q: `What should I verify before choosing ${category}?`, a: answer }];
}

async function generateAeoAnswers(products: Product[], platform: Platform, lang: Lang, projectContext?: ProjectContext): Promise<AiAnswer[]> {
  const results: AiAnswer[] = [];
  for (const [category, items] of Object.entries(groupByCategory(products))) {
    for (const intent of getRelevantIntents(category, items).slice(0, 3)) {
      const generated = await generateAIAnswer(category, items, intent, lang, projectContext);
      const queryType = queryTypeForIntent(intent);
      let citationPotential = computeCitationScore(generated.answer, platform, queryType);
      if (projectContext?.brand_name && generated.answer.includes(projectContext.brand_name)) citationPotential = Math.min(100, citationPotential + 5);

      results.push({
        platform,
        query_type: queryType,
        question: generated.question,
        direct_answer: generated.answer,
        answer_confidence: generated.provider === "deterministic-fallback" ? 0.7 : 0.88,
        supporting_content: { bullets: supportingBullets(category, lang), faq: faq(category, generated.answer, lang) },
        citation_potential: citationPotential,
        product_ids: items.slice(0, 5).map((p) => p.id),
        keywords: [...new Set([category.toLowerCase(), intent, queryType, platform, ...(projectContext?.brand_name ? [projectContext.brand_name.toLowerCase()] : [])])],
        difficulty: items.length >= 5 ? "hard" : items.length >= 2 ? "medium" : "easy",
        category,
        project_id: projectContext?.project_id,
        source_id: projectContext?.source_id,
        source_url: projectContext?.source_url,
        brand_mention: projectContext?.brand_name && generated.answer.includes(projectContext.brand_name) ? projectContext.brand_name : undefined,
        ai_provider: generated.provider,
        ai_model: generated.model,
      });
    }
  }
  return results;
}

function limitPerCategory(answers: AiAnswer[], max = 2): AiAnswer[] {
  const grouped: Record<string, AiAnswer[]> = {};
  for (const answer of answers) (grouped[answer.category] ||= []).push(answer);
  return Object.values(grouped).flatMap((items) => items.sort((a, b) => b.citation_potential - a.citation_potential).slice(0, max)).sort((a, b) => b.citation_potential - a.citation_potential);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) throw new Error("Supabase service is not configured");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "No authorization header" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const { storeId, platform, targets, projectType, refresh = false, wizardMode, wizardInput, projectId, brandName, websiteUrl, sourceId, sourceUrl } = body;
    const isAeoreplyMode = projectType === "aeoreply" || !storeId;
    const projectContext: ProjectContext | undefined = projectId && brandName ? { project_id: projectId, brand_name: brandName, website_url: websiteUrl, source_id: sourceId, source_url: sourceUrl } : undefined;

    let platforms: Platform[];
    if (platform === "aeo" && Array.isArray(targets)) platforms = targets.filter((t: Platform) => PLATFORM_CONFIGS[t]);
    else if (platform && PLATFORM_CONFIGS[platform as Platform]) platforms = [platform as Platform];
    else platforms = ["chatgpt", "gemini", "copilot", "claude", "perplexity"];

    if (!refresh && storeId) {
      const { data: cached } = await supabase.from("ai_answers").select("*").eq("user_id", user.id).eq("store_id", storeId).in("platform", platforms).order("citation_potential", { ascending: false });
      if (cached?.length) return new Response(JSON.stringify({ success: true, opportunities: cached, cached: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } else if (refresh && storeId) {
      await supabase.from("ai_answers").delete().eq("user_id", user.id).eq("store_id", storeId).in("platform", platforms);
    }

    let products: Product[] = [];
    if (isAeoreplyMode && wizardMode && wizardInput) {
      if (wizardMode === "url") {
        const url = String(wizardInput);
        products = [{ id: `wizard-url-${Date.now()}`, title: `Content from ${url}`, product_type: "web_content", vendor: (() => { try { return new URL(url).hostname; } catch { return "unknown"; } })(), body_html: `Source URL: ${url}` }];
      } else if (wizardMode === "keywords") {
        const list = Array.isArray(wizardInput) ? wizardInput : [wizardInput];
        products = list.map((kw: string, i: number) => ({ id: `wizard-keyword-${i}-${Date.now()}`, title: String(kw), product_type: "keyword_topic", vendor: "aeoreply", body_html: `Topic: ${kw}` }));
      } else if (wizardMode === "links") {
        const list = Array.isArray(wizardInput) ? wizardInput : [wizardInput];
        products = list.map((link: string, i: number) => ({ id: `wizard-link-${i}-${Date.now()}`, title: `Page: ${link}`, product_type: "web_page", vendor: (() => { try { return new URL(link).hostname; } catch { return "unknown"; } })(), body_html: `Source URL: ${link}` }));
      }
    } else if (storeId) {
      const { data, error } = await supabase.from("shopify_products").select("id, title, product_type, vendor, tags, body_html, seo_description").eq("seller_id", user.id).eq("store_id", storeId).limit(100);
      if (error) throw error;
      products = data || [];
    }

    if (!products.length) return new Response(JSON.stringify({ success: true, opportunities: [], message: isAeoreplyMode ? "No input provided" : "No products found" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const language = detectLanguage(products);
    const allAnswers: any[] = [];
    for (const p of platforms) {
      const answers = limitPerCategory(await generateAeoAnswers(products, p, language, projectContext), 2);
      for (const answer of answers) {
        const { data: inserted, error } = await supabase.from("ai_answers").insert({
          user_id: user.id,
          store_id: storeId ?? null,
          platform: answer.platform,
          query_type: answer.query_type,
          question: answer.question,
          direct_answer: answer.direct_answer,
          answer_confidence: answer.answer_confidence,
          supporting_content: answer.supporting_content,
          citation_potential: answer.citation_potential,
          product_ids: answer.product_ids,
          keywords: answer.keywords,
          difficulty: answer.difficulty,
          category: answer.category,
          status: "pending",
          project_id: answer.project_id ?? null,
          source_id: answer.source_id ?? null,
          source_url: answer.source_url ?? null,
          brand_mention: answer.brand_mention ?? null,
        }).select().single();
        if (!error && inserted) allAnswers.push(inserted);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      opportunities: allAnswers,
      cached: false,
      engine: "generic-multi-industry",
      mode: isAeoreplyMode ? "aeoreply" : "store",
      policy: "openrouter-free>gemini-free>kimi-free>deepseek-free",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("[generate-ai-query-opportunities] error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
