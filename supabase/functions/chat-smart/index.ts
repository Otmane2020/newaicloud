import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
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
  image_url?: string;
  category?: string;
  handle?: string;
  vendor?: string;
  currency?: string;
  description?: string;
}

interface ChatResponse {
  role: "assistant";
  content: string;
  intent: "simple_chat" | "product_chat" | "product_show";
  products: Product[];
  mode: "conversation" | "product_show" | "product_chat";
  sector: string;
}

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase credentials");
  return createClient(supabaseUrl, supabaseKey);
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

async function detectIntent(
  userMessage: string, 
  history: ChatMessage[] = []
): Promise<"simple_chat" | "product_chat" | "product_show"> {
  const msg = normalizeText(userMessage);
  
  console.log("🧠 Analyzing intent for:", msg);
  
  // Simple greeting detection
  const greetings = ["bonjour", "salut", "hello", "coucou", "hey", "hi", "bonsoir"];
  if (greetings.some(g => msg.includes(g)) && msg.length < 20) {
    return "simple_chat";
  }

  // Product show detection
  const showKeywords = ["montre", "voir", "affiche", "liste", "catalogue", "je cherche", "je veux"];
  if (showKeywords.some(k => msg.includes(k))) {
    return "product_show";
  }

  // Product chat detection  
  const chatKeywords = ["combien", "prix", "couleur", "conseil", "recommande", "detail"];
  if (chatKeywords.some(k => msg.includes(k))) {
    return "product_chat";
  }

  return "simple_chat";
}

async function searchProducts(
  sellerId: string, 
  query?: string,
  limit: number = 12
): Promise<Product[]> {
  const supabase = getSupabaseClient();
  
  let dbQuery = supabase
    .from('shopify_products')
    .select('*')
    .eq('seller_id', sellerId)
    .eq('status', 'active')
    .limit(limit);
    
  if (query && query.trim()) {
    dbQuery = dbQuery.ilike('title', `%${query}%`);
  }
  
  const { data, error } = await dbQuery;
  
  if (error) {
    console.error("Error fetching products:", error);
    return [];
  }
  
  return data || [];
}

async function callLovableAI(messages: ChatMessage[]): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Rate limit atteint. Veuillez réessayer.");
    }
    if (response.status === 402) {
      throw new Error("Crédits insuffisants.");
    }
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "Je n'ai pas pu générer de réponse.";
}

async function* OmnIAChat(
  userMessage: string,
  history: ChatMessage[] = [],
  storeId?: string,
  sellerId?: string,
): AsyncGenerator<ChatResponse, void, unknown> {
  console.log("🚀 [OMNIA] Message received:", userMessage);

  try {
    const intent = await detectIntent(userMessage, history);
    console.log(`🎯 Intent detected: ${intent}`);

    // Handle simple chat
    if (intent === "simple_chat") {
      const systemMessage = {
        role: "system" as const,
        content: `Tu es un conseiller commercial IA sympathique et professionnel. 
        Tu aides les clients à trouver des produits et réponds à leurs questions.
        Reste bref, clair et amical. Utilise des emojis avec modération.`
      };

      const aiMessages = [systemMessage, ...history, { role: "user" as const, content: userMessage }];
      const response = await callLovableAI(aiMessages);

      yield {
        role: "assistant",
        content: response,
        intent: "simple_chat",
        products: [],
        mode: "conversation",
        sector: "général",
      };
      return;
    }

    // Handle product_chat
    if (intent === "product_chat") {
      yield {
        role: "assistant",
        content: `Je serais ravi de vous aider à trouver le produit parfait ! 
        
Pourriez-vous me préciser :
• La couleur que vous préférez
• Le matériau souhaité
• Le style que vous recherchez
• La pièce où ce sera placé

Cela m'aidera à vous proposer les meilleures options ! 🎯`,
        intent: "product_chat",
        products: [],
        mode: "product_chat",
        sector: "mobilier",
      };
      return;
    }

    // Handle product_show
    if (intent === "product_show" && sellerId) {
      const normalizedQuery = normalizeText(userMessage);
      
      // Extract search terms
      const categories = [
        "table", "chaise", "canape", "fauteuil", "meuble", 
        "armoire", "lit", "bureau", "lampe", "miroir"
      ];
      const foundCategory = categories.find(c => normalizedQuery.includes(c));
      
      const products = await searchProducts(sellerId, foundCategory, 12);

      if (products.length === 0) {
        yield {
          role: "assistant",
          content: "Je n'ai pas trouvé de produits correspondant à votre recherche. Voulez-vous voir notre catalogue complet ?",
          intent: "product_show",
          products: [],
          mode: "product_show",
          sector: "mobilier",
        };
        return;
      }

      const productList = products.map(p => `• ${p.title} - ${p.price}€`).join('\n');
      
      yield {
        role: "assistant",
        content: `Voici ${products.length} produits qui pourraient vous intéresser :\n\n${productList}\n\nClic sur un produit pour plus de détails ! 🛍️`,
        intent: "product_show",
        products: products,
        mode: "product_show",
        sector: "mobilier",
      };
      return;
    }

    // Fallback
    yield {
      role: "assistant",
      content: "Comment puis-je vous aider aujourd'hui ? 😊",
      intent: "simple_chat",
      products: [],
      mode: "conversation",
      sector: "général",
    };

  } catch (error) {
    console.error("❌ [OMNIA] Error:", error);
    yield {
      role: "assistant",
      content: "Je suis désolé, je rencontre un problème technique. Pouvez-vous réessayer ?",
      intent: "simple_chat",
      products: [],
      mode: "conversation",
      sector: "général",
    };
  }
}

// HTTP Handler
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userMessage, history = [], storeId, sellerId } = await req.json();
    
    if (!userMessage) {
      return new Response(
        JSON.stringify({ error: "userMessage is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("📨 Message:", userMessage);
    console.log("👤 Seller ID:", sellerId);

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const generator = OmnIAChat(userMessage, history, storeId, sellerId);
          
          for await (const chunk of generator) {
            const data = `data: ${JSON.stringify(chunk)}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
          
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("❌ Stream error:", error);
          const errorData = `data: ${JSON.stringify({
            role: "assistant",
            content: "Désolé, une erreur s'est produite.",
            intent: "simple_chat",
            products: [],
            mode: "conversation",
            sector: "général"
          })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      }
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
    console.error("❌ Chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
