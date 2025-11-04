import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Cache mémoire (TTL 1h)
const responseCache = new Map<string, { response: string; timestamp: number }>();
const CACHE_TTL = 3600000;

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface Product {
  id: string;
  title: string;
  price: string;
  compare_at_price?: string;
  ai_color?: string;
  ai_material?: string;
  ai_shape?: string;
  ai_texture?: string;
  ai_pattern?: string;
  ai_finish?: string;
  ai_design_elements?: string;
  ai_vision_analysis?: string;
  ai_vision_confidence?: number;
  image_url?: string;
  category?: string;
  sub_category?: string;
  tags?: string;
  handle?: string;
  vendor?: string;
  currency?: string;
  description?: string;
  product_type?: string;
  style?: string;
  room?: string;
  functionality?: string;
  characteristics?: string;
}

interface ProductSearchFilters {
  query?: string;
  category?: string;
  subCategory?: string;
  color?: string;
  material?: string;
  style?: string;
  room?: string;
  functionality?: string;
  characteristics?: string;
  limit?: number;
  status?: string;
  maxPrice?: number;
  minPrice?: number;
  exactMatch?: boolean;
}

interface ChatResponse {
  role: "assistant";
  content: string;
  intent: "simple_chat" | "product_chat" | "product_show" | "conversation";
  products: Product[];
  mode: "conversation" | "product_show";
  sector: string;
}

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase credentials");
  return createClient(supabaseUrl, supabaseKey);
}

function normalizeText(text: string): string {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Cache helpers
function getCachedResponse(cacheKey: string): string | null {
  const entry = responseCache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    responseCache.delete(cacheKey);
    return null;
  }
  console.log("✅ Cache HIT:", cacheKey);
  return entry.response;
}
function setCachedResponse(cacheKey: string, response: string): void {
  responseCache.set(cacheKey, { response, timestamp: Date.now() });
  console.log("💾 Cache SET:", cacheKey);
  if (responseCache.size > 100) {
    const firstKey = responseCache.keys().next().value;
    if (firstKey) responseCache.delete(firstKey);
  }
}

function extractContextFromHistory(history: ChatMessage[]): string {
  return history.filter(m => m.role === "user").map(m => m.content).join(" ");
}

/** **************
 *  INTENT
 *************** */
async function detectIntent(userMessage: string): Promise<"simple_chat" | "product_chat" | "product_show"> {
  const msg = normalizeText(userMessage);

  const greetings = [
    "bonjour","salut","hello","coucou","hey","hi","bonsoir","merci","thanks","au revoir","bye","ok",
    "d accord","parfait","super","genial","cool","qui es tu","ton nom","tu fais quoi","comment tu t appelles",
    "tu es un robot","tu es une ia","week end","comment ca va","ca va"
  ];

  const actionShow = [
    "montre","montrez","montre moi","affiche","afficher","voir","regarder","montrer","liste","lister","catalogue",
    "collection","gamme","selection","je cherche","je veux","j ai besoin","je voudrais","trouver","acheter","commander",
    "panier","budget"
  ].map(normalizeText);

  const productNouns = [
    "produit","article","modele","reference","table","chaise","canape","fauteuil","meuble","lit","bureau","armoire",
    "lampe","miroir","commode","buffet","etagere","bibliotheque","tabouret","decoration","mobilier","table basse",
    "table a manger"
  ];

  const infoChat = [
    "avez vous","proposez vous","vendez vous","vous avez","disponible","en stock","existe","qualite","durable",
    "resistant","solide","fiable","materiau","matiere","composition","fabrication","garantie","retour","livraison",
    "conseil","avis","recommandation","suggestion","comment choisir","lequel","quelle","difference","meilleur",
    "preferer","tendance","populaire","best seller","nouveau","promotion","promo","solde","offre","prix","cout",
    "combien","dimension","taille","couleur","style","caracteristique","delai","delais","rangement","extensible"
  ];

  const terms = msg.split(/\s+/).filter(Boolean);
  const containsAny = (list: string[]) => list.some(w => msg.includes(w));
  const containsWordFrom = (list: string[]) => list.some(w => terms.includes(w));

  let scores = { simple_chat: 0, product_chat: 0, product_show: 0 };

  if (containsAny(greetings)) scores.simple_chat += 20;

  const hasShowVerb = containsAny(actionShow);
  const hasProductNoun = containsAny(productNouns) || containsWordFrom(productNouns);
  const hasInfoNeed   = containsAny(infoChat);

  // Hard rules
  if (hasShowVerb && hasProductNoun) scores.product_show += 80;
  if (hasInfoNeed && hasProductNoun) scores.product_chat += 70;

  // Soft weights
  if (hasShowVerb) scores.product_show += 25;
  if (hasProductNoun) { scores.product_chat += 10; scores.product_show += 10; }
  if (hasInfoNeed) scores.product_chat += 25;

  if (msg.length < 15 && scores.product_show === 0 && scores.product_chat === 0 && scores.simple_chat > 0) {
    scores.simple_chat += 40;
  }

  const max = Math.max(scores.simple_chat, scores.product_chat, scores.product_show);
  if (max === 0) return "simple_chat";

  const picks = Object.entries(scores).filter(([,v]) => v === max).map(([k]) => k);
  if (picks.length > 1) {
    if (picks.includes("product_show")) return "product_show";
    if (picks.includes("product_chat")) return "product_chat";
    return "simple_chat";
  }
  if (max === scores.product_show) return "product_show";
  if (max === scores.product_chat) return "product_chat";
  return "simple_chat";
}

