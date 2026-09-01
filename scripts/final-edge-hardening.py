from pathlib import Path


def load(path: str) -> str:
    return Path(path).read_text()


def save(path: str, text: str) -> None:
    Path(path).write_text(text)


def must_replace(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"{label}: source block not found")
    return text.replace(old, new, 1)

# -----------------------------------------------------------------------------
# analyze-serp-competitors: read the request body once and reuse it in fallback.
# -----------------------------------------------------------------------------
path = "supabase/functions/analyze-serp-competitors/index.ts"
text = load(path)
text = must_replace(
    text,
    """serve(async (req) => {\n  if (req.method === 'OPTIONS') {\n    return new Response(null, { headers: corsHeaders });\n  }\n\n  try {\n    const { keyword, analysisType, maxResults = 10 }: SerpAnalysisRequest = await req.json();\n""",
    """serve(async (req) => {\n  if (req.method === 'OPTIONS') {\n    return new Response(null, { headers: corsHeaders });\n  }\n\n  const body = await req.json().catch(() => ({}));\n\n  try {\n    const { keyword, analysisType, maxResults = 10 } = body as SerpAnalysisRequest;\n""",
    "analyze-serp body parse",
)
text = must_replace(
    text,
    """    const { keyword, analysisType } = await req.json();\n""",
    """    const { keyword, analysisType } = body as SerpAnalysisRequest;\n""",
    "analyze-serp catch body reuse",
)
save(path, text)

# -----------------------------------------------------------------------------
# sync-blog-to-shopify: read once so catch can safely restore article state.
# -----------------------------------------------------------------------------
path = "supabase/functions/sync-blog-to-shopify/index.ts"
text = load(path)
text = must_replace(
    text,
    """Deno.serve(async (req) => {\n  if (req.method === \"OPTIONS\")\n    return new Response(null, { status: 200, headers: corsHeaders });\n\n  try {\n""",
    """Deno.serve(async (req) => {\n  if (req.method === \"OPTIONS\")\n    return new Response(null, { status: 200, headers: corsHeaders });\n\n  const body = await req.json().catch(() => ({}));\n  const { articleId } = body as { articleId?: string };\n\n  try {\n""",
    "sync-blog outer body",
)
text = must_replace(
    text,
    """    const { articleId } = await req.json();\n    if (!articleId) {\n""",
    """    if (!articleId) {\n""",
    "sync-blog first read",
)
text = must_replace(
    text,
    """      const { articleId } = await req.json();\n      \n      await supabase\n""",
    """      if (!articleId) throw new Error(\"Missing articleId while restoring failed sync\");\n      \n      await supabase\n""",
    "sync-blog catch read",
)
save(path, text)

# -----------------------------------------------------------------------------
# api-v1: parse POST JSON exactly once in the router and pass it to handlers.
# -----------------------------------------------------------------------------
path = "supabase/functions/api-v1/index.ts"
text = load(path)
text = must_replace(
    text,
    """async function handleOptimizeProduct(req: Request, userId: string) {\n  const body = await req.json();\n  const { product_id, store_id, optimize_title = true, optimize_description = true, language = 'fr' } = body;\n""",
    """async function handleOptimizeProduct(body: any, userId: string) {\n  const { product_id, store_id, optimize_title = true, optimize_description = true, language = 'fr' } = body;\n""",
    "api-v1 optimize handler",
)
text = must_replace(
    text,
    """async function handleGenerateArticle(req: Request, userId: string) {\n  const body = await req.json();\n  const { title, keywords, store_id, language = 'fr' } = body;\n""",
    """async function handleGenerateArticle(body: any, userId: string) {\n  const { title, keywords, store_id, language = 'fr' } = body;\n""",
    "api-v1 article handler",
)
text = must_replace(
    text,
    """async function handleCreateProduct(req: Request, userId: string) {\n  const body = await req.json();\n  const { title, description, price, vendor, product_type, store_id } = body;\n""",
    """async function handleCreateProduct(body: any, userId: string) {\n  const { title, description, price, vendor, product_type, store_id } = body;\n""",
    "api-v1 create handler",
)
router_old = """    // Router vers le bon endpoint\n    let result;\n    if (path === \"/seo/optimize-product\" && req.method === \"POST\") {\n      result = await handleOptimizeProduct(req, authResult.userId!);\n    } else if (path === \"/content/generate-article\" && req.method === \"POST\") {\n      result = await handleGenerateArticle(req, authResult.userId!);\n    } else if (path === \"/products/create\" && req.method === \"POST\") {\n      result = await handleCreateProduct(req, authResult.userId!);\n    } else if (path === \"/products/list\" && req.method === \"GET\") {\n"""
router_new = """    // Parse POST body exactly once, after authentication/authorization.\n    const requestBody = req.method === \"POST\"\n      ? await req.json().catch(() => ({}))\n      : {};\n\n    // Router vers le bon endpoint\n    let result;\n    if (path === \"/seo/optimize-product\" && req.method === \"POST\") {\n      result = await handleOptimizeProduct(requestBody, authResult.userId!);\n    } else if (path === \"/content/generate-article\" && req.method === \"POST\") {\n      result = await handleGenerateArticle(requestBody, authResult.userId!);\n    } else if (path === \"/products/create\" && req.method === \"POST\") {\n      result = await handleCreateProduct(requestBody, authResult.userId!);\n    } else if (path === \"/products/list\" && req.method === \"GET\") {\n"""
text = must_replace(text, router_old, router_new, "api-v1 router")
save(path, text)

