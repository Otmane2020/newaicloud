import "../_shared/strict-ai-generation.ts";
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,apikey",
};

function calculateNextExecution(frequency: string, lastRun: Date): Date {
  const next = new Date(lastRun);
  switch ((frequency || "weekly").toLowerCase()) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "bi-weekly":
    case "biweekly":
      next.setDate(next.getDate() + 14);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    default:
      next.setDate(next.getDate() + 7);
  }
  return next;
}

function normalize(value: unknown) {
  return String(value || "")
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function relevanceTerms(pillar: any) {
  const words = normalize(`${pillar.title || ""} ${pillar.topic || ""} ${(pillar.keywords || []).join(" ")}`)
    .split(" ")
    .filter((word) => word.length > 2);
  return Array.from(new Set(words));
}

async function findRelevantProductIds(storeId: string, pillar: any) {
  const { data, error } = await supabase
    .from("shopify_products")
    .select("id,title,category,product_type,tags,description,body_html")
    .eq("store_id", storeId)
    .limit(500);

  if (error) {
    console.error("GEO product-context lookup failed", error);
    return [];
  }

  const terms = relevanceTerms(pillar);
  const scored = (data || []).map((product: any) => {
    const title = normalize(product.title);
    const category = normalize(`${product.category || ""} ${product.product_type || ""}`);
    const tags = normalize(Array.isArray(product.tags) ? product.tags.join(" ") : product.tags);
    const description = normalize(`${product.description || ""} ${product.body_html || ""}`);
    let score = 0;
    for (const term of terms) {
      if (title.includes(term)) score += 8;
      if (category.includes(term)) score += 5;
      if (tags.includes(term)) score += 3;
      if (description.includes(term)) score += 1;
    }
    return { id: product.id, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const relevant = scored.filter((item) => item.score > 0).slice(0, 6);
  return (relevant.length > 0 ? relevant : scored.slice(0, 6)).map((item) => item.id);
}

async function ensureGeoPlans(calendars: any[]) {
  const results: any[] = [];
  for (const calendar of calendars) {
    if (!calendar.store_id || !calendar.user_id) continue;
    try {
      const { data, error } = await supabase.functions.invoke("generate-aeo-plan", {
        body: {
          user_id: calendar.user_id,
          store_id: calendar.store_id,
        },
      });
      if (error) throw error;
      results.push({ store_id: calendar.store_id, success: true, created: data?.created || 0 });
    } catch (error: any) {
      console.error("Failed to maintain GEO plan", calendar.store_id, error);
      results.push({ store_id: calendar.store_id, success: false, error: error?.message || "Unknown error" });
    }
  }
  return results;
}

async function processBlogCampaigns(now: string, currentHour: number) {
  const { data: campaigns, error: fetchError } = await supabase
    .from("blog_campaigns")
    .select("*")
    .eq("is_active", true)
    .lte("next_execution_at", now);
  if (fetchError) throw fetchError;

  const campaignsToProcess = (campaigns || []).filter((campaign: any) =>
    (campaign.execution_hour ?? 12) === currentHour,
  );
  const results: any[] = [];

  for (const campaign of campaignsToProcess) {
    try {
      const { data: generationResult, error: generationError } = await supabase.functions.invoke(
        "generate-blog-article",
        {
          body: {
            user_id: campaign.user_id,
            store_id: campaign.store_id,
            campaign_id: campaign.id,
            category: campaign.topic_niche || "Guide",
            keywords: campaign.keywords || [],
            targetAudience: campaign.target_audience || undefined,
            collectionIds: campaign.collection_ids || [],
            productIds: campaign.product_ids || [],
            mode: "auto",
          },
        },
      );
      if (generationError) throw generationError;
      if (!generationResult?.article?.id) throw new Error("Article generation returned no article id");

      const nextExecution = calculateNextExecution(campaign.frequency || "weekly", new Date());
      await supabase
        .from("blog_campaigns")
        .update({
          last_run_at: now,
          next_execution_at: nextExecution.toISOString(),
          last_generation_date: now,
        })
        .eq("id", campaign.id);

      let published = false;
      if (campaign.auto_post) {
        const { data: syncData, error: syncError } = await supabase.functions.invoke("sync-blog-to-shopify", {
          body: {
            articleId: generationResult.article.id,
            shopify_connection_id: campaign.store_id,
          },
        });
        if (syncError || syncData?.success === false) {
          console.error("Blog auto-publish failed", syncError || syncData?.error);
        } else {
          published = true;
        }
      }

      results.push({
        campaign_id: campaign.id,
        campaign_name: campaign.name,
        success: true,
        article_id: generationResult.article.id,
        published,
        next_execution: nextExecution.toISOString(),
      });
    } catch (error: any) {
      console.error(`Error processing blog campaign ${campaign.name}`, error);
      results.push({
        campaign_id: campaign.id,
        campaign_name: campaign.name,
        success: false,
        error: error?.message || "Unknown error",
      });
    }
  }

  return {
    total_due: campaigns?.length || 0,
    matched_hour: campaignsToProcess.length,
    results,
  };
}

async function processGeoPillars(now: string, activeCalendars: any[]) {
  const activeByStore = new Map<string, any>();
  for (const calendar of activeCalendars) {
    if (calendar.store_id) activeByStore.set(String(calendar.store_id), calendar);
  }

  if (activeByStore.size === 0) return [];

  const { data: pillars, error } = await supabase
    .from("aeo_pillar_articles")
    .select("id,user_id,store_id,title,topic,keywords,status,article_id,scheduled_for,published_at")
    .in("status", ["planned", "generated", "publish_failed"])
    .lte("scheduled_for", now)
    .order("scheduled_for", { ascending: true })
    .limit(100);
  if (error) throw error;

  const results: any[] = [];
  for (const pillar of pillars || []) {
    const storeId = pillar.store_id ? String(pillar.store_id) : "";
    const calendar = activeByStore.get(storeId);
    if (!calendar || !pillar.user_id || !storeId) continue;

    try {
      let articleId = pillar.article_id ? String(pillar.article_id) : "";

      if (!articleId) {
        const { data: claimed, error: claimError } = await supabase
          .from("aeo_pillar_articles")
          .update({ status: "generating", updated_at: now })
          .eq("id", pillar.id)
          .eq("status", "planned")
          .select("id")
          .maybeSingle();
        if (claimError) throw claimError;
        if (!claimed) continue;

        const productIds = await findRelevantProductIds(storeId, pillar);
        const { data: generationResult, error: generationError } = await supabase.functions.invoke(
          "generate-blog-article",
          {
            body: {
              user_id: pillar.user_id,
              store_id: storeId,
              title: pillar.title,
              category: pillar.topic || "GEO / AI Search",
              keywords: pillar.keywords || [],
              productIds,
              collectionIds: [],
              mode: "aeo",
              editorialAngle: "guide",
            },
          },
        );
        if (generationError) throw generationError;
        articleId = generationResult?.article?.id ? String(generationResult.article.id) : "";
        if (!articleId) throw new Error("GEO article generation returned no article id");

        await Promise.all([
          supabase
            .from("blog_articles")
            .update({ source: "aeo" })
            .eq("id", articleId)
            .eq("user_id", pillar.user_id)
            .eq("store_id", storeId),
          supabase
            .from("aeo_pillar_articles")
            .update({ article_id: articleId, status: "generated", updated_at: now })
            .eq("id", pillar.id),
        ]);
      }

      const { data: syncData, error: syncError } = await supabase.functions.invoke("sync-blog-to-shopify", {
        body: {
          articleId,
          shopify_connection_id: storeId,
        },
      });

      if (syncError || syncData?.success === false) {
        const reason = syncError?.message || syncData?.error || "Shopify sync failed";
        await supabase
          .from("aeo_pillar_articles")
          .update({ status: "publish_failed", updated_at: new Date().toISOString() })
          .eq("id", pillar.id);
        results.push({ pillar_id: pillar.id, article_id: articleId, success: false, stage: "publish", error: reason });
        continue;
      }

      const publishedAt = new Date().toISOString();
      await supabase
        .from("aeo_pillar_articles")
        .update({ status: "published", published_at: publishedAt, updated_at: publishedAt })
        .eq("id", pillar.id);

      await supabase
        .from("aeo_publication_calendar")
        .update({
          last_pillar_published_at: publishedAt,
          total_pillars_published: Number(calendar.total_pillars_published || 0) + 1,
          updated_at: publishedAt,
        })
        .eq("id", calendar.id);
      calendar.total_pillars_published = Number(calendar.total_pillars_published || 0) + 1;

      results.push({ pillar_id: pillar.id, article_id: articleId, success: true, published: true });
    } catch (error: any) {
      console.error(`Error processing GEO pillar ${pillar.id}`, error);
      await supabase
        .from("aeo_pillar_articles")
        .update({ status: pillar.article_id ? "publish_failed" : "planned", updated_at: new Date().toISOString() })
        .eq("id", pillar.id);
      results.push({ pillar_id: pillar.id, success: false, error: error?.message || "Unknown error" });
    }
  }
  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders, status: 204 });

  try {
    const now = new Date().toISOString();
    const currentHour = new Date().getUTCHours();
    console.log(`Starting Blog + GEO automation at UTC hour ${currentHour}`);

    const { data: activeCalendars, error: calendarError } = await supabase
      .from("aeo_publication_calendar")
      .select("id,user_id,store_id,is_active,publication_hour,total_pillars_published")
      .eq("is_active", true);
    if (calendarError) throw calendarError;

    const planMaintenance = await ensureGeoPlans(activeCalendars || []);
    const [blog, geo] = await Promise.all([
      processBlogCampaigns(now, currentHour),
      processGeoPillars(now, activeCalendars || []),
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        currentHour,
        planMaintenance,
        blog,
        geo,
        processed: blog.results.length + geo.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Blog + GEO automation fatal error", error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
