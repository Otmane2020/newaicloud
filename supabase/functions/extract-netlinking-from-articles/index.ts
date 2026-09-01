import "../_shared/strict-ai-generation.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface LinkData {
  url: string;
  anchor_text: string;
  type: 'internal' | 'external';
  target_type?: 'product' | 'page' | 'external';
  product_id?: string;
  page_id?: string;
  position_in_content: number;
  context: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    const { article_ids } = await req.json();

    if (!article_ids || !Array.isArray(article_ids) || article_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: "article_ids array required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[NETLINKING] Extraction pour ${article_ids.length} articles`);

    const results = [];

    for (const articleId of article_ids) {
      try {
        // Récupérer l'article
        const { data: article, error: articleError } = await supabase
          .from("blog_articles")
          .select("*, user_id, content, store_id")
          .eq("id", articleId)
          .single();

        if (articleError || !article) {
          console.error(`[NETLINKING] Article ${articleId} non trouvé:`, articleError);
          continue;
        }

        const rawLinks = await extractLinksFromHtml(article.content, article.user_id, supabase);
        const links = dedupeLinks(rawLinks);

        // Supprimer les anciens liens pour cet article
        await supabase
          .from("blog_netlinking")
          .delete()
          .eq("article_id", articleId);

        // Insérer les nouveaux liens
        let inserted = true;
        if (links.length > 0) {
          const netlinkingData = links.map((link) => ({
            article_id: articleId,
            user_id: article.user_id,
            store_id: article.store_id,
            target_url: link.url,
            anchor_text: link.anchor_text,
            link_type: link.type, // 'internal' or 'external'
            target_type: link.target_type, // 'product', 'page', or 'external'
            seo_score: calculateSeoScore(link),
          }));

          const { error: insertError } = await supabase
            .from("blog_netlinking")
            .insert(netlinkingData);

          if (insertError) {
            inserted = false;
            console.error(`[NETLINKING] Erreur insertion pour article ${articleId}:`, insertError);
          } else {
            console.log(`[NETLINKING] ${links.length} liens extraits pour article ${articleId}`);
          }
        }

        results.push({
          article_id: articleId,
          links_count: inserted ? links.length : 0,
          success: inserted,
        });
      } catch (err) {
        console.error(`[NETLINKING] Erreur pour article ${articleId}:`, err);
        results.push({
          article_id: articleId,
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        total_links: results.reduce((sum, r) => sum + (r.links_count || 0), 0),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[NETLINKING] Erreur globale:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function dedupeLinks(links: LinkData[]): LinkData[] {
  const map = new Map<string, LinkData>();
  for (const link of links) {
    // Unique key is the normalized URL; keep first occurrence
    if (!map.has(link.url)) map.set(link.url, link);
  }
  return Array.from(map.values());
}

async function extractLinksFromHtml(
  html: string,
  userId: string,
  supabase: any
): Promise<LinkData[]> {
  const links: LinkData[] = [];
  
  // Récupérer les produits et pages de l'utilisateur pour mapping
  const { data: products } = await supabase
    .from("shopify_products")
    .select("id, handle")
    .eq("seller_id", userId);

  const { data: pages } = await supabase
    .from("shopify_pages")
    .select("id, handle")
    .eq("user_id", userId);

  const productHandles = new Map<string, string>(
    products?.map((p: any) => [p.handle as string, p.id as string]) || []
  );
  const pageHandles = new Map<string, string>(
    pages?.map((p: any) => [p.handle as string, p.id as string]) || []
  );

  // Regex pour extraire les liens <a href="...">texte</a>
  const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi;
  let match;
  let position = 0;

  while ((match = linkRegex.exec(html)) !== null) {
    const url = match[1];
    const anchorText = match[2].trim();
    const startPos = match.index;

    // Extraire le contexte (100 caractères avant et après)
    const contextStart = Math.max(0, startPos - 100);
    const contextEnd = Math.min(html.length, startPos + match[0].length + 100);
    const context = html
      .substring(contextStart, contextEnd)
      .replace(/<[^>]+>/g, " ")
      .trim();

    // Déterminer le type de lien
    let linkType: 'internal' | 'external' = 'external';
    let targetType: 'product' | 'page' | 'external' = 'external';
    let productId: string | undefined;
    let pageId: string | undefined;

    // Vérifier si c'est un lien produit
    if (url.includes('/products/')) {
      const handleMatch = url.match(/\/products\/([^/?#]+)/);
      if (handleMatch && handleMatch[1]) {
        const handle = handleMatch[1];
        const foundId = productHandles.get(handle);
        if (foundId) {
          linkType = 'internal';
          targetType = 'product';
          productId = foundId;
        }
      }
    }
    // Vérifier si c'est un lien page
    else if (url.includes('/pages/')) {
      const handleMatch = url.match(/\/pages\/([^/?#]+)/);
      if (handleMatch && handleMatch[1]) {
        const handle = handleMatch[1];
        const foundId = pageHandles.get(handle);
        if (foundId) {
          linkType = 'internal';
          targetType = 'page';
          pageId = foundId;
        }
      }
    }

    // Normaliser l'URL pour éviter les doublons (http/https, protocol-less)
    let normalizedUrl = url.trim();

    // Keep special schemes as-is (mailto:, tel:, etc.) and anchors
    const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(normalizedUrl);
    if (!hasScheme && !normalizedUrl.startsWith('/') && !normalizedUrl.startsWith('#')) {
      if (normalizedUrl.startsWith('//')) {
        normalizedUrl = `https:${normalizedUrl}`;
      } else {
        normalizedUrl = `https://${normalizedUrl}`;
      }
    }

    // Force https for http urls
    normalizedUrl = normalizedUrl.replace(/^http:\/\//, 'https://');

    // Remove trailing slash (but keep root)
    if (normalizedUrl.length > 1) normalizedUrl = normalizedUrl.replace(/\/$/, '');

    links.push({
      url: normalizedUrl,
      anchor_text: anchorText,
      type: linkType,
      target_type: targetType,
      product_id: productId,
      page_id: pageId,
      position_in_content: position++,
      context,
    });
  }

  return links;
}

function calculateSeoScore(link: LinkData): number {
  let score = 50; // Score de base

  // Bonus si le lien est en début de contenu
  if (link.position_in_content < 3) {
    score += 20;
  } else if (link.position_in_content < 10) {
    score += 10;
  }

  // Bonus pour anchor text descriptif (>3 mots)
  const wordCount = link.anchor_text.split(/\s+/).length;
  if (wordCount >= 3) {
    score += 15;
  } else if (wordCount >= 2) {
    score += 10;
  } else if (wordCount === 1) {
    score -= 5; // Pénalité pour anchor text d'un seul mot
  }

  // Bonus pour les liens internes (produit/page)
  if (link.type === 'internal') {
    score += 15;
  }

  // Pénalité pour les liens externes
  if (link.type === 'external') {
    score -= 10;
  }

  // S'assurer que le score reste entre 0 et 100
  return Math.max(0, Math.min(100, score));
}
