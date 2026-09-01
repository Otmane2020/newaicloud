from pathlib import Path
import re

ROOT = Path("supabase/functions")
STRICT_IMPORT = 'import "../_shared/strict-ai-generation.ts";'


def read(path: str) -> str:
    return Path(path).read_text()


def write(path: str, text: str) -> None:
    Path(path).write_text(text)


def replace_once(text: str, pattern: str, replacement: str, label: str) -> str:
    updated, count = re.subn(pattern, lambda _: replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"{label}: expected one replacement, got {count}")
    return updated

# -----------------------------------------------------------------------------
# 1) Install the strict compatibility bootstrap in EVERY Edge Function.
# This protects legacy text + image calls without requiring every old function
# to be individually rewritten.
# -----------------------------------------------------------------------------
function_files = sorted(
    path for path in ROOT.glob("*/index.ts")
    if path.parent.name != "_shared"
)

for path in function_files:
    text = path.read_text()
    if STRICT_IMPORT not in text:
        text = STRICT_IMPORT + "\n" + text
        path.write_text(text)

# -----------------------------------------------------------------------------
# 2) Make vision multi-provider instead of Kimi-only.
# -----------------------------------------------------------------------------
path = "supabase/functions/_shared/ai-router.ts"
text = read(path)
vision_replacement = r'''export async function routeVision(messages: AIMessage[], maxTokens = 600): Promise<AIRouteResult> {
  const baseOptions: RouteOptions = {
    messages,
    maxTokens,
    temperature: 0.15,
  };

  // OpenAI and Gemini both accept the same multimodal message structures used
  // by this project. We deliberately call their normal provider helpers without
  // the `vision` guard so a failure simply falls through to the next provider.
  const genericAttempts: Array<() => Promise<AIRouteResult | null>> = [
    () => tryOpenAI(baseOptions),
    () => tryGemini(baseOptions),
  ];

  for (const attempt of genericAttempts) {
    try {
      const result = await attempt();
      if (result?.content) return result;
    } catch (error) {
      console.warn("[ai-router] vision provider failed", error);
    }
  }

  // Kimi direct vision fallback.
  const kimiKey = envSecret("MOONSHOT_API_KEY", "KIMI_API_KEY");
  if (kimiKey) {
    const model = Deno.env.get("KIMI_VISION_MODEL") || "kimi-k2.6";
    try {
      const response = await providerFetch("https://api.moonshot.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${kimiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          thinking: { type: "disabled" },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content?.trim();
        if (content) return { content, provider: "kimi", model: data?.model || model };
      } else {
        console.warn(`[ai-router] Kimi vision ${model} failed: ${response.status} ${(await response.text()).slice(0, 300)}`);
      }
    } catch (error) {
      console.warn("[ai-router] Kimi vision failed", error);
    }
  }

  // OpenRouter vision is optional because not every free model accepts images.
  // When OPENROUTER_VISION_MODEL is configured we use it as the last rescue.
  const openRouterKey = envSecret("OPENROUTER_API_KEY");
  const openRouterVisionModel = Deno.env.get("OPENROUTER_VISION_MODEL");
  if (openRouterKey && openRouterVisionModel) {
    try {
      const response = await providerFetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": Deno.env.get("PUBLIC_SITE_URL") || "https://catalogoptimize.com",
          "X-Title": "CatalogOptimize AI",
        },
        body: JSON.stringify({
          model: openRouterVisionModel,
          messages,
          max_tokens: maxTokens,
          temperature: 0.15,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content?.trim();
        if (content) return { content, provider: "openrouter-free", model: data?.model || openRouterVisionModel };
      } else {
        console.warn(`[ai-router] OpenRouter vision ${openRouterVisionModel} failed: ${response.status} ${(await response.text()).slice(0, 300)}`);
      }
    } catch (error) {
      console.warn("[ai-router] OpenRouter vision failed", error);
    }
  }

  throw new Error(
    "No vision provider succeeded. Configure a working OpenAI, Gemini, Kimi/Moonshot, or OPENROUTER_VISION_MODEL provider.",
  );
}
'''
text = replace_once(
    text,
    r'export async function routeVision\(messages: AIMessage\[\], maxTokens = 600\): Promise<AIRouteResult> \{.*?\n\}\s*$',
    vision_replacement,
    "ai-router routeVision",
)
write(path, text)

