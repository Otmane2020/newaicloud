import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, TrendingUp, FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Opportunity {
  id: string;
  title: string;
  description: string;
  category: string;
  productsCount: number;
  type: "comparison" | "guide" | "trend" | "howto" | "expert";
  angle?: string;
  targetAudience?: string;
  primaryKeywords?: string[];
  secondaryKeywords?: string[];
  metaDescription?: string;
  estimatedWordCount?: number;
  seoScore?: number;
  difficulty?: "easy" | "medium" | "hard";
  productIds?: string[];
}

export function BlogOpportunities() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    const initOpportunities = async () => {
      try {
        await loadOpportunities();
      } catch (error) {
        console.error("Error initializing opportunities:", error);
        toast.error("Erreur lors du chargement initial des opportunités");
      }
    };
    initOpportunities();
  }, []);

  const analyzeAndGenerateOpportunities = async (products: any[], userId: string) => {
    try {
      // Préparer les données du catalogue avec détails enrichis (limiter à 100 premiers pour ne pas exploser le token count)
      const catalogueAnalysis = products.slice(0, 100).map(p => ({
        title: p.title,
        category: p.product_type || p.category || 'Non catégorisé',
        vendor: p.vendor || 'Inconnu',
        price: p.price ? `${p.price} EUR` : 'Prix non disponible',
        description: p.description?.substring(0, 200) || '',
        tags: p.tags || '',
        style: p.style || '',
        room: p.room || ''
      }));

      // Statistiques du catalogue
      const categories = [...new Set(products.map(p => p.product_type || p.category).filter(Boolean))];
      const priceRanges = {
        budget: products.filter(p => p.price && p.price < 300).length,
        mid: products.filter(p => p.price && p.price >= 300 && p.price < 1000).length,
        premium: products.filter(p => p.price && p.price >= 1000).length
      };

      const prompt = `Tu es un expert en marketing de contenu, SEO et décoration d'intérieur pour e-commerce mobilier.

MISSION : Analyse ce catalogue de ${products.length} produits mobilier et génère des opportunités d'articles de blog à FORT POTENTIEL SEO et VALEUR AJOUTÉE pour les clients.

📊 STATISTIQUES DU CATALOGUE :
- Total produits : ${products.length}
- Catégories principales : ${categories.slice(0, 10).join(', ')}
- Prix : ${priceRanges.budget} budget, ${priceRanges.mid} milieu de gamme, ${priceRanges.premium} premium

📦 ÉCHANTILLON PRODUITS (${catalogueAnalysis.length} premiers) :
${JSON.stringify(catalogueAnalysis.slice(0, 20), null, 2)}

🎯 OBJECTIF : Identifier les MEILLEURS angles d'articles qui :
1. Résolvent des PROBLÈMES RÉELS des clients
2. Répondent à des QUESTIONS FRÉQUENTES 
3. Ont un FORT POTENTIEL SEO (mots-clés longue traîne)
4. Apportent une VRAIE VALEUR (conseils experts, guides pratiques)
5. Sont ORIGINAUX (pas des guides génériques)

✅ TYPES D'ARTICLES À PRIVILÉGIER :

**Guides Problème/Solution** (score élevé)
- "Petit Salon : 7 Astuces pour Optimiser l'Espace avec Style"
- "Canapé pour Petit Appartement : Top 5 Modèles Gain de Place"
- "Bureau à Domicile : Aménager un Espace Productif en 2024"

**Guides d'Achat par Besoin** (fort potentiel SEO)
- "Chaise de Bureau Ergonomique : 5 Critères Essentiels"
- "Table à Manger Extensible : Guide Complet pour Famille"
- "Mobilier Scandinave : Comment Créer un Intérieur Harmonieux"

**Comparatifs Intelligents** (engagement élevé)
- "Canapé en L vs Canapé Droit : Lequel Choisir pour Votre Salon ?"
- "Table Ronde vs Rectangulaire : Le Guide Complet 2024"
- "Chaise Scandinave vs Industrielle : Comparatif Styles"

**Tendances & Inspiration** (partages élevés)
- "Style Japandi : Marier Scandinave et Japonais en 2024"
- "Couleurs Tendance 2024 : Comment les Intégrer à Votre Intérieur"
- "Minimalisme Chaleureux : 10 Astuces pour un Intérieur Cosy"

**Conseils d'Expert** (autorité SEO)
- "7 Erreurs à Éviter lors du Choix d'un Canapé"
- "Comment Agencer une Salle à Manger pour Recevoir"
- "Entretien Mobilier : Guide Complet par Matériau"

❌ INTERDICTIONS ABSOLUES :
- Pas de "Collection X" ou "Découvrez nos produits"
- Pas de titres commerciaux directs
- Pas de simple description de produits
- Pas de contenu générique sans valeur

📋 FORMAT DE RÉPONSE (JSON uniquement) :

{
  "opportunities": [
    {
      "title": "Titre SEO optimisé, engageant et spécifique (max 60 caractères)",
      "description": "Description détaillée de la valeur de l'article (2-3 phrases)",
      "category": "Catégorie principale liée",
      "type": "guide|comparison|trend|howto|expert",
      "angle": "Angle unique de l'article (problème résolu ou bénéfice clair)",
      "targetAudience": "Audience cible (ex: jeunes couples, télétravail, petit espace)",
      "primaryKeywords": ["mot-clé principal 1", "mot-clé principal 2"],
      "secondaryKeywords": ["mot-clé secondaire 1", "mot-clé 2", "mot-clé 3"],
      "metaDescription": "Meta description SEO optimisée (150-160 caractères)",
      "estimatedWordCount": 1500,
      "seoScore": 85,
      "difficulty": "easy|medium|hard"
    }
  ]
}

Génère 12-15 opportunités d'articles PERTINENTES, ORIGINALES et à FORT POTENTIEL.
Retourne UNIQUEMENT le JSON, sans texte avant ou après.`;

      const { data } = await supabase.functions.invoke("chat-smart", {
        body: { 
          userMessage: prompt,
          sellerId: userId,
          useDeepseek: true
        }
      });

      if (!data?.content) {
        throw new Error('Pas de réponse de l\'IA');
      }

      const aiResponse = data.content;
      
      let optimizedData;
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          optimizedData = JSON.parse(jsonMatch[0]);
        } else {
          optimizedData = JSON.parse(aiResponse);
        }
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
        throw new Error('Erreur lors du parsing de la réponse IA');
      }

      if (!optimizedData.opportunities || !Array.isArray(optimizedData.opportunities)) {
        throw new Error('Structure de réponse IA invalide');
      }

      // Matcher les opportunités avec les produits du catalogue
      return optimizedData.opportunities.map((opt: any, index: number) => {
        const relatedProducts = products.filter(p => {
          const category = (p.product_type || p.category || '').toLowerCase();
          const title = (p.title || '').toLowerCase();
          const vendor = (p.vendor || '').toLowerCase();
          const tags = (p.tags || '').toLowerCase();
          
          // Matching par catégorie
          if (opt.category && category.includes(opt.category.toLowerCase())) {
            return true;
          }
          
          // Matching par mots-clés
          const allKeywords = [...(opt.primaryKeywords || []), ...(opt.secondaryKeywords || [])];
          return allKeywords.some(keyword => 
            title.includes(keyword.toLowerCase()) ||
            category.includes(keyword.toLowerCase()) ||
            vendor.includes(keyword.toLowerCase()) ||
            tags.includes(keyword.toLowerCase())
          );
        });

        return {
          id: `opp-${index}`,
          title: opt.title || 'Article sans titre',
          description: opt.description || '',
          category: opt.category || '',
          productsCount: relatedProducts.length,
          type: opt.type || 'guide',
          angle: opt.angle || '',
          targetAudience: opt.targetAudience || '',
          primaryKeywords: opt.primaryKeywords || [],
          secondaryKeywords: opt.secondaryKeywords || [],
          metaDescription: opt.metaDescription || '',
          estimatedWordCount: opt.estimatedWordCount || 1500,
          seoScore: opt.seoScore || 70,
          difficulty: opt.difficulty || 'medium',
          productIds: relatedProducts.slice(0, 20).map(p => p.id)
        };
      }).filter(opt => opt.productsCount > 0); // Garder seulement les opportunités avec des produits matchés

    } catch (error) {
      console.error('Error in analyzeAndGenerateOpportunities:', error);
      throw error;
    }
  };

  const loadOpportunities = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Récupérer TOUS les produits avec leurs détails complets
      const { data: products } = await supabase
        .from("shopify_products")
        .select("id, title, description, category, tags, product_type, vendor, price, style, room")
        .eq("seller_id", user.id);

      if (!products || products.length === 0) {
        toast.info("Aucun produit trouvé. Importez des produits d'abord.");
        return;
      }

      // Analyser le catalogue et générer des opportunités intelligentes avec DeepSeek
      toast.info("Analyse intelligente du catalogue en cours...");
      const intelligentOpportunities = await analyzeAndGenerateOpportunities(products, user.id);

      if (intelligentOpportunities && intelligentOpportunities.length > 0) {
        setOpportunities(intelligentOpportunities);
        toast.success(`${intelligentOpportunities.length} opportunités d'articles détectées !`);
      } else {
        toast.error("Aucune opportunité générée. Réessayez.");
      }

    } catch (error) {
      console.error("Error loading opportunities:", error);
      toast.error("Erreur lors de l'analyse du catalogue");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateArticle = async (opp: Opportunity) => {
    try {
      setGenerating(opp.id);
      toast.info("Génération de l'article...");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data, error } = await supabase.functions.invoke("generate-blog-article", {
        body: {
          user_id: user.id,
          title: opp.title,
          category: opp.category,
          keywords: [...(opp.primaryKeywords || []), ...(opp.secondaryKeywords || [])],
          meta_description: opp.metaDescription,
          angle: opp.angle,
          target_audience: opp.targetAudience,
          estimated_word_count: opp.estimatedWordCount || 1500
        },
      });

      if (error) throw error;

      toast.success(`Article "${opp.title}" généré avec succès !`);
      window.location.href = "/blog?tab=articles";
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la génération de l'article");
    } finally {
      setGenerating(null);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    await loadOpportunities();
    setRegenerating(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "comparison":
        return TrendingUp;
      case "guide":
        return FileText;
      case "trend":
        return Lightbulb;
      default:
        return Sparkles;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Sparkles className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (opportunities.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Lightbulb className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              Aucune opportunité détectée. Générez des opportunités basées sur votre catalogue.
            </p>
            <Button
              onClick={handleRegenerate}
              disabled={regenerating}
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {regenerating ? (
                <>
                  <Sparkles className="w-5 h-5 mr-2 animate-spin" />
                  Analyse en cours...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Générer opportunités IA
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-semibold">Opportunités de Contenu IA</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {opportunities.length} opportunités détectées basées sur votre catalogue
          </p>
        </div>
        <Button
          onClick={handleRegenerate}
          disabled={regenerating}
          size="lg"
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          {regenerating ? (
            <>
              <Sparkles className="w-5 h-5 mr-2 animate-spin" />
              Analyse en cours...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Générer opportunités IA
            </>
          )}
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {opportunities.map((opp) => {
          const Icon = getIcon(opp.type);
          return (
            <Card key={opp.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <Icon className="w-8 h-8 text-primary mb-2 flex-shrink-0" />
                  <div className="flex flex-col gap-1 items-end">
                    <Badge variant="outline">
                      {opp.productsCount} produit{opp.productsCount > 1 ? "s" : ""}
                    </Badge>
                    {opp.seoScore && (
                      <Badge variant={opp.seoScore >= 80 ? "default" : "secondary"}>
                        SEO: {opp.seoScore}/100
                      </Badge>
                    )}
                  </div>
                </div>
                <CardTitle className="text-lg">{opp.title}</CardTitle>
                <CardDescription>{opp.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {opp.angle && (
                    <div className="text-sm">
                      <span className="font-semibold">Angle:</span> {opp.angle}
                    </div>
                  )}
                  {opp.targetAudience && (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-semibold">Audience:</span> {opp.targetAudience}
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">
                    <span className="font-semibold">Catégorie:</span> {opp.category}
                  </div>
                  {opp.difficulty && (
                    <Badge variant="outline" className="capitalize">
                      {opp.difficulty === 'easy' ? '🟢 Facile' : opp.difficulty === 'medium' ? '🟡 Moyen' : '🔴 Difficile'}
                    </Badge>
                  )}
                  <Button
                    className="w-full"
                    onClick={() => handleCreateArticle(opp)}
                    disabled={generating === opp.id}
                  >
                    {generating === opp.id ? (
                      <>
                        <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                        Génération...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Créer cet article
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