/** *******************
 *  FILTERS EXTRACTION
 ******************** */
function extractFiltersFromQuery(query: string, history: ChatMessage[] = []): ProductSearchFilters {
  const filters: ProductSearchFilters = {};
  const normalized = normalizeText(query);

  let searchQuery = query;
  if (history.length > 0) {
    const context = extractContextFromHistory(history);
    searchQuery = context + " " + query;
  }
  const nq = normalizeText(searchQuery);

  // Catégories spécifiques (normalisées)
  type CatSpec = { test: (s: string) => boolean; category: string; exact: boolean };
  const catSpecs: CatSpec[] = [
    { test: s => s.includes("table basse"), category: "table basse", exact: true },
    { test: s => s.includes("table a manger") || s.includes("table de salle a manger") || s.includes("table de cuisine"),
      category: "table à manger", exact: true },
    { test: s => s.includes("canape"), category: "canapé", exact: true },
    { test: s => s.includes("fauteuil"), category: "fauteuil", exact: true },
    { test: s => s.includes("chaise"), category: "chaise", exact: true },
    { test: s => s.includes("armoire"), category: "armoire", exact: true },
    { test: s => s.includes("commode"), category: "commode", exact: true },
    { test: s => s.includes("buffet"), category: "buffet", exact: true },
    { test: s => s.includes("etagere"), category: "étagère", exact: true },
    { test: s => s.includes("bibliotheque"), category: "bibliothèque", exact: true },
    { test: s => s.includes("lit"), category: "lit", exact: true },
    { test: s => s.includes("bureau"), category: "bureau", exact: true },
    { test: s => s.includes("lampe"), category: "lampe", exact: true },
    { test: s => s.includes("miroir"), category: "miroir", exact: true },
    { test: s => s.includes("tabouret"), category: "tabouret", exact: true },
  ];

  let foundSpecificCategory = false;
  for (const c of catSpecs) {
    if (c.test(nq)) {
      filters.query = c.category;
      filters.exactMatch = c.exact;
      foundSpecificCategory = true;
      console.log("🎯 Specific category detected:", c.category, "exact:", c.exact);
      break;
    }
  }

  // Attributs
  const colorMap: Record<string,string[]> = {
    blanc:["blanc","blanche","white"], noir:["noir","noire","black"], gris:["gris","grise","gray","grey"],
    beige:["beige"], bois:["bois","wood","boise"], marron:["marron","brown","brun","brune"],
    bleu:["bleu","bleue","blue"], vert:["vert","verte","green"], rouge:["rouge","red"],
    jaune:["jaune","yellow"], orange:["orange"], rose:["rose","pink"],
    violet:["violet","violette","purple","mauve"]
  };
  for (const [color, variants] of Object.entries(colorMap)) {
    if (variants.some(v => nq.includes(v))) { filters.color = color; break; }
  }

  const materialMap: Record<string,string[]> = {
    bois:["bois","wood","boise","en bois","bois massif","chene","noyer","teck","pin"],
    metal:["metal","metallique","acier","inox","fer","aluminium","chrome","or","argent"],
    verre:["verre","glass","vitre"],
    marbre:["marbre","marbre","marble"],
    cuir:["cuir","leather","simili cuir"],
    tissu:["tissu","textile","fabric","velours","lin","coton","soie"],
    plastique:["plastique","plastic","resine","resine","composite"],
    ceramique:["ceramique","ceramic","porcelaine","faience"],
    pierre:["pierre","stone","granit","granite","ardoise"],
    rotin:["rotin","osier","bambou","wicker"],
  };
  for (const [mat, variants] of Object.entries(materialMap)) {
    if (variants.some(v => nq.includes(v))) { filters.material = mat; break; }
  }

  const styleMap: Record<string,string[]> = {
    moderne:["moderne","modern","contemporain","contemporaine","design"],
    classique:["classique","traditionnel","traditionnelle","ancien","ancienne"],
    vintage:["vintage","retro","ret ro","r etro"],
    scandinave:["scandinave","nordique","danemark","suede"],
    industriel:["industriel","industrielle","usine","metal"],
    rustique:["rustique","campagne","provence","provencal","provencale"],
    minimaliste:["minimaliste","minimal","epure","epure","sobre"],
    elegant:["elegant","raffine","raffine","chic","luxe","luxueux"],
  };
  for (const [style, variants] of Object.entries(styleMap)) {
    if (variants.some(v => nq.includes(v))) { filters.style = style; break; }
  }

  const roomMap: Record<string,string[]> = {
    salon:["salon","sejour","living","salle de sejour","salle a manger"],
    chambre:["chambre","chambre a coucher","bedroom"],
    cuisine:["cuisine","kitchen"],
    "salle de bain":["salle de bain","salle de bains","bathroom","douche","toilette"],
    bureau:["bureau","office","studio","travail"],
    jardin:["jardin","exterieur","terrasse","balcon"],
    entree:["entree","hall","couloir","vestibule"],
  };
  for (const [room, variants] of Object.entries(roomMap)) {
    if (variants.some(v => nq.includes(v))) { filters.room = room; break; }
  }

  // functionality / characteristics (quelques mots “meuble” fréquents)
  const funcHints = ["rangement","tiroir","porte","etagere","extensible","convertible","relevable","pliable"];
  if (funcHints.some(h => nq.includes(h))) filters.functionality = funcHints.find(h => nq.includes(h));
  const charHints = ["robuste","durable","solide","eco","ecoresponsable","facile a monter","montage facile","compact"];
  if (charHints.some(h => nq.includes(h))) filters.characteristics = charHints.find(h => nq.includes(h));

  // Prix
  const priceMax = nq.match(/(?:moins de|max|maximum|jusqu a|jusqu a|inferieur a|pas plus de|<)\s*(\d+)\s*(?:euros?|€)?/i);
  if (priceMax) filters.maxPrice = parseInt(priceMax[1]);
  const priceMin = nq.match(/(?:plus de|min|minimum|a partir de|superieur a|>)\s*(\d+)\s*(?:euros?|€)?/i);
  if (priceMin) filters.minPrice = parseInt(priceMin[1]);
  const priceRange = nq.match(/entre\s*(\d+)\s*(?:et|a|-)\s*(\d+)\s*(?:euros?|€)?/i);
  if (priceRange) { filters.minPrice = parseInt(priceRange[1]); filters.maxPrice = parseInt(priceRange[2]); }

  // Query générique si pas de catégorie précise
  if (!foundSpecificCategory) {
    const genericKeywords = ["produits","articles","catalogue","collection","tout","tous","tes","vos","montre","voir"];
    const isGenericRequest = genericKeywords.some(w => nq.includes(w));
    const categories = ["canape","table","chaise","fauteuil","meuble","armoire","lit","bureau","lampe","miroir"];
    const foundCategory = categories.find(c => nq.includes(c));
    if (foundCategory) filters.query = foundCategory;
    else if (isGenericRequest) filters.query = "";
    else {
      const stopWords = ["je","tu","il","elle","on","nous","vous","ils","elles","de","du","des","le","la","les","un","une","au","aux","avec","pour","dans","sur","sous","chez","est","sont","ai","as","a","avons","avez","ont","veux","voudrais","cherche","recherche"];
      const queryWords = nq.split(" ")
        .filter(w => w.length > 2 && !stopWords.includes(w))
        .filter(w => !Object.values(colorMap).flat().includes(w))
        .filter(w => !Object.values(materialMap).flat().includes(w))
        .filter(w => !Object.values(styleMap).flat().includes(w))
        .filter(w => !Object.values(roomMap).flat().includes(w));
      filters.query = queryWords.join(" ");
    }
  }

  filters.status = "active";
  filters.limit = 2;
  console.log("📋 Final extracted filters:", filters);
  return filters;
}