# -----------------------------------------------------------------------------
# 3) Enrichment must never 500 just because all LLMs are unavailable.
# Empty JSON is a valid deterministic fallback: the rest of enrich-product keeps
# real Vision/existing catalog data and does not fabricate missing attributes.
# -----------------------------------------------------------------------------
path = "supabase/functions/enrich-product/index.ts"
text = read(path)
old = '''async function callAI(messages: any[], maxTokens = 500) {
  const routedAI = await routeAI({
    messages,
    maxTokens,
    temperature: 0.5,
  });
  console.log(`[enrich-product] AI provider: ${routedAI.provider}, model: ${routedAI.model}`);
  return routedAI;
}'''
new = '''async function callAI(messages: any[], maxTokens = 500) {
  try {
    const routedAI = await routeAI({
      messages,
      maxTokens,
      temperature: 0.5,
    });
    console.log(`[enrich-product] AI provider: ${routedAI.provider}, model: ${routedAI.model}`);
    return routedAI;
  } catch (error) {
    console.warn("[enrich-product] All text providers unavailable; preserving real catalog/vision data only", error);
    return {
      content: "{}",
      provider: "deterministic-fallback",
      model: "catalog-context-only",
    } as any;
  }
}'''
if old not in text:
    raise SystemExit("enrich-product callAI block not found")
text = text.replace(old, new, 1)
write(path, text)

# -----------------------------------------------------------------------------
# 4) Do not charge image credits before a provider actually succeeds.
# Two legacy functions were charging +8 before generation.
# -----------------------------------------------------------------------------
for path in [
    "supabase/functions/generate-ai-product-background/index.ts",
    "supabase/functions/generate-image-background/index.ts",
]:
    text = read(path)
    pattern = r'''\n\s*// (?:Increment usage immediately|✅ Incrémenter IMMÉDIATEMENT).*?const AI_BG_COST = 8;\s*await supabaseAdmin\.rpc\("increment_usage", \{\s*p_seller_id: user\.id,\s*p_field: "optimizations_count",\s*p_increment: AI_BG_COST,\s*\}\);\s*console\.log\([\s\S]*?\);'''
    replacement = '''
        // Credits are charged only after an image provider succeeds.
        console.log("[image-generation] Usage validated; charge deferred until successful generation");'''
    updated, count = re.subn(pattern, lambda _: replacement, text, count=1, flags=re.S)
    if count == 0:
        # tolerate already-patched files
        updated = text
    text = updated

    # Add a post-success charge exactly once before the final success response.
    if "charge deferred until successful generation" in text and "POST_SUCCESS_IMAGE_CHARGE" not in text:
        marker = "    return new Response(\n      JSON.stringify({\n        success: true,"
        if marker not in text:
            raise SystemExit(f"success response marker not found in {path}")
        charge = '''    // POST_SUCCESS_IMAGE_CHARGE: charge only after provider success.
    if (authenticatedUserId) {
      try {
        const chargeClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        );
        await chargeClient.rpc("increment_usage", {
          p_seller_id: authenticatedUserId,
          p_field: "optimizations_count",
          p_increment: 8,
        });
      } catch (chargeError) {
        console.warn("[image-generation] Generation succeeded but usage charge failed", chargeError);
      }
    }

'''
        text = text.replace(marker, charge + marker, 1)
    write(path, text)

