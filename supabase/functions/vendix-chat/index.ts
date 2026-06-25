// Vendix Chat - Lovable AI Gateway (fast Gemini Flash, vision-capable)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CatalogProduct {
  id: string;
  title: string;
  price: number | string | null;
  image_url: string | null;
  handle: string | null;
  product_type: string | null;
  vendor: string | null;
  description: string | null;
}

async function loadCatalog(authHeader: string | null): Promise<{ products: CatalogProduct[]; sellerId: string | null; storeUrl: string | null }> {
  if (!authHeader) return { products: [], sellerId: null, storeUrl: null };
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const token = authHeader.replace("Bearer ", "");
  const { data: userData } = await supabase.auth.getUser(token);
  const user = userData?.user;
  if (!user) return { products: [], sellerId: null, storeUrl: null };

  const { data: conn } = await supabase
    .from("shopify_connections")
    .select("store_url,public_domain")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("last_sync_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const storeUrl = conn?.public_domain || conn?.store_url || null;

  const { data: rows } = await supabase
    .from("shopify_products")
    .select("id,title,price,image_url,handle,product_type,vendor,body_html")
    .eq("seller_id", user.id)
    .not("image_url", "is", null)
    .order("updated_at", { ascending: false })
    .limit(200);

  const products: CatalogProduct[] = (rows || []).map((r: any) => ({
    id: r.id,
    title: r.title,
    price: r.price,
    image_url: r.image_url,
    handle: r.handle,
    product_type: r.product_type,
    vendor: r.vendor,
    description: r.body_html ? String(r.body_html).replace(/<[^>]+>/g, " ").slice(0, 160) : null,
  }));
  return { products, sellerId: user.id, storeUrl };
}

function buildCatalogPrompt(products: CatalogProduct[], lang: "fr" | "en"): string {
  if (!products.length) return "";
  const lines = products
    .map((p) => `- [ID:${p.id}] ${p.title}${p.price ? ` — ${p.price}€` : ""}${p.product_type ? ` · ${p.product_type}` : ""}`)
    .join("\n");
  return lang === "fr"
    ? `\n\nCATALOGUE DU SHOWROOM (${products.length} produits, chaque produit a déjà une image et un prix accessibles via son ID):\n${lines}\n\nRÈGLES STRICTES — Vendix, robot vendeur :\n• Réponses TRÈS COURTES (1-2 phrases max), chaleureuses et naturelles, comme un vrai vendeur.\n• N'utilise JAMAIS de markdown, d'astérisques, de listes à puces ou de tirets dans ta réponse.\n• Ne dis JAMAIS "cliquez sur les IDs" ou "interface du showroom" — les images apparaissent automatiquement sous ta réponse.\n• Quand le client cherche un produit OU demande des photos/images/exemples, recommande 2 à 4 produits pertinents et termine par EXACTEMENT cette ligne (sur sa propre ligne) :\n[PRODUCTS:id1,id2,id3]\n• Ne mentionne JAMAIS les IDs dans la prose. La ligne [PRODUCTS:...] est invisible pour le client.\n• Pose des questions ouvertes pour mieux conseiller (matière, style, budget, pièce).`
    : `\n\nSHOWROOM CATALOG (${products.length} products, each one has an image and price linked to its ID):\n${lines}\n\nSTRICT RULES — Vendix sales robot:\n• VERY SHORT replies (1-2 sentences max), warm and natural like a real seller.\n• NEVER use markdown, asterisks, bullet lists or dashes.\n• NEVER say "click the IDs" or "showroom interface" — images appear automatically below your reply.\n• When the customer asks for a product OR for pictures/photos, recommend 2 to 4 relevant products and end with EXACTLY this line on its own:\n[PRODUCTS:id1,id2,id3]\n• Never mention IDs in prose. The [PRODUCTS:...] line is invisible to the customer.\n• Ask open questions to advise better (material, style, budget, room).`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, system, language, image } = await req.json();
    const lang: "fr" | "en" = language === "en" ? "en" : "fr";

    const { products, storeUrl } = await loadCatalog(req.headers.get("Authorization"));
    const catalogPrompt = buildCatalogPrompt(products, lang);
    const systemFinal = `${system || ""}${catalogPrompt}`.trim();

    const chatMessages: any[] = systemFinal
      ? [{ role: "system", content: systemFinal }]
      : [];
    const history = (messages || []) as Array<{ role: "user" | "assistant"; content: string }>;
    // Keep only last 12 turns to keep latency low
    const trimmed = history.slice(-12);

    if (image && trimmed.length > 0) {
      const last = trimmed[trimmed.length - 1];
      chatMessages.push(...trimmed.slice(0, -1));
      chatMessages.push({
        role: last.role,
        content: [
          { type: "text", text: last.content || (lang === "fr" ? "Identifie ce produit dans le catalogue." : "Identify this product in the catalog.") },
          { type: "image_url", image_url: { url: image } },
        ],
      });
    } else {
      chatMessages.push(...trimmed);
    }

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) throw new Error("Missing OPENROUTER_API_KEY");

    const modelChain = image
      ? ["google/gemma-4-31b-it:free", "qwen/qwen3-vl-72b:free", "meta-llama/llama-3.3-70b:free"]
      : ["meta-llama/llama-3.3-70b:free", "openai/gpt-oss-120b:free", "qwen/qwen3-coder:free", "deepseek/deepseek-r1:free"];

    let aiRes: Response | null = null;
    let lastErr = "";
    for (const model of modelChain) {
      aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://vendix.sale",
          "X-Title": "Vendix",
        },
        body: JSON.stringify({
          model,
          messages: chatMessages,
          temperature: 0.6,
          max_tokens: 280,
        }),
      });
      if (aiRes.ok) break;
      lastErr = await aiRes.text();
      // 404 = model unavailable, try next. Otherwise bail.
      if (aiRes.status !== 404 && aiRes.status !== 400) break;
    }

    if (!aiRes || !aiRes.ok) {
      const status = aiRes?.status === 429 ? 429 : aiRes?.status === 402 ? 402 : 500;
      return new Response(JSON.stringify({ error: `OpenRouter ${aiRes?.status}: ${lastErr.slice(0, 300)}` }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    const data = await aiRes.json();
    const raw: string = data?.choices?.[0]?.message?.content || "";

    let reply = raw;
    let productIds: string[] = [];
    const match = raw.match(/\[PRODUCTS:\s*([^\]]+)\]/i);
    if (match) {
      productIds = match[1]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 4);
      reply = raw.replace(match[0], "").trim();
    }
    // Strip any stray markdown markers the model may still emit
    reply = reply.replace(/\*\*/g, "").replace(/^\s*[-*]\s+/gm, "").trim();

    const recommended = productIds
      .map((id) => products.find((p) => p.id === id))
      .filter(Boolean)
      .map((p) => ({
        id: p!.id,
        title: p!.title,
        price: p!.price,
        image_url: p!.image_url,
        handle: p!.handle,
        checkout_url: storeUrl && p!.handle
          ? `https://${storeUrl.replace(/^https?:\/\//, "")}/products/${p!.handle}`
          : null,
      }));

    return new Response(JSON.stringify({ reply, products: recommended, storeUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("vendix-chat error:", e);
    const msg = String(e?.message || e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
