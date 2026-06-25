// Vendix Chat - OpenRouter free-model fallback + catalog awareness
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callOpenRouter } from "../_shared/openrouter.ts";

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
    .limit(150);

  const products: CatalogProduct[] = (rows || []).map((r: any) => ({
    id: r.id,
    title: r.title,
    price: r.price,
    image_url: r.image_url,
    handle: r.handle,
    product_type: r.product_type,
    vendor: r.vendor,
    description: r.body_html ? String(r.body_html).replace(/<[^>]+>/g, " ").slice(0, 200) : null,
  }));
  return { products, sellerId: user.id, storeUrl };
}

function buildCatalogPrompt(products: CatalogProduct[], lang: "fr" | "en"): string {
  if (!products.length) return "";
  const lines = products
    .map((p, i) => `${i + 1}. [ID:${p.id}] ${p.title}${p.price ? ` — ${p.price}€` : ""}${p.product_type ? ` (${p.product_type})` : ""}`)
    .join("\n");
  return lang === "fr"
    ? `\n\nCATALOGUE DU SHOWROOM (${products.length} produits disponibles, tu as accès aux images):\n${lines}\n\nIMPORTANT: Quand tu recommandes des produits, termine TOUJOURS ta réponse par une ligne au format exact:\n[PRODUCTS:id1,id2,id3]\nMaximum 4 IDs. Ne mentionne pas les IDs dans le texte. Sois chaleureux et propose des produits pertinents du catalogue ci-dessus.`
    : `\n\nSHOWROOM CATALOG (${products.length} products available, you have access to images):\n${lines}\n\nIMPORTANT: When you recommend products, ALWAYS end your reply with one line exactly:\n[PRODUCTS:id1,id2,id3]\nMaximum 4 IDs. Do not mention IDs in the prose. Be warm and recommend relevant products from the catalog above.`;
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

    // Build user message - support optional image (visual product detection)
    const chatMessages: any[] = systemFinal
      ? [{ role: "system", content: systemFinal }]
      : [];
    const history = (messages || []) as Array<{ role: "user" | "assistant"; content: string }>;
    if (image && history.length > 0) {
      // Replace last user message with multimodal version
      const last = history[history.length - 1];
      chatMessages.push(...history.slice(0, -1));
      chatMessages.push({
        role: last.role,
        content: [
          { type: "text", text: last.content || (lang === "fr" ? "Identifie le produit sur cette image et trouve-le dans le catalogue." : "Identify the product in this image and find it in the catalog.") },
          { type: "image_url", image_url: { url: image } },
        ],
      });
    } else {
      chatMessages.push(...history);
    }

    const raw = await callOpenRouter({
      messages: chatMessages,
      temperature: 0.7,
      // Prefer vision-capable model when an image is provided
      model: image ? "qwen/qwen-2.5-vl-72b-instruct:free" : undefined,
    });

    // Parse [PRODUCTS:...] tag
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

    const recommended = productIds
      .map((id) => products.find((p) => p.id === id))
      .filter(Boolean)
      .map((p) => ({
        id: p!.id,
        title: p!.title,
        price: p!.price,
        image_url: p!.image_url,
        handle: p!.handle,
        checkout_url: storeUrl && p!.handle ? `https://${storeUrl.replace(/^https?:\/\//, "")}/products/${p!.handle}` : null,
      }));

    return new Response(JSON.stringify({ reply, products: recommended, storeUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("vendix-chat error:", e);
    const msg = String(e?.message || e);
    const status = msg.includes("429") ? 429 : msg.includes("402") ? 402 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