/** **************
 *  RELEVANCE
 *************** */
function calculateRelevanceScore(product: Product, searchQuery: string, exactMatch: boolean = false): number {
  const query = normalizeText(searchQuery);
  const terms = query.split(" ").filter(t => t.length > 2);
  let score = 0;

  // Catégorie stricte
  if (exactMatch) {
    const title = normalizeText(product.title || "");
    const category = normalizeText(product.category || "");
    const subCategory = normalizeText(product.sub_category || "");
    const productType = normalizeText(product.product_type || "");

    if (query.includes("table basse")) {
      if (title.includes("table basse") || category === "table basse" || subCategory === "table basse") score += 2000;
      else if (title.includes("table") && !title.includes("manger") && !title.includes("salle")) score += 500;
      else score -= 1000;
    }
    if (query.includes("table a manger") || query.includes("table à manger")) {
      if (title.includes("manger") || title.includes("salle") || category === "table à manger") score += 2000;
      else if (title.includes("table") && !title.includes("basse")) score += 500;
      else score -= 1000;
    }
    if (category === query || subCategory === query || productType === query) score += 1500;
  }

  const productTypes = ["table","chaise","canape","fauteuil","armoire","lit","bureau","lampe","miroir","commode","buffet","etagere","tabouret"];
  const mentionedType = productTypes.find(type => terms.includes(type));
  if (mentionedType) {
    const title = normalizeText(product.title || "");
    const category = normalizeText(product.category || "");
    const subCategory = normalizeText(product.sub_category || "");
    if (title.includes(mentionedType) || category === mentionedType || subCategory.includes(mentionedType)) score += 1000;
    else if (category.includes(mentionedType) || title.split(" ").some(w => w === mentionedType)) score += 800;
    else score -= 500;
  }

  const addFieldHits = (text?: string, perHit = 30) => {
    if (!text) return;
    const t = normalizeText(text);
    const hits = terms.filter(term => t.includes(term)).length;
    score += hits * perHit;
  };

  addFieldHits(product.category, 100);
  addFieldHits(product.sub_category, 80);
  addFieldHits(product.title, 50);
  addFieldHits(product.tags, 30);
  addFieldHits(product.style, 40);
  addFieldHits(product.room, 40);
  addFieldHits(product.functionality, 45);
  addFieldHits(product.characteristics, 35);

  [
    product.ai_material, product.ai_color, product.ai_shape, product.ai_texture,
    product.ai_pattern, product.ai_finish, product.ai_design_elements,
  ].forEach(f => addFieldHits(f, 25));

  addFieldHits(product.description, 10);

  return score;
}

