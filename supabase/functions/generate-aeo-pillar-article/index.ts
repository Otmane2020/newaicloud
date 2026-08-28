import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { routeAI } from "../_shared/ai-router.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function parseJson(text: string): any {
  const clean = text.replace(/```json|```/gi, "").trim();
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON returned");
  return JSON.parse(match[0]);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { user_id, store_id, link_to_qas = true } = await req.json();
    if (!user_id) throw new Error("user_id is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const { data: recentAnswers, error: answersError } = await supabase
      .from("ai_answers")
      .select("id, question, direct_answer, keywords, platform")
      .eq("user_id", user_id)
      .gte("created_at", oneWeekAgo.toISOString())
      .not("synced_at", "is", null)
      .order("created_at", { ascending: false })
      .limit(10);
    if (answersError) throw answersError;
    if (!recentAnswers?.length) {
      return new Response(JSON.stringify({ success: false, error: "No recent Q&A articles to create pillar from" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let storeName = "E-commerce store";
    if (store_id) {
      const { data: store } = await supabase.from("shopify_connections").select("shop_name").eq("id", store_id).maybeSingle();
      if (store?.shop_name) storeName = store.shop_name;
    }

    const allKeywords = recentAnswers.flatMap((a: any) => a.keywords || []);
    const counts: Record<string, number> = {};
    allKeywords.forEach((k: string) => counts[k] = (counts[k] || 0) + 1);
    const topKeywords = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k);
    const questionsContext = recentAnswers.map((a: any, i: number) => `${i + 1}. Q: ${a.question}\nA: ${a.direct_answer}`).join("\n\n");

    const routed = await routeAI({
      messages: [
        { role: "system", content: "You are an expert SEO/AEO writer. Return valid JSON only. Do not invent claims beyond the supplied Q&A." },
        { role: "user", content: `Create a comprehensive pillar article synthesizing these verified Q&A. Store: ${storeName}. Keywords: ${topKeywords.join(", ")}.\n\n${questionsContext}\n\nReturn JSON with title, meta_description, content (semantic HTML), keywords. Include clear answer-first sections and an FAQ. Aim for useful depth, not filler.` },
      ],
      maxTokens: 5000,
      temperature: 0.45,
    });

    let articleData: any;
    try {
      articleData = parseJson(routed.content);
    } catch {
      articleData = {
        title: `Complete Guide: ${topKeywords[0] || "Expert Insights"}`,
        meta_description: `Comprehensive guide about ${topKeywords.join(", ")}`.slice(0, 155),
        content: `<article>${routed.content}</article>`,
        keywords: topKeywords,
      };
    }

    const linkedQaIds = recentAnswers.map((a: any) => a.id);
    const { data: pillarArticle, error: pillarError } = await supabase.from("aeo_pillar_articles").insert({
      user_id,
      store_id,
      title: articleData.title,
      topic: topKeywords[0] || "General",
      content: articleData.content,
      meta_description: articleData.meta_description,
      keywords: articleData.keywords || topKeywords,
      linked_qa_ids: linkedQaIds,
      status: "published",
      published_at: new Date().toISOString(),
    }).select().single();
    if (pillarError) throw pillarError;

    const { data: blogArticle } = await supabase.from("blog_articles").insert({
      user_id,
      store_id,
      title: articleData.title,
      content: articleData.content,
      meta_description: articleData.meta_description,
      keywords: articleData.keywords || topKeywords,
      status: "draft",
      source: "ai_generated",
    }).select().maybeSingle();

    if (blogArticle?.id) await supabase.from("aeo_pillar_articles").update({ article_id: blogArticle.id }).eq("id", pillarArticle.id);
    if (link_to_qas) console.log(`[generate-aeo-pillar-article] linked ${linkedQaIds.length} Q&A references`);

    return new Response(JSON.stringify({
      success: true,
      article: { id: pillarArticle.id, title: pillarArticle.title, blog_article_id: blogArticle?.id },
      linked_qa_count: linkedQaIds.length,
      provider: routed.provider,
      model: routed.model,
      policy: "free-only",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
