import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey"
};

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
}

interface ProductSearchFilters {
  query?: string;
  category?: string;
  subCategory?: string;
  color?: string;
  material?: string;
  style?: string;
  room?: string;
  limit?: number;
  status?: string;
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
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function extractContextFromHistory(history: ChatMessage[]): string {
  return history.filter(msg => msg.role === 'user').slice(-3).map(msg => msg.content).join(' ');
}

function extractFiltersFromQuery(query: string, history: ChatMessage[] = []): ProductSearchFilters {
  const filters: ProductSearchFilters = {};
  const normalized = normalizeText(query);
  const pronounReferences = ['la', 'le', 'les', 'celle', 'celui', 'celles', 'ceux', 'ca', 'ça'];
  const hasPronounReference = pronounReferences.some(word => normalized.includes(word));
  let searchQuery = query;

  if (hasPronounReference && history.length > 0) {
    const context = extractContextFromHistory(history);
    console.log('🔄 Pronoun detected, using context:', context);
    searchQuery = context + ' ' + query;
  }

  const searchNormalized = normalizeText(searchQuery);
  const genericKeywords = ['produits', 'articles', 'catalogue', 'collection', 'tout', 'tous', 'tes', 'vos'];
  const isGenericRequest = genericKeywords.some(word => searchNormalized.includes(word));

  const colors = ['blanc', 'noir', 'gris', 'beige', 'bois', 'marron', 'bleu', 'vert', 'rouge', 'jaune', 'orange', 'rose', 'violet', 'white', 'black', 'gray', 'brown', 'blue', 'green', 'red', 'yellow', 'pink', 'purple'];
  const foundColor = colors.find(c => searchNormalized.includes(normalizeText(c)));
  if (foundColor) filters.color = foundColor;

  const materials = ['bois', 'metal', 'métal', 'verre', 'marbre', 'cuir', 'tissu', 'plastique', 'ceramique', 'céramique', 'wood', 'metal', 'glass', 'marble', 'leather', 'fabric', 'plastic', 'ceramic'];
  const foundMaterial = materials.find(m => searchNormalized.includes(normalizeText(m)));
  if (foundMaterial) filters.material = foundMaterial;

  const styles = ['moderne', 'contemporain', 'classique', 'vintage', 'scandinave', 'industriel', 'rustique', 'tendance', 'elegant', 'élégant', 'design', 'minimaliste'];
  const foundStyle = styles.find(s => searchNormalized.includes(normalizeText(s)));
  if (foundStyle) filters.style = foundStyle;

  const rooms = ['salon', 'chambre', 'cuisine', 'salle de bain', 'bureau', 'jardin', 'terrasse', 'entree', 'entrée'];
  const foundRoom = rooms.find(r => searchNormalized.includes(normalizeText(r)));
  if (foundRoom) filters.room = foundRoom;

  const categories = ['canape', 'table', 'chaise', 'fauteuil', 'meuble', 'armoire', 'lit', 'bureau', 'lampe', 'miroir'];
  const foundCategory = categories.find(c => searchNormalized.includes(c));

  if (foundCategory) {
    filters.query = foundCategory;
  } else if (isGenericRequest) {
    filters.query = '';
  } else {
    filters.query = searchQuery;
  }

  filters.status = 'active';
  filters.limit = 12;
  console.log('📋 Extracted filters:', filters);
  return filters;
}

function calculateRelevanceScore(product: Product, searchQuery: string): number {
  const query = normalizeText(searchQuery);
  const terms = query.split(' ').filter(term => term.length > 2);
  let score = 0;

  const productTypes = ['table', 'chaise', 'canape', 'fauteuil', 'armoire', 'lit', 'bureau', 'lampe', 'miroir', 'commode', 'buffet', 'etagere', 'tabouret'];
  const mentionedType = productTypes.find(type => terms.includes(type));

  if (mentionedType) {
    const title = normalizeText(product.title || '');
    const category = normalizeText(product.category || '');
    const subCategory = normalizeText(product.sub_category || '');
    
    if (title.includes(mentionedType) || category === mentionedType || subCategory.includes(mentionedType)) {
      score += 1000;
    } else if (category.includes(mentionedType) || title.split(' ').some(word => word === mentionedType)) {
      score += 800;
    } else {
      score -= 500;
    }
  }

  if (product.category) {
    const category = normalizeText(product.category);
    if (terms.some(term => category.includes(term))) {
      score += 100;
      if (terms.some(term => category === term)) score += 500;
    }
  }

  if (product.sub_category) {
    const subCat = normalizeText(product.sub_category);
    if (terms.some(term => subCat.includes(term))) score += 80;
  }

  if (product.title) {
    const title = normalizeText(product.title);
    const titleWords = title.split(' ');
    let titleMatches = 0;
    for (const term of terms) {
      if (titleWords.some(word => word.includes(term) || term.includes(word))) titleMatches++;
    }
    score += titleMatches * 50;
    if (terms.some(term => titleWords.includes(term))) score += 200;
  }

  if (product.tags) {
    const tags = normalizeText(product.tags);
    const tagCount = terms.filter(term => tags.includes(term)).length;
    score += tagCount * 30;
  }

  const aiFields = [product.ai_material, product.ai_color, product.ai_shape, product.style, product.room];
  for (const field of aiFields) {
    if (field) {
      const normalized = normalizeText(field);
      if (terms.some(term => normalized.includes(term))) score += 20;
    }
  }

  if (product.description) {
    const desc = normalizeText(product.description);
    const descMatches = terms.filter(term => desc.includes(term)).length;
    score += descMatches * 10;
  }

  return score;
}

async function searchProducts(filters: ProductSearchFilters, storeId?: string, sellerId?: string): Promise<Product[]> {
  console.log('🔍 [SEARCH] Searching with filters:', filters);
  console.log('🔍 [SEARCH] storeId:', storeId, 'sellerId:', sellerId);

  try {
    const supabase = getSupabaseClient();
    let query = supabase
      .from('shopify_products')
      .select('*')
      .eq('status', filters.status || 'active');

    if (sellerId) {
      console.log('🔍 [SEARCH] Filtering by seller_id:', sellerId);
      query = query.eq('seller_id', sellerId);
    } else if (storeId) {
      console.log('🔍 [SEARCH] Filtering by store_id:', storeId);
      query = query.eq('store_id', storeId);
    } else {
      console.log('🔍 [SEARCH] No seller/store filter - searching all');
    }

    if (filters.query && filters.query.trim().length > 0) {
      const searchTerms = normalizeText(filters.query).split(' ').filter(term => term.length > 2);
      console.log('🔍 [SEARCH] Search terms:', searchTerms);
      
      if (searchTerms.length > 0) {
        const orConditions = searchTerms.flatMap(term => [
          `title.ilike.%${term}%`,
          `description.ilike.%${term}%`,
          `tags.ilike.%${term}%`,
          `category.ilike.%${term}%`,
          `sub_category.ilike.%${term}%`,
          `product_type.ilike.%${term}%`,
          `vendor.ilike.%${term}%`,
          `ai_color.ilike.%${term}%`,
          `ai_material.ilike.%${term}%`,
          `ai_shape.ilike.%${term}%`,
          `style.ilike.%${term}%`,
          `room.ilike.%${term}%`,
          `chat_text.ilike.%${term}%`
        ]).join(',');
        
        console.log('🔍 [SEARCH] OR conditions (first 200 chars):', orConditions.substring(0, 200));
        query = query.or(orConditions);
      }
    } else {
      console.log('🔍 [SEARCH] No query filter - will return all active products');
    }

    if (filters.color) query = query.or(`ai_color.ilike.%${filters.color}%,title.ilike.%${filters.color}%`);
    if (filters.material) query = query.or(`ai_material.ilike.%${filters.material}%,title.ilike.%${filters.material}%`);
    if (filters.style) query = query.or(`style.ilike.%${filters.style}%,tags.ilike.%${filters.style}%`);
    if (filters.room) query = query.or(`room.ilike.%${filters.room}%,tags.ilike.%${filters.room}%`);

    if (filters.category) query = query.ilike('category', `%${filters.category}%`);
    if (filters.subCategory) query = query.ilike('sub_category', `%${filters.subCategory}%`);

    query = query.limit((filters.limit || 12) * 3);
    const { data, error } = await query;

    if (error) {
      console.error('❌ [SEARCH] Database error:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('✅ [SEARCH] Found 0 products');
      return [];
    }

    const searchQuery = filters.query || '';
    const scoredProducts = data.map(product => ({
      ...product,
      _relevance_score: calculateRelevanceScore(product, searchQuery)
    }));

    scoredProducts.sort((a, b) => b._relevance_score - a._relevance_score);
    const results = scoredProducts.slice(0, filters.limit || 12);

    console.log(`✅ [SEARCH] Found ${data.length} products, returning top ${results.length} by relevance`);
    console.log('🎯 [SEARCH] Top 3 scores:', results.slice(0, 3).map(p => ({
      title: p.title,
      score: p._relevance_score,
      category: p.category
    })));

    return results;
  } catch (error) {
    console.error('❌ [SEARCH] Search failed:', error);
    return [];
  }
}

async function detectIntent(userMessage: string): Promise<"simple_chat" | "product_chat" | "product_show"> {
  const msg = normalizeText(userMessage);
  console.log("🧠 Analyzing intent for:", msg);
  let scores = { simple_chat: 0, product_chat: 0, product_show: 0 };

  const simpleChatKeywords = ["bonjour", "salut", "hello", "coucou", "hey", "hi", "bonsoir", "comment ca va", "ca va", "comment allez-vous", "merci", "thanks", "au revoir", "bye", "a bientot", "ok", "d'accord", "parfait", "super", "genial", "cool", "qui es-tu", "ton nom", "tu fais quoi", "comment tu t'appelles", "tu es un robot", "tu es une ia", "vous etes disponible", "vous travaillez", "jour de repos", "week-end"];
  const productShowKeywords = ["montre", "montrez", "montre-moi", "affiche", "voir", "regarder", "montrer", "liste", "lister", "catalogue", "collection", "gamme", "selection", "je cherche", "je veux", "j'ai besoin", "je voudrais", "trouver", "acheter", "commander", "panier", "budget", "plusieurs", "quelques", "des", "tous les", "toutes les"];
  const productChatKeywords = ["avez-vous", "proposez-vous", "vendez-vous", "vous avez", "disponible", "en stock", "existe", "qualite", "durable", "resistant", "solide", "fiable", "materiau", "matiere", "composition", "fabrication", "garantie", "retour", "satisfait", "livraison", "conseil", "avis", "recommandation", "suggestion", "comment choisir", "lequel", "quelle", "difference", "meilleur", "preferer", "conseiller", "tendance", "mode", "populaire", "best-seller", "nouveau", "actualite", "promotion", "promo", "solde", "offre"];
  const productKeywords = ["produit", "article", "modele", "reference", "table", "chaise", "canape", "fauteuil", "meuble", "lit", "bureau", "armoire", "lampe", "miroir", "decoration", "mobilier", "robe", "chemise", "pantalon", "jupe", "sac", "bijou", "vetement", "chaussure", "accessoire", "ceinture", "telephone", "smartphone", "ordinateur", "tablette", "casque"];

  simpleChatKeywords.forEach(word => { if (msg.includes(word)) scores.simple_chat += 10; });
  productShowKeywords.forEach(word => { if (msg.includes(word)) scores.product_show += 20; });
  productChatKeywords.forEach(word => { if (msg.includes(word)) scores.product_chat += 8; });
  productKeywords.forEach(word => { if (msg.includes(word)) { scores.product_chat += 5; scores.product_show += 5; } });
  
  if (msg.length < 15 && scores.simple_chat > 0 && scores.product_show === 0) scores.simple_chat += 50;

  console.log("📊 Intent scores:", scores);
  const maxScore = Math.max(scores.simple_chat, scores.product_chat, scores.product_show);

  if (maxScore === 0) {
    console.log("🎯 Decision: SIMPLE_CHAT (no keywords matched - fallback)");
    return "simple_chat";
  }

  if (scores.product_show === maxScore && scores.product_show > 0) {
    console.log("🎯 Decision: PRODUCT_SHOW (strongest intent to see products)");
    return "product_show";
  }

  if (scores.product_chat === maxScore && scores.product_chat > 0) {
    console.log("🎯 Decision: PRODUCT_CHAT (information request about products)");
    return "product_chat";
  }

  console.log("🎯 Decision: SIMPLE_CHAT (conversation intent)");
  return "simple_chat";
}

async function callDeepSeek(messages: ChatMessage[], maxTokens = 300): Promise<string> {
  const deepseekKey = Deno.env.get("DEEPSEEK_API_KEY");
  if (!deepseekKey) return "Bonjour ! Je suis votre assistant commercial. Comment puis-je vous aider ?";

  try {
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${deepseekKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages,
        temperature: 0.7,
        max_tokens: maxTokens,
        stream: false
      })
    });

    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

