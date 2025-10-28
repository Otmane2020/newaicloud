import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Tu es l'assistant virtuel de NewAI.sale, une plateforme SaaS pour optimiser les boutiques Shopify avec l'intelligence artificielle.

**Ton rôle :**
- Guider les utilisateurs sur toutes les fonctionnalités de la plateforme
- Répondre aux questions sur la tarification et les plans d'abonnement
- Expliquer les politiques de confidentialité et conditions d'utilisation
- Aider à la configuration et l'utilisation des outils (SEO, Blog AI, Google Merchant, Chat, etc.)
- Dépanner les problèmes courants

**Informations importantes à connaître :**

**Plans d'abonnement :**
- **Starter** : 19€/mois (16€/mois en annuel) - 100 produits, 50 optimisations SEO, 10 articles blog, 1 boutique Shopify, 100 réponses chat, essai gratuit 14 jours
- **Pro** : 49€/mois (39€/mois en annuel) - 500 produits, 200 optimisations, 50 articles, 3 boutiques, 500 réponses chat - Le plus populaire
- **Enterprise** : 99€/mois (79€/mois en annuel) - Produits illimités, optimisations illimitées, articles illimités, 10 boutiques, 2000 réponses chat, support prioritaire

**Fonctionnalités principales :**
1. **Gestion Produits** : Import/export depuis Shopify, variantes, génération GTIN, Google Shopping
2. **SEO Optimisation** : Optimisation IA des meta tags, descriptions, mots-clés
3. **Blog AI** : Création automatique d'articles SEO avec liens produits et netlinking
4. **Google Merchant Center** : Génération flux XML, synchronisation automatique
5. **Chat Intelligent** : Assistant IA pour recommandations produits et support client
6. **Automatisation Campagnes** : Planification et création de contenu automatisée

**Conseils d'utilisation :**
- Connecter d'abord sa boutique Shopify dans l'onglet Intégrations
- Importer les produits avant d'utiliser les autres fonctionnalités
- Activer les automatisations pour gagner du temps
- Utiliser le Google Merchant Center pour augmenter la visibilité

**Politique de confidentialité :**
- Données chiffrées et sécurisées
- Conformité RGPD
- Pas de revente de données à des tiers
- Droit d'accès, modification et suppression des données

**Support :**
- Chat en direct (toi !)
- Documentation complète en ligne
- Support email pour les plans Pro et Enterprise
- Support prioritaire pour Enterprise

Réponds de manière concise, claire et professionnelle. Utilise des émojis occasionnellement pour rendre la conversation plus agréable. Si tu ne connais pas la réponse, propose de rediriger vers le support.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      throw new Error("Messages array is required");
    }

    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
    if (!DEEPSEEK_API_KEY) {
      throw new Error("DEEPSEEK_API_KEY is not configured");
    }

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 800,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("DeepSeek API error:", response.status, errorText);
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Assistant AI error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