/** **************
 *  SEARCH
 *************** */
async function searchProducts(filters: ProductSearchFilters, storeId?: string, sellerId?: string): Promise<Product[]> {
  console.log("🔍 [SEARCH] Searching with filters:", filters);
  console.log("🔍 [SEARCH] storeId:", storeId, "sellerId:", sellerId);
  const supabase = getSupabaseClient();

  // helper to apply post-filters & scoring
  const postProcess = (rows: any[]): Product[] => {
    const enriched = rows.map((p: any) => {
      // si product_variants joint, on peut avoir un champ variant, sinon fallback produit
      const v = p.product_variants?.[0];
      return {
        ...p,
        ai_color: v?.ai_color ?? p.ai_color,
        ai_material: v?.ai_material ?? p.ai_material,
        ai_texture: v?.ai_texture ?? p.ai_texture,
        ai_pattern: v?.ai_pattern ?? p.ai_pattern,
        ai_finish: v?.ai_finish ?? p.ai_finish,
        ai_shape: v?.ai_shape ?? p.ai_shape,
        ai_design_elements: v?.ai_design_elements ?? p.ai_design_elements,
        ai_vision_analysis: v?.ai_vision_analysis ?? p.ai_vision_analysis,
        ai_vision_confidence: v?.ai_vision_confidence ?? p.ai_vision_confidence,
        image_url: v?.image_url ?? p.image_url,
        price: (v?.price ?? p.price)?.toString?.() ?? String(p.price ?? ""),
      } as Product;
    });

    // Filtres mémoire (AND)
    let data = enriched;

    const includesNorm = (src: string | undefined, needle: string | undefined) =>
      src && needle ? normalizeText(src).includes(normalizeText(needle)) : false;

    if (filters.color) {
      data = data.filter(p => [p.ai_color, p.title, p.tags].some(f => includesNorm(f, filters.color)));
    }
    if (filters.material) {
      data = data.filter(p => [p.ai_material, p.ai_texture, p.ai_finish, p.title, p.tags, p.description].some(f => includesNorm(f, filters.material)));
    }
    if (filters.style) {
      data = data.filter(p => [p.style, p.title, p.tags].some(f => includesNorm(f, filters.style)));
    }
    if (filters.room) {
      data = data.filter(p => [p.room, p.title, p.tags].some(f => includesNorm(f, filters.room)));
    }
    if (filters.functionality) {
      data = data.filter(p => includesNorm(p.functionality, filters.functionality) || includesNorm(p.description, filters.functionality));
    }
    if (filters.characteristics) {
      data = data.filter(p => includesNorm(p.characteristics, filters.characteristics) || includesNorm(p.description, filters.characteristics));
    }
    if (filters.category) {
      data = data.filter(p => includesNorm(p.category, filters.category));
    }
    if (filters.subCategory) {
      data = data.filter(p => includesNorm(p.sub_category, filters.subCategory));
    }
    if (filters.maxPrice) {
      data = data.filter(p => {
        const price = parseFloat(p.price as any);
        return !isNaN(price) && price <= (filters.maxPrice as number);
      });
    }
    if (filters.minPrice) {
      data = data.filter(p => {
        const price = parseFloat(p.price as any);
        return !isNaN(price) && price >= (filters.minPrice as number);
      });
    }
    if (data.length === 0) return [];

    const searchQuery = filters.query || "";
    const scored = data.map(prod => ({
      ...prod,
      _relevance_score: calculateRelevanceScore(prod, searchQuery, filters.exactMatch),
    }));
    scored.sort((a, b) => (b as any)._relevance_score - (a as any)._relevance_score);
    return scored.slice(0, filters.limit || 12);
  };

  // Build base query with attempt #1 (join variants)
  const buildQueryJoin = () => {
    let q = supabase
      .from("shopify_products")
      .select(`
        *,
        product_variants!inner(
          id,
          ai_color,
          ai_material,
          ai_texture,
          ai_pattern,
          ai_finish,
          ai_shape,
          ai_design_elements,
          ai_vision_analysis,
          ai_vision_confidence,
          image_url,
          price
        )
      `)
      .eq("status", filters.status || "active");

    if (sellerId) q = q.eq("seller_id", sellerId);
    else if (storeId) q = q.eq("store_id", storeId);

    if (filters.query && filters.query.trim().length > 0) {
      const terms = normalizeText(filters.query).split(" ").filter(t => t.length > 2);
      if (filters.exactMatch) {
        const exactConds = terms.map(t =>
          `title.ilike.%${t}%,category.ilike.%${t}%,sub_category.ilike.%${t}%,product_type.ilike.%${t}%`
        );
        q = q.or(exactConds.join(","));
      } else if (terms.length > 0) {
        const conds = terms.map(t =>
          `title.ilike.%${t}%,description.ilike.%${t}%,tags.ilike.%${t}%,category.ilike.%${t}%,sub_category.ilike.%${t}%,chat_text.ilike.%${t}%,style.ilike.%${t}%,room.ilike.%${t}%,functionality.ilike.%${t}%,characteristics.ilike.%${t}%`
        );
        q = q.or(conds.join(","));
      }
    }
    return q.limit(100);
  };

  const buildQuerySimple = () => {
    let q = supabase
      .from("shopify_products")
      .select("*")
      .eq("status", filters.status || "active");
    if (sellerId) q = q.eq("seller_id", sellerId);
    else if (storeId) q = q.eq("store_id", storeId);

    if (filters.query && filters.query.trim().length > 0) {
      const terms = normalizeText(filters.query).split(" ").filter(t => t.length > 2);
      if (filters.exactMatch) {
        const exactConds = terms.map(t =>
          `title.ilike.%${t}%,category.ilike.%${t}%,sub_category.ilike.%${t}%,product_type.ilike.%${t}%`
        );
        q = q.or(exactConds.join(","));
      } else if (terms.length > 0) {
        const conds = terms.map(t =>
          `title.ilike.%${t}%,description.ilike.%${t}%,tags.ilike.%${t}%,category.ilike.%${t}%,sub_category.ilike.%${t}%,chat_text.ilike.%${t}%,style.ilike.%${t}%,room.ilike.%${t}%,functionality.ilike.%${t}%,characteristics.ilike.%${t}%`
        );
        q = q.or(conds.join(","));
      }
    }
    return q.limit(100);
  };

  try {
    // Try with join
    let { data, error } = await buildQueryJoin();
    if (error) {
      console.warn("⚠️ [SEARCH] Join failed, fallback to simple select:", error.message || error);
      // Fallback
      const fb = await buildQuerySimple();
      data = fb.data as any;
      error = fb.error as any;
      if (error) throw error;
    }
    console.log("🔍 [SEARCH] Raw rows:", data?.length || 0);
    if (!data || data.length === 0) return [];
    return postProcess(data);
  } catch (e) {
    console.error("❌ [SEARCH] Search failed:", e);
    return [];
  }
}

