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
  type: "comparison" | "guide" | "trend";
}

export function BlogOpportunities() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    loadOpportunities();
  }, []);

  const generateOptimizedTitles = async (opportunities: Opportunity[], userId: string, products: any[]) => {
    try {
      const enrichedOpportunities = opportunities.map(opp => {
        let relevantProducts: any[] = [];
        
        if (opp.type === 'guide' && opp.category) {
          relevantProducts = products.filter(p => 
            p.category === opp.category || p.product_type === opp.category
          ).slice(0, 3);
        } else if (opp.type === 'trend' && opp.category) {
          relevantProducts = products.filter(p => p.vendor === opp.category).slice(0, 3);
        } else if (opp.type === 'comparison') {
          const categories = opp.category.split(' & ');
          relevantProducts = [
            ...products.filter(p => p.category === categories[0]).slice(0, 2),
            ...products.filter(p => p.category === categories[1]).slice(0, 2)
          ];
        }
        
        return {
          ...opp,
          productExamples: relevantProducts.map(p => p.title).join(', ')
        };
      });

      const prompt = `Tu es un expert SEO e-commerce spécialisé en meubles et décoration d'intérieur.

Génère des titres d'articles de blog PRATIQUES et INSPIRANTS axés sur l'AMÉNAGEMENT et la DÉCORATION.

❌ INTERDICTIONS ABSOLUES:
• Pas de titres génériques type "Collection X"
• Pas de simple liste de produits
• Pas de titres ennuyeux

✅ OBJECTIF:
• Conseils pratiques d'aménagement
• Inspiration décoration
• Guides d'utilisation et astuces
• Solutions à des problèmes concrets

RÈGLES:
• 50-65 caractères max
• Accrocheur et inspirant
• Mots-clés SEO naturels
• Chaque titre UNIQUE et ORIGINAL
• Focus sur la VALEUR pour le lecteur

OPPORTUNITÉS À TRANSFORMER:
${enrichedOpportunities.map((opp, i) => {
  const typeLabel = opp.type === 'guide' ? '🏠 GUIDE AMÉNAGEMENT' : 
                    opp.type === 'comparison' ? '⚖️ COMPARATIF' : 
                    '✨ INSPIRATION DÉCO';
  return `${i + 1}. ${typeLabel}
   • Sujet: ${opp.category}
   • ${opp.productsCount} options disponibles
   • Ex produits: ${opp.productExamples || 'Divers'}`;
}).join('\n\n')}

FORMAT JSON EXACT (${opportunities.length} titres):
["Titre 1", "Titre 2", "Titre 3", ...]

EXEMPLES INSPIRANTS:
✓ "Canapé en L : 7 Astuces pour Optimiser Votre Salon"
✓ "Aménager un Petit Espace avec une Table Gain de Place"
✓ "Chaise de Bureau Ergonomique : Le Guide 2024"
✓ "Style Scandinave : Comment Créer un Intérieur Cosy"
✓ "Comparatif : Table Ronde ou Rectangulaire ?"

Génère ${opportunities.length} titres EXCEPTIONNELS orientés AMÉNAGEMENT:`;

      const { data } = await supabase.functions.invoke("chat-smart", {
        body: { 
          userMessage: prompt,
          sellerId: userId,
          useDeepseek: true
        }
      });

      if (data?.content) {
        try {
          // Extraire le JSON de la réponse
          const jsonMatch = data.content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const titles = JSON.parse(jsonMatch[0]);
            if (Array.isArray(titles) && titles.length === opportunities.length) {
              return titles;
            }
          }
        } catch (e) {
          console.error("Failed to parse AI titles:", e);
        }
      }
    } catch (error) {
      console.error("Error generating titles:", error);
    }
    return null;
  };

  const loadOpportunities = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Récupérer les produits avec description pour analyser
      const { data: products } = await supabase
        .from("shopify_products")
        .select("title, description, category, tags, product_type, vendor")
        .eq("seller_id", user.id);

      if (!products || products.length === 0) return;

      const opps: Opportunity[] = [];
      const categoryMap = new Map<string, number>();
      const productTypeMap = new Map<string, number>();
      const vendorMap = new Map<string, number>();

      // Analyser catégories, types et vendeurs
      products.forEach((p) => {
        if (p.category) {
          categoryMap.set(p.category, (categoryMap.get(p.category) || 0) + 1);
        }
        if (p.product_type) {
          productTypeMap.set(p.product_type, (productTypeMap.get(p.product_type) || 0) + 1);
        }
        if (p.vendor) {
          vendorMap.set(p.vendor, (vendorMap.get(p.vendor) || 0) + 1);
        }
      });

      // 1. Guides par catégorie (minimum 2 produits)
      categoryMap.forEach((count, category) => {
        if (count >= 2) {
          opps.push({
            id: `guide-category-${category}`,
            title: `Comment bien choisir ${category}`,
            description: `Guide complet pour aménager avec ${count} ${category}`,
            category,
            productsCount: count,
            type: "guide",
          });
        }
      });

      // 2. Guides d'aménagement par type
      productTypeMap.forEach((count, type) => {
        if (count >= 3) {
          opps.push({
            id: `deco-type-${type}`,
            title: `Aménager avec ${type}`,
            description: `Conseils déco et idées d'aménagement avec ${count} ${type}`,
            category: type,
            productsCount: count,
            type: "guide",
          });
        }
      });

      // 3. Comparatifs entre catégories
      const categories = Array.from(categoryMap.keys());
      if (categories.length >= 2) {
        for (let i = 0; i < Math.min(2, categories.length - 1); i++) {
          opps.push({
            id: `comparison-${categories[i]}-${categories[i + 1]}`,
            title: `${categories[i]} vs ${categories[i + 1]}`,
            description: `Comparatif pour bien choisir entre ces options`,
            category: `${categories[i]} & ${categories[i + 1]}`,
            productsCount: (categoryMap.get(categories[i]) || 0) + (categoryMap.get(categories[i + 1]) || 0),
            type: "comparison",
          });
        }
      }

      // 4. Guides d'aménagement par style/marque (top marques uniquement)
      const topVendors = Array.from(vendorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
      
      topVendors.forEach(([vendor, count]) => {
        if (count >= 5) {
          opps.push({
            id: `style-vendor-${vendor}`,
            title: `Style ${vendor}`,
            description: `Créer un intérieur harmonieux avec ${vendor} - ${count} produits`,
            category: vendor,
            productsCount: count,
            type: "trend",
          });
        }
      });

      // 5. Article général si on a assez de produits
      if (products.length >= 5) {
        opps.push({
          id: "guide-general",
          title: "Guide complet de nos produits",
          description: `Découvrez tous nos ${products.length} produits et trouvez celui qui vous convient`,
          category: "Tous produits",
          productsCount: products.length,
          type: "guide",
        });
      }

      const selectedOpps = opps.slice(0, 20);

      // Générer des titres optimisés avec DeepSeek
      toast.info("Optimisation des titres avec IA...");
      const optimizedTitles = await generateOptimizedTitles(selectedOpps, user.id, products);

      if (optimizedTitles) {
        selectedOpps.forEach((opp, i) => {
          if (optimizedTitles[i]) {
            opp.title = optimizedTitles[i];
          }
        });
      }

      setOpportunities(selectedOpps);
    } catch (error) {
      console.error("Error loading opportunities:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateArticle = async (opp: Opportunity) => {
    try {
      setGenerating(opp.id);
      toast.info("Génération du titre avec DeepSeek...");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      // Générer un titre optimisé avec DeepSeek
      const titlePrompt = `Génère un titre d'article de blog SEO optimisé et accrocheur pour une boutique e-commerce.
Catégorie: ${opp.category}
Type: ${opp.type}
Produits: ${opp.productsCount}
Réponds uniquement avec le titre, sans guillemets ni ponctuation finale.`;

      const { data: deepseekData } = await supabase.functions.invoke("chat-smart", {
        body: { 
          userMessage: titlePrompt,
          sellerId: user.id,
          useDeepseek: true
        }
      });

      const optimizedTitle = deepseekData?.content?.trim() || opp.title;
      toast.info("Génération de l'article...");

      const { data, error } = await supabase.functions.invoke("generate-blog-article", {
        body: {
          user_id: user.id,
          title: optimizedTitle,
          category: opp.category,
          keywords: [opp.category, opp.type],
        },
      });

      if (error) throw error;

      toast.success(`Article "${optimizedTitle}" généré avec succès !`);
      window.location.href = "/blog?tab=articles";
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la génération de l'article");
    } finally {
      setGenerating(null);
    }
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
      <Card>
        <CardContent className="py-12 text-center">
          <Lightbulb className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            Aucune opportunité détectée. Importez plus de produits pour voir des suggestions.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleRegenerate = async () => {
    setRegenerating(true);
    await loadOpportunities();
    setRegenerating(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">
          {opportunities.length} opportunités détectées
        </p>
        <Button
          onClick={handleRegenerate}
          disabled={regenerating}
          variant="outline"
        >
          {regenerating ? (
            <>
              <Sparkles className="w-4 h-4 mr-2 animate-spin" />
              Régénération...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Nouvelles opportunités
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
                <div className="flex items-start justify-between">
                  <Icon className="w-8 h-8 text-primary mb-2" />
                  <Badge variant="outline">
                    {opp.productsCount} produit{opp.productsCount > 1 ? "s" : ""}
                  </Badge>
                </div>
                <CardTitle className="text-lg">{opp.title}</CardTitle>
                <CardDescription>{opp.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    Catégorie: {opp.category}
                  </div>
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
