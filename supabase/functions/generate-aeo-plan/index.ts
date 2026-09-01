import "../_shared/strict-ai-generation.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,apikey,X-Client-Info",
};

const DAY_MS = 24 * 60 * 60 * 1000;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function stripHtml(value: unknown) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(value: unknown) {
  return stripHtml(value)
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function keywordsFromTitle(title: string, topic?: string) {
  const stop = new Set([
    "avec", "pour", "dans", "des", "les", "une", "sur", "votre", "vos", "guide", "comment", "choisir",
    "with", "for", "the", "and", "your", "guide", "how", "choose", "best", "meilleurs", "meilleur",
  ]);
  return Array.from(new Set(normalize(`${title} ${topic || ""}`).split(" ").filter((w) => w.length > 2 && !stop.has(w)))).slice(0, 8);
}

function targetArticleCount(productCount: number, collectionCount: number) {
  if (productCount >= 500 || collectionCount >= 30) return 12;
  if (productCount >= 150 || collectionCount >= 15) return 10;
  if (productCount >= 40 || collectionCount >= 6) return 8;
  return 6;
}

function representativeSample<T>(items: T[], max: number) {
  if (items.length <= max) return items;
  const result: T[] = [];
  const step = items.length / max;
  for (let i = 0; i < max; i += 1) result.push(items[Math.floor(i * step)]);
  return result;
}

async function fetchAllProducts(supabase: any, storeId: string) {
  const rows: any[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("shopify_products")
      .select("id,title,handle,description,body_html,category,product_type,tags,collection_ids,characteristics,status")
      .eq("store_id", storeId)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

async function fetchAllCollections(supabase: any, storeId: string) {
  const rows: any[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("shopify_collections")
      .select("id,title,handle,body_html,products_count")
      .eq("store_id", storeId)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

async function ensureCalendar(supabase: any, userId: string, storeId: string) {
  const { data: existing, error } = await supabase
    .from("aeo_publication_calendar")
    .select("*")
    .eq("user_id", userId)
    .eq("store_id", storeId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (existing) return existing;

  const { data, error: insertError } = await supabase
    .from("aeo_publication_calendar")
    .insert({
      user_id: userId,
      store_id: storeId,
      is_active: true,
      pillar_frequency: "adaptive_ai",
      publication_hour: 10,
      qa_per_day: 1,
      link_qa_to_pillar: true,
    })
    .select()
    .single();
  if (insertError) throw insertError;
  return data;
}

function buildFallbackPlan(params: {
  needed: number;
  fr: boolean;
  opportunities: any[];
  collections: any[];
  categories: Array<[string, number]>;
  products: any[];
  existingTitles: Set<string>;
}) {
  const { needed, fr, opportunities, collections, categories, products, existingTitles } = params;
  const candidates: Array<{ title: string; topic: string; keywords: string[]; day_offset?: number }> = [];

  const add = (title: string, topic: string) => {
    const key = normalize(title);
    if (!key || existingTitles.has(key) || candidates.some((item) => normalize(item.title) === key)) return;
    candidates.push({ title: title.slice(0, 110), topic, keywords: keywordsFromTitle(title, topic) });
  };

  for (const opportunity of opportunities) {
    const title = stripHtml(opportunity.suggested_title || opportunity.question);
    if (title) add(title, stripHtml(opportunity.query_type || "GEO opportunity"));
    if (candidates.length >= needed) return candidates;
  }

  for (const collection of collections) {
    const name = stripHtml(collection.title);
    if (!name) continue;
    add(
      fr ? `${name} : guide de choix, usages et conseils` : `${name}: buying guide, uses and expert advice`,
      name,
    );
    if (candidates.length >= needed) return candidates;
  }

  for (const [category] of categories) {
    if (!category || category === "Autres") continue;
    add(
      fr ? `Comment choisir ${category} selon vos besoins ?` : `How to choose ${category} for your needs`,
      category,
    );
    if (candidates.length >= needed) return candidates;
  }

  for (const product of representativeSample(products, needed * 2)) {
    const name = stripHtml(product.title);
    if (!name) continue;
    add(
      fr ? `${name} : dimensions, style et critères de choix` : `${name}: size, style and buying criteria`,
      stripHtml(product.category || product.product_type || "Product guide"),
    );
    if (candidates.length >= needed) return candidates;
  }

  while (candidates.length < needed) {
    const number = candidates.length + 1;
    add(
      fr ? `Guide expert de la boutique : bien choisir ses produits #${number}` : `Store expert guide: how to choose products #${number}`,
      fr ? "Guide expert" : "Expert guide",
    );
  }
  return candidates;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ success: false, error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, serviceKey);
    const body = await req.json();
    const storeId = String(body.store_id || "");
    const requestedUserId = body.user_id ? String(body.user_id) : "";
    const requestedLanguage = String(body.language || "").toLowerCase();
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");

    if (!storeId) return jsonResponse({ success: false, error: "store_id is required" }, 400);

    let userId = requestedUserId;
    if (token && token !== serviceKey) {
      const { data: authData, error: authError } = await supabase.auth.getUser(token);
      if (authError || !authData.user) return jsonResponse({ success: false, error: "Unauthorized" }, 401);
      if (requestedUserId && requestedUserId !== authData.user.id) return jsonResponse({ success: false, error: "Forbidden" }, 403);
      userId = authData.user.id;
    } else if (token !== serviceKey && !userId) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    if (!userId) return jsonResponse({ success: false, error: "user_id is required" }, 400);

    const { data: store, error: storeError } = await supabase
      .from("shopify_connections")
      .select("id,user_id,store_name,store_url,public_domain")
      .eq("id", storeId)
      .eq("user_id", userId)
      .maybeSingle();
    if (storeError) throw storeError;
    if (!store) return jsonResponse({ success: false, error: "Store not found for user" }, 404);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const end = new Date(today.getTime() + 29 * DAY_MS);
    end.setUTCHours(23, 59, 59, 999);

    const [calendar, productCountResult, collectionCountResult, existingResult] = await Promise.all([
      ensureCalendar(supabase, userId, storeId),
      supabase.from("shopify_products").select("id", { count: "exact", head: true }).eq("store_id", storeId),
      supabase.from("shopify_collections").select("id", { count: "exact", head: true }).eq("store_id", storeId),
      supabase
        .from("aeo_pillar_articles")
        .select("id,title,topic,keywords,scheduled_for,status")
        .eq("user_id", userId)
        .eq("store_id", storeId)
        .gte("scheduled_for", today.toISOString())
        .lte("scheduled_for", end.toISOString())
        .order("scheduled_for", { ascending: true }),
    ]);

    if (productCountResult.error) throw productCountResult.error;
    if (collectionCountResult.error) throw collectionCountResult.error;
    if (existingResult.error) throw existingResult.error;

    const productCount = productCountResult.count || 0;
    const collectionCount = collectionCountResult.count || 0;
    const target = targetArticleCount(productCount, collectionCount);
    const existing = existingResult.data || [];
    const needed = Math.max(0, target - existing.length);

    if (needed === 0) {
      return jsonResponse({ success: true, created: 0, target, existing: existing.length, plan: existing, source: "native_aeo" });
    }

    const [products, collections, opportunitiesResult, historyResult, olderPillarsResult] = await Promise.all([
      fetchAllProducts(supabase, storeId),
      fetchAllCollections(supabase, storeId),
      supabase
        .from("ai_opportunities")
        .select("question,suggested_title,keywords,product_ids,query_type,citation_potential,difficulty")
        .eq("user_id", userId)
        .eq("store_id", storeId)
        .order("citation_potential", { ascending: false })
        .limit(80),
      supabase
        .from("blog_articles")
        .select("title")
        .eq("user_id", userId)
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(150),
      supabase
        .from("aeo_pillar_articles")
        .select("title")
        .eq("user_id", userId)
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(150),
    ]);

    if (opportunitiesResult.error) console.warn("Could not load GEO opportunities", opportunitiesResult.error.message);
    if (historyResult.error) console.warn("Could not load article history", historyResult.error.message);
    if (olderPillarsResult.error) console.warn("Could not load older GEO pillars", olderPillarsResult.error.message);

    if (products.length === 0 && collections.length === 0) {
      return jsonResponse({ success: true, created: 0, target, existing: existing.length, reason: "catalog_empty" });
    }

    const opportunities = opportunitiesResult.data || [];
    const existingTitles = new Set<string>();
    for (const row of [...existing, ...(historyResult.data || []), ...(olderPillarsResult.data || [])]) {
      if (row?.title) existingTitles.add(normalize(row.title));
    }

    const categoryCounts = new Map<string, number>();
    const collectionProducts = new Map<string, string[]>();
    for (const product of products) {
      const category = stripHtml(product.category || product.product_type || "Autres") || "Autres";
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
      for (const collectionId of Array.isArray(product.collection_ids) ? product.collection_ids : []) {
        const list = collectionProducts.get(String(collectionId)) || [];
        if (list.length < 8) list.push(stripHtml(product.title));
        collectionProducts.set(String(collectionId), list);
      }
    }
    const categories = Array.from(categoryCounts.entries()).sort((a, b) => b[1] - a[1]);

    const collectionContext = collections.map((collection) => {
      const samples = (collectionProducts.get(String(collection.id)) || []).filter(Boolean).slice(0, 6);
      return {
        title: stripHtml(collection.title),
        description: stripHtml(collection.body_html).slice(0, 240),
        products: collection.products_count || samples.length,
        samples,
      };
    });

    const productContext = representativeSample(products, 240).map((product) => ({
      title: stripHtml(product.title),
      category: stripHtml(product.category || product.product_type),
      description: stripHtml(product.description || product.body_html || product.characteristics).slice(0, 180),
    }));

    const fr = requestedLanguage === "fr" || (!requestedLanguage && /\b(le|la|les|de|du|des|pour|avec)\b/i.test(products.slice(0, 20).map((p) => p.title).join(" ")));
    const languageName = fr ? "French" : "English";

    let generatedItems: Array<{ title: string; topic: string; keywords: string[]; day_offset?: number; meta_description?: string }> = [];

    if (lovableApiKey) {
      try {
        const prompt = `You are the autonomous GEO/AEO content planner for an ecommerce store.
Create exactly ${needed} NEW pillar-article ideas for the next 30 days, in ${languageName}.

The system scanned the ENTIRE local store before building this brief:
- Store: ${store.store_name || store.public_domain || store.store_url}
- Products scanned: ${products.length}
- Collections scanned: ${collections.length}
- Target total plan size: ${target} articles
- Existing upcoming GEO articles: ${existing.length}

CATALOG CATEGORY COVERAGE (computed from every product):
${categories.slice(0, 60).map(([name, count]) => `- ${name}: ${count}`).join("\n")}

COLLECTIONS (all local collections, with representative products):
${JSON.stringify(collectionContext.slice(0, 120))}

REPRESENTATIVE PRODUCT SAMPLE (selected across the full catalog after full-catalog aggregation):
${JSON.stringify(productContext)}

HIGH-VALUE GEO/AI SEARCH OPPORTUNITIES ALREADY FOUND LOCALLY:
${JSON.stringify(opportunities.slice(0, 50).map((o: any) => ({
  question: o.question,
  suggested_title: o.suggested_title,
  keywords: o.keywords,
  query_type: o.query_type,
  citation_potential: o.citation_potential,
})))}

EXISTING/PREVIOUS TITLES TO AVOID:
${Array.from(existingTitles).slice(0, 220).join(" | ")}

Rules:
1. Ground every topic in the real catalog/collections above. Never invent a product or collection.
2. Diversify the plan: collection/category guides, comparisons, buying criteria, problem/solution queries, product-use expertise, and citation-friendly answer-first topics.
3. Prefer questions and intents that AI search engines can quote/cite.
4. Cover different parts of the catalog instead of repeating the same best-selling theme.
5. No prices, fake claims, fake reviews, fake statistics, or invented specifications.
6. Titles should be natural and useful, not keyword-stuffed.
7. day_offset must be an integer from 0 to 29 and spread ideas across the period.
8. Return strict JSON only in this exact shape:
{"articles":[{"title":"...","topic":"...","keywords":["..."],"day_offset":3,"meta_description":"..."}]}`;

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${lovableApiKey}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "Return only valid JSON. Build grounded ecommerce GEO/AEO plans from supplied local catalog data." },
              { role: "user", content: prompt },
            ],
            temperature: 0.45,
            max_tokens: 4200,
          }),
        });
        if (!response.ok) throw new Error(`AI planner returned ${response.status}`);
        const aiData = await response.json();
        const raw = String(aiData.choices?.[0]?.message?.content || "");
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("AI planner returned no JSON");
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed.articles)) {
          generatedItems = parsed.articles
            .filter((item: any) => item && stripHtml(item.title) && stripHtml(item.topic))
            .map((item: any) => ({
              title: stripHtml(item.title).slice(0, 110),
              topic: stripHtml(item.topic).slice(0, 140),
              keywords: Array.isArray(item.keywords) ? item.keywords.map(stripHtml).filter(Boolean).slice(0, 10) : keywordsFromTitle(item.title, item.topic),
              day_offset: Number.isFinite(Number(item.day_offset)) ? Math.max(0, Math.min(29, Math.round(Number(item.day_offset)))) : undefined,
              meta_description: stripHtml(item.meta_description).slice(0, 300),
            }));
        }
      } catch (error) {
        console.warn("GEO AI planning failed, using deterministic local fallback", error);
      }
    }

    const uniqueGenerated: typeof generatedItems = [];
    for (const item of generatedItems) {
      const key = normalize(item.title);
      if (!key || existingTitles.has(key) || uniqueGenerated.some((row) => normalize(row.title) === key)) continue;
      uniqueGenerated.push(item);
      if (uniqueGenerated.length >= needed) break;
    }

    if (uniqueGenerated.length < needed) {
      const fallback = buildFallbackPlan({
        needed: needed - uniqueGenerated.length,
        fr,
        opportunities,
        collections,
        categories,
        products,
        existingTitles: new Set([...existingTitles, ...uniqueGenerated.map((item) => normalize(item.title))]),
      });
      uniqueGenerated.push(...fallback);
    }

    const usedDates = new Set(
      existing
        .map((row: any) => row.scheduled_for ? String(row.scheduled_for).slice(0, 10) : "")
        .filter(Boolean),
    );
    const publicationHour = Number.isFinite(Number(calendar?.publication_hour)) ? Number(calendar.publication_hour) : 10;

    const rowsToInsert = uniqueGenerated.slice(0, needed).map((item, index) => {
      let offset = item.day_offset ?? Math.round(((index + 1) * 28) / (needed + 1));
      offset = Math.max(0, Math.min(29, offset));
      let scheduled = new Date(today.getTime() + offset * DAY_MS);
      scheduled.setUTCHours(publicationHour, 0, 0, 0);
      let guard = 0;
      while (usedDates.has(scheduled.toISOString().slice(0, 10)) && guard < 30) {
        scheduled = new Date(scheduled.getTime() + DAY_MS);
        if (scheduled > end) scheduled = new Date(today.getTime() + (guard % 30) * DAY_MS);
        scheduled.setUTCHours(publicationHour, 0, 0, 0);
        guard += 1;
      }
      usedDates.add(scheduled.toISOString().slice(0, 10));
      return {
        user_id: userId,
        store_id: storeId,
        title: item.title,
        topic: item.topic,
        keywords: item.keywords?.length ? item.keywords : keywordsFromTitle(item.title, item.topic),
        meta_description: item.meta_description || null,
        scheduled_for: scheduled.toISOString(),
        status: "planned",
      };
    });

    const { data: inserted, error: insertError } = await supabase
      .from("aeo_pillar_articles")
      .insert(rowsToInsert)
      .select("id,title,topic,keywords,scheduled_for,status");
    if (insertError) throw insertError;

    const allPlanned = [...existing, ...(inserted || [])].sort((a: any, b: any) =>
      String(a.scheduled_for || "").localeCompare(String(b.scheduled_for || "")),
    );
    const firstScheduled = allPlanned.find((row: any) => row.scheduled_for)?.scheduled_for || null;
    if (calendar?.id && firstScheduled) {
      await supabase
        .from("aeo_publication_calendar")
        .update({ next_pillar_scheduled_at: firstScheduled, updated_at: new Date().toISOString() })
        .eq("id", calendar.id);
    }

    return jsonResponse({
      success: true,
      created: inserted?.length || 0,
      target,
      existing: existing.length,
      products_scanned: products.length,
      collections_scanned: collections.length,
      opportunities_used: opportunities.length,
      plan: allPlanned,
      source: lovableApiKey ? "ai_with_local_fallback" : "local_fallback",
    });
  } catch (error) {
    console.error("generate-aeo-plan failed", error);
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