/** **************
 *  DeepSeek
 *************** */
async function* callDeepSeek(
  messages: ChatMessage[], 
  maxTokens = 300,
  sellerId?: string,
  context: any = {},
): AsyncGenerator<string, void, unknown> {
  const deepseekKey = Deno.env.get("DEEPSEEK_API_KEY");
  if (!deepseekKey) {
    yield "Bonjour ! Je suis votre assistant commercial. Comment puis-je vous aider ?";
    return;
  }

  try {
    let enrichedMessages = [...messages];
    if (sellerId && Object.keys(context).length > 0) {
      const supabase = getSupabaseClient();
      let contextInfo = "";

      if (context.includeKnowledge) {
        const { data: knowledge } = await supabase
          .from('chat_knowledge_base')
          .select('category, question, answer')
          .eq('user_id', sellerId)
          .eq('is_active', true)
          .order('priority', { ascending: false });
        if (knowledge && knowledge.length > 0) {
          contextInfo += `\n\n=== BASE DE CONNAISSANCES ===\n`;
          const grouped = knowledge.reduce((acc: any, item: any) => {
            (acc[item.category] ||= []).push(item);
            return acc;
          }, {});
          for (const [category, items] of Object.entries(grouped)) {
            contextInfo += `**${(category as string).toUpperCase()}**\n`;
            (items as any[]).forEach(item => {
              contextInfo += `Q: ${item.question}\nR: ${item.answer}\n\n`;
            });
          }
        }
      }

      if (context.includeProducts) {
        const { data: products, count } = await supabase
          .from('shopify_products')
          .select('title, product_type, vendor, status', { count: 'exact' })
          .eq('seller_id', sellerId)
          .limit(100);
        if (products && products.length > 0) {
          contextInfo += `\n=== CATALOGUE PRODUITS ===\n`;
          contextInfo += `Le vendeur a ${count} produits au catalogue.\n`;
          const categories = [...new Set(products.map((p: any) => p.product_type).filter(Boolean))];
          if (categories.length > 0) contextInfo += `Catégories: ${categories.join(', ')}\n`;
        }
      }

      if (context.includePages) {
        const { data: pages } = await supabase
          .from('shopify_pages')
          .select('title')
          .eq('user_id', sellerId);
        if (pages && pages.length > 0) {
          contextInfo += `\n=== PAGES DU SITE ===\n`;
          contextInfo += `Pages: ${pages.map((p: any) => p.title).join(', ')}\n`;
        }
      }

      if (context.includeOrders) {
        const { data: orders, count } = await supabase
          .from('chat_order_tracking')
          .select('fulfillment_status', { count: 'exact' })
          .eq('user_id', sellerId);
        if (count && count > 0) {
          contextInfo += `\n=== COMMANDES ===\n`;
          contextInfo += `Total: ${count} commandes\n`;
          if (orders) {
            const statusCount = orders.reduce((acc: any, o: any) => {
              const s = o.fulfillment_status || 'unfulfilled';
              acc[s] = (acc[s] || 0) + 1;
              return acc;
            }, {});
            contextInfo += `Statuts:\n` + Object.entries(statusCount).map(([s,c]) => `- ${s}: ${c}`).join("\n") + "\n";
          }
        }
      }

      if (contextInfo && enrichedMessages[0]?.role === 'system') {
        enrichedMessages[0] = { ...enrichedMessages[0], content: enrichedMessages[0].content + contextInfo };
      }
    }

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${deepseekKey}` },
      body: JSON.stringify({ model: "deepseek-chat", messages: enrichedMessages, temperature: 0.7, max_tokens: maxTokens, stream: true }),
    });

    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") continue;
        if (!trimmed.startsWith("data: ")) continue;
        try {
          const json = JSON.parse(trimmed.slice(6));
          const content = json.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch (e) { console.error("Parse error:", e); }
      }
    }
  } catch (err) {
    console.error("❌ Error calling DeepSeek:", err);
    yield "Je suis votre assistant commercial. Décrivez-moi ce que vous cherchez !";
  }
}

/** **************
 *  MAIN ORCHESTRATOR
 *************** */
async function* OmnIAChat(
  userMessage: string,
  history: ChatMessage[] = [],
  storeId?: string,
  sellerId?: string,
  context: any = {},
): AsyncGenerator<ChatResponse, void, unknown> {
  const startTime = Date.now();
  console.log("🚀 [OMNIA] Message received:", userMessage);

  try {
    const intentStart = Date.now();
    const intent = await detectIntent(userMessage);
    const intentDuration = Date.now() - intentStart;
    console.log(`🎯 Final intent: ${intent} (${intentDuration}ms)`);
    logMetric(sellerId, "chat-smart", "intent_detection", intentDuration, { intent });

    const cacheKey = `${intent}:${normalizeText(userMessage)}:${sellerId || 'anon'}`;
    const cached = getCachedResponse(cacheKey);
    if (cached) {
      logMetric(sellerId, "chat-smart", "cache_hit", Date.now() - startTime);
      yield { role:"assistant", content: cached, intent, products: [], mode:"conversation", sector:"général" };
      return;
    }

    if (intent === "simple_chat") {
      const messages: ChatMessage[] = [
        { role:"system", content: `Tu es Sophie, responsable commerciale experte.
- Chaleureuse et professionnelle
- A l'écoute
- Réponds en français, ton naturel
- Max 60 mots` },
        { role:"user", content: userMessage },
      ];

      let full = "";
      const deepseekStart = Date.now();
      let firstToken = true; let tokenCount = 0;
      for await (const chunk of callDeepSeek(messages, 80, sellerId, context)) {
        if (firstToken) { logMetric(sellerId, "chat-smart", "deepseek_first_token", Date.now()-deepseekStart); firstToken=false; }
        full += chunk; tokenCount++;
        yield { role:"assistant", content: chunk, intent:"simple_chat", products: [], mode:"conversation", sector:"général" };
      }
      setCachedResponse(cacheKey, full);
      logMetric(sellerId, "chat-smart", "total_response", Date.now()-startTime, { intent:"simple_chat", tokens: tokenCount, cached:false });
      return;
    }

    if (intent === "product_chat") {
      const searchFilters = extractFiltersFromQuery(userMessage, history);

      const contextStr = extractContextFromHistory(history);
      const knownAttributes = {
        hasColor: Boolean(searchFilters.color || /couleur|color|blanc|noir|gris|beige|bois|marron|bleu|vert|rouge/.test(normalizeText(contextStr))),
        hasMaterial: Boolean(searchFilters.material || /materiau|matiere|bois|metal|verre|marbre|cuir|tissu/.test(normalizeText(contextStr))),
        hasStyle: Boolean(searchFilters.style || /style|moderne|classique|vintage|scandinave/.test(normalizeText(contextStr))),
        hasRoom: Boolean(searchFilters.room || /salon|chambre|cuisine|bureau/.test(normalizeText(contextStr))),
        hasCategory: Boolean(searchFilters.query),
        hasBudget: Boolean(searchFilters.maxPrice || searchFilters.minPrice || /\d+\s*(euros?|€)/.test(normalizeText(contextStr))),
        hasFunctionality: Boolean(searchFilters.functionality),
        hasCharacteristics: Boolean(searchFilters.characteristics),
      };
      const attributeCount = Object.values(knownAttributes).filter(Boolean).length;
      console.log("🎯 Known attributes:", knownAttributes, "Count:", attributeCount);

      // Plus souple : proposer si >= 2 attributs (catégorie + 1 autre)
      if (attributeCount < 2) {
        const messages: ChatMessage[] = [
          {
            role: "system",
            content: `Tu es Sophie (conseillère).
HISTORIQUE:
${contextStr}

ATTRIBUTS CONNUS:
${JSON.stringify(knownAttributes, null, 2)}

RÈGLES:
- NE propose pas de produit maintenant
- Pose UNE question ciblée sur l'attribut manquant prioritaire: budget > couleur > matériau > style > pièce > fonctionnalité
- Ton: naturel, 40 mots max`,
          },
          { role: "user", content: userMessage },
        ];
        let full = "";
        for await (const chunk of callDeepSeek(messages, 80, sellerId, context)) {
          full += chunk;
          yield { role:"assistant", content: chunk, intent:"product_chat", products: [], mode:"conversation", sector:"général" };
        }
        setCachedResponse(cacheKey, full);
        return;
      }

      const products = await searchProducts(searchFilters, storeId, sellerId);
      const messages: ChatMessage[] = [
        {
          role: "system",
          content: `Tu es Sophie, experte commerciale.

CONTEXTE:
${contextStr}

PRODUITS:
${JSON.stringify(
  products.slice(0, 2).map(p => ({
    nom: p.title, prix: p.price, couleur: p.ai_color, materiau: p.ai_material,
    texture: p.ai_texture, finition: p.ai_finish, forme: p.ai_shape,
    elements_design: p.ai_design_elements, categorie: p.category,
    style: p.style, piece: p.room, fonctionnalite: p.functionality
  })), null, 2
)}

RÈGLES:
- Ne liste pas explicitement; parle naturellement de 1–2 options et pourquoi elles collent aux critères
- Utilise les attributs enrichis réels (couleur, matériau, style, pièce, fonctionnalité…)
- Termine par: "Je vous montre ces options ci-dessous 👇"
- 120 mots max`,
        },
        { role: "user", content: `Dernière question: "${userMessage}" — présente 1–2 options pertinentes.` },
      ];

      let full = "";
      for await (const chunk of callDeepSeek(messages, 150, sellerId, context)) {
        full += chunk;
        yield { role:"assistant", content: chunk, intent:"product_chat", products: products.slice(0,2), mode:"product_show", sector:"général" };
      }
      return;
    }

    // PRODUCT_SHOW
    const searchFilters = extractFiltersFromQuery(userMessage, history);
    const products = await searchProducts(searchFilters, storeId, sellerId);

    let response = "";
    if (products.length === 0) {
      response = `Je n'ai pas trouvé de produits pour "${userMessage}". Précisez la couleur, le matériau ou un budget et je vous propose des options ciblées.`;
    } else {
      const list = products.slice(0, 2);
      const promoCount = list.filter(p => p.compare_at_price && Number(p.compare_at_price) > Number(p.price)).length;
      const enrichedSummary = list.map(p => {
        const details = [];
        if (p.ai_color) details.push(`couleur ${p.ai_color}`);
        if (p.ai_material) details.push(`en ${p.ai_material}`);
        if (p.ai_finish) details.push(`finition ${p.ai_finish}`);
        if (p.style) details.push(`${p.style}`);
        if (p.room) details.push(`${p.room}`);
        return details.length ? `(${details.join(', ')})` : '';
      }).filter(Boolean).join(' et ');
      response = `J'ai sélectionné ${list.length} option${list.length>1?"s":""} ${enrichedSummary || "pertinentes"}. ${promoCount?`📢 ${promoCount} en promotion. `:""}Je vous les montre ci-dessous 👇`;
    }

    yield { role:"assistant", content: response, intent:"product_show", products: products.slice(0,2), mode:"product_show", sector:"général" };

  } catch (error) {
    console.error("❌ [OMNIA] Global error:", error);
    yield { role:"assistant", content:"Je suis désolé, un problème technique est survenu. Réessayez dans un instant.", intent:"conversation", products:[], mode:"conversation", sector:"général" };
  }
}