    const data = await response.json();
    if (data.choices && data.choices[0] && data.choices[0].message) return data.choices[0].message.content;
    
    return "Je suis votre assistant commercial. Comment puis-je vous aider ?";
  } catch (err) {
    console.error("❌ Error calling DeepSeek:", err);
    return "Je suis votre assistant commercial. Décrivez-moi ce que vous cherchez !";
  }
}

async function OmnIAChat(userMessage: string, history: ChatMessage[] = [], storeId?: string, sellerId?: string): Promise<ChatResponse> {
  console.log("🚀 [OMNIA] Message received:", userMessage);

  try {
    const intent = await detectIntent(userMessage);
    console.log("🎯 Final intent:", intent);

    if (intent === "simple_chat") {
      const messages: ChatMessage[] = [
        {
          role: "system",
          content: `Tu es un assistant commercial friendly et professionnel.\nRéponds de manière concise et chaleureuse en français.\nMax 50 mots. Sois naturel et engageant.`
        },
        { role: "user", content: userMessage }
      ];

      const response = await callDeepSeek(messages, 80);
      return {
        role: "assistant",
        content: response,
        intent: "simple_chat",
        products: [],
        mode: "conversation",
        sector: "général"
      };
    }

    if (intent === "product_chat") {
      const searchFilters = extractFiltersFromQuery(userMessage, history);
      const products = await searchProducts(searchFilters, storeId, sellerId);

      const messages: ChatMessage[] = [
        {
          role: "system",
          content: `Tu es un vendeur expert et enthousiaste.\n\nRÈGLES :\n🚫 NE montre PAS les produits (pas de liste)\n✅ Parle NATURELLEMENT des caractéristiques\n✅ Donne des informations PRÉCISES basées sur les produits réels\n✅ Termine par une question pour continuer la discussion`
        },
        {
          role: "user",
          content: `PRODUITS DISPONIBLES : ${JSON.stringify(products.map(p => ({
            nom: p.title,
            prix: p.price,
            matériau: p.ai_material,
            couleur: p.ai_color,
            catégorie: p.category
          })), null, 2)}\n\nQuestion client : "${userMessage}"\n\nRéponds naturellement sans lister les produits.`
        }
      ];

      const response = await callDeepSeek(messages, 200);
      return {
        role: "assistant",
        content: response,
        intent: "product_chat",
        products: [],
        mode: "conversation",
        sector: "général"
      };
    }

    console.log("🛍️ Searching products for display...");
    const searchFilters = extractFiltersFromQuery(userMessage, history);
    const products = await searchProducts(searchFilters, storeId, sellerId);

    let response = "";
    if (products.length === 0) {
      response = `Je n'ai pas trouvé de produits correspondant à votre recherche "${userMessage}".\n\nPour affiner votre recherche :\n• Essayez d'autres termes ou synonymes\n• Précisez la couleur, le matériau ou le style\n• Indiquez votre budget si vous en avez un\n\nJe reste à votre disposition pour vous aider !`;
    } else {
      const productCount = products.length;
      const promoCount = products.filter(p => p.compare_at_price && Number(p.compare_at_price) > Number(p.price)).length;
      response = `J'ai trouvé ${productCount} produit${productCount > 1 ? 's' : ''} correspondant à votre recherche. ${promoCount > 0 ? `📢 ${promoCount} en promotion ! ` : ''}Découvrez-les ci-dessous 👇`;
    }

    return {
      role: "assistant",
      content: response,
      intent: "product_show",
      products: products,
      mode: "product_show",
      sector: "général"
    };
  } catch (error) {
    console.error("❌ [OMNIA] Global error:", error);
    return {
      role: "assistant",
      content: "Je suis désolé, je rencontre un problème technique. Pouvez-vous réessayer dans un instant ?",
      intent: "conversation",
      products: [],
      mode: "conversation",
      sector: "général"
    };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const { userMessage, history, storeId, sellerId } = await req.json();

    if (!userMessage) return new Response(
      JSON.stringify({ error: "userMessage is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

    const response = await OmnIAChat(userMessage, history || [], storeId, sellerId);
    
    // Increment chat_responses_count usage tracking
    if (sellerId) {
      try {
        const supabase = getSupabaseClient();
        const { error: usageError } = await supabase.rpc('increment_usage', {
          p_seller_id: sellerId,
          p_field: 'chat_responses_count',
          p_increment: 1
        });
        
        if (usageError) {
          console.error('❌ Error incrementing chat usage:', usageError);
        } else {
          console.log('✅ Chat usage incremented for seller:', sellerId);
        }
      } catch (usageErr) {
        console.error('❌ Usage tracking error:', usageErr);
      }
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("❌ Edge function error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