# -----------------------------------------------------------------------------
# generate-google-category: provider outage must not become a blank-screen 500.
# We also refuse to invent an 'official' taxonomy value when AI is unavailable.
# -----------------------------------------------------------------------------
path = "supabase/functions/generate-google-category/index.ts"
text = load(path)
text = text.replace(
    '.select("id, title, description, product_type, category, sub_category, vendor, seller_id, optimization_count")',
    '.select("id, title, description, product_type, category, sub_category, vendor, seller_id, optimization_count, google_product_category, google_mpn, google_condition, google_brand")',
    1,
)
old_route = """    const categoryResponse = await routeAI({\n      messages: [\n        {\n          role: \"system\",\n          content: \"You are a Google Shopping categorization expert. Always respond with one valid JSON object only, without markdown fences.\",\n        },\n        {\n          role: \"user\",\n          content: categoryPrompt,\n        },\n      ],\n      maxTokens: 500,\n      temperature: 0.15,\n    });\n\n    console.log(`Google category provider: ${categoryResponse.provider}/${categoryResponse.model}`);\n"""
new_route = """    let categoryResponse;\n    try {\n      categoryResponse = await routeAI({\n        messages: [\n          {\n            role: \"system\",\n            content: \"You are a Google Shopping categorization expert. Always respond with one valid JSON object only, without markdown fences.\",\n          },\n          {\n            role: \"user\",\n            content: categoryPrompt,\n          },\n        ],\n        maxTokens: 500,\n        temperature: 0.15,\n      });\n    } catch (providerError) {\n      console.warn(\"Google category providers unavailable\", providerError);\n      return new Response(\n        JSON.stringify({\n          success: false,\n          error: \"CATEGORY_PROVIDER_UNAVAILABLE\",\n          message: \"Google category generation is temporarily unavailable. No taxonomy value was fabricated.\",\n          needs_review: true,\n          existing_category: product.google_product_category || null,\n        }),\n        {\n          status: 200,\n          headers: { ...corsHeaders, \"Content-Type\": \"application/json\" },\n        },\n      );\n    }\n\n    console.log(`Google category provider: ${categoryResponse.provider}/${categoryResponse.model}`);\n"""
text = must_replace(text, old_route, new_route, "google-category route fallback")
# Invalid provider JSON should also be application-level, not runtime-level.
text = must_replace(
    text,
    """    } catch (e) {\n      console.error(\"Failed to parse category JSON from AI provider\", e);\n      throw new Error(\"AI returned an invalid Google category response\");\n    }\n\n    if (!googleData.google_product_category.trim()) {\n      throw new Error(\"AI returned an empty Google product category\");\n    }\n""",
    """    } catch (e) {\n      console.error(\"Failed to parse category JSON from AI provider\", e);\n      return new Response(\n        JSON.stringify({\n          success: false,\n          error: \"CATEGORY_INVALID_RESPONSE\",\n          message: \"The AI provider returned an invalid category response. No taxonomy value was saved.\",\n          needs_review: true,\n        }),\n        { status: 200, headers: { ...corsHeaders, \"Content-Type\": \"application/json\" } },\n      );\n    }\n\n    if (!googleData.google_product_category.trim()) {\n      return new Response(\n        JSON.stringify({\n          success: false,\n          error: \"CATEGORY_EMPTY_RESPONSE\",\n          message: \"No Google product category was generated. No taxonomy value was saved.\",\n          needs_review: true,\n        }),\n        { status: 200, headers: { ...corsHeaders, \"Content-Type\": \"application/json\" } },\n      );\n    }\n""",
    "google-category invalid response fallback",
)
save(path, text)

# -----------------------------------------------------------------------------
# Final structural check: no Edge Function should statically contain more than
# one direct await req.json() after this cleanup.
# -----------------------------------------------------------------------------
import re
issues = []
for file in sorted(Path("supabase/functions").glob("*/index.ts")):
    count = len(re.findall(r"await\s+req\.json\s*\(", file.read_text()))
    if count > 1:
        issues.append((str(file), count))

if issues:
    raise SystemExit("remaining multiple req.json(): " + ", ".join(f"{p}={c}" for p, c in issues))

print("final-edge-hardening: request body audit clean")