/** **************
 *  METRICS
 *************** */
async function logMetric(
  userId: string | undefined,
  functionName: string,
  operation: string,
  durationMs: number,
  metadata: Record<string, any> = {}
): Promise<void> {
  if (!userId) return;
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return;

    fetch(`${supabaseUrl}/functions/v1/performance-logger`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ user_id: userId, function_name: functionName, operation, duration_ms: Math.round(durationMs), metadata }),
    }).catch((err) => console.error("Failed to log metric:", err));
  } catch (err) {
    console.error("Metric logging error:", err);
  }
}

/** **************
 *  HTTP HANDLER
 *************** */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  try {
    const { userMessage, history, storeId, sellerId, context = {} } = await req.json();
    if (!userMessage) {
      return new Response(JSON.stringify({ error: "userMessage is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of OmnIAChat(userMessage, history || [], storeId, sellerId, context)) {
            const data = `data: ${JSON.stringify(chunk)}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (error) {
          console.error("Stream error:", error);
          const errData = `data: ${JSON.stringify({ 
            role: "assistant",
            content: "Erreur lors du traitement.",
            intent: "conversation",
            products: [],
            mode: "conversation",
            sector: "général"
          })}\n\n`;
          controller.enqueue(encoder.encode(errData));
        } finally {
          controller.close();
        }

        // usage++
        if (sellerId) {
          try {
            const supabase = getSupabaseClient();
            await supabase.rpc("increment_usage", {
              p_seller_id: sellerId,
              p_field: "chat_responses_count",
              p_increment: 1,
            });
            console.log("✅ Chat usage incremented for seller:", sellerId);
          } catch (usageErr) {
            console.error("❌ Usage tracking error:", usageErr);
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("❌ Edge function error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: "Internal server error", message: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