# -----------------------------------------------------------------------------
# 5) GTIN: stop fabricating checksum-valid but unassigned GS1 identifiers.
# Preserve valid existing identifiers and explicitly flag missing identifiers.
# -----------------------------------------------------------------------------
gtin_path = Path("supabase/functions/generate-gtin/index.ts")
gtin_path.write_text(r'''import "../_shared/strict-ai-generation.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function isValidGTIN(value: string): boolean {
  const gtin = String(value || "").replace(/[\s-]/g, "");
  if (![8, 12, 13, 14].includes(gtin.length) || !/^\d+$/.test(gtin)) return false;
  const digits = gtin.split("").map(Number);
  const checkDigit = digits.pop()!;
  let sum = 0;
  for (let i = digits.length - 1, position = 1; i >= 0; i--, position++) {
    sum += digits[i] * (position % 2 === 1 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10 === checkDigit;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  const body = await req.json().catch(() => ({}));
  if (body?.healthCheck === true) {
    return new Response(JSON.stringify({ ok: true, safeGtinMode: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ success: false, error: "UNAUTHORIZED" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!url || !serviceKey) throw new Error("Missing Supabase server credentials");
    const supabase = createClient(url, serviceKey);

    const { data: auth } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!auth?.user) {
      return new Response(JSON.stringify({ success: false, error: "UNAUTHORIZED" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const productIds = Array.isArray(body.productIds) ? body.productIds : [];
    if (!productIds.length) {
      return new Response(JSON.stringify({ success: false, error: "productIds array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];
    for (const productId of productIds) {
      const { data: product, error } = await supabase
        .from("shopify_products")
        .select("id,title,google_gtin")
        .eq("id", productId)
        .maybeSingle();

      if (error || !product) {
        results.push({ productId, status: "error", valid: false, error: "Product not found" });
        continue;
      }

      if (product.google_gtin && isValidGTIN(product.google_gtin)) {
        results.push({
          productId,
          gtin: product.google_gtin,
          status: "existing",
          valid: true,
          identifier_exists: true,
        });
        continue;
      }

      // A checksum-valid number is not a legitimate GTIN unless it has been
      // assigned by GS1 / the manufacturer. Never fabricate one.
      results.push({
        productId,
        gtin: null,
        status: "missing",
        valid: false,
        identifier_exists: false,
        needs_supplier_identifier: true,
        message: "No valid assigned GTIN is stored. Supply the manufacturer/GS1 identifier or use identifier_exists=false where the channel permits it.",
      });
    }

    return new Response(JSON.stringify({
      success: true,
      safeGtinMode: true,
      summary: {
        total: results.length,
        existing: results.filter((item) => item.status === "existing").length,
        missing: results.filter((item) => item.status === "missing").length,
        errors: results.filter((item) => item.status === "error").length,
      },
      results,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-gtin failed", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
''')

# -----------------------------------------------------------------------------
# 6) Audit report: inventory + risky patterns. We don't fail just because a
# provider URL is present; the strict bootstrap now intercepts legacy calls.
# -----------------------------------------------------------------------------
provider_patterns = {
    "lovable_gateway": "ai.gateway.lovable.dev",
    "gemini_direct": "generativelanguage.googleapis.com",
    "openai_direct": "api.openai.com",
    "deepseek_direct": "api.deepseek.com",
    "openrouter_direct": "openrouter.ai",
    "moonshot_direct": "api.moonshot.ai",
}

lines = [
    f"edge_functions={len(function_files)}",
    f"strict_bootstrap_coverage={sum(STRICT_IMPORT in p.read_text() for p in function_files)}/{len(function_files)}",
]

for label, token in provider_patterns.items():
    matches = [str(p) for p in function_files if token in p.read_text()]
    lines.append(f"{label}={len(matches)}")
    for match in matches:
        lines.append(f"  {match}")

multi_body = []
for p in function_files:
    count = len(re.findall(r"await\s+req\.json\s*\(", p.read_text()))
    if count > 1:
        multi_body.append((str(p), count))
lines.append(f"multiple_req_json={len(multi_body)}")
for match, count in multi_body:
    lines.append(f"  {count}x {match}")

Path("edge-functions-audit.txt").write_text("\n".join(lines) + "\n")
print("\n".join(lines[:20]))
