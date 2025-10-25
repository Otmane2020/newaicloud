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

  useEffect(() => {
    loadOpportunities();
  }, []);

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
            title: `Guide d'achat ${category}`,
            description: `Guide complet pour choisir parmi ${count} produits ${category}`,
            category,
            productsCount: count,
            type: "guide",
          });
        }
      });

      // 2. Guides par type de produit
      productTypeMap.forEach((count, type) => {
        if (count >= 2) {
          opps.push({
            id: `guide-type-${type}`,
            title: `Guide : Comment choisir ${type}`,
            description: `Conseils d'expert pour ${count} ${type}`,
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
            description: `Comparaison détaillée pour vous aider à choisir`,
            category: `${categories[i]} & ${categories[i + 1]}`,
            productsCount: (categoryMap.get(categories[i]) || 0) + (categoryMap.get(categories[i + 1]) || 0),
            type: "comparison",
          });
        }
      }

      // 4. Articles par marque/vendeur
      vendorMap.forEach((count, vendor) => {
        if (count >= 3) {
          opps.push({
            id: `trend-vendor-${vendor}`,
            title: `Collection ${vendor}`,
            description: `Découvrez la gamme ${vendor} - ${count} produits disponibles`,
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

      setOpportunities(opps.slice(0, 8));
    } catch (error) {
      console.error("Error loading opportunities:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateArticle = async (opp: Opportunity) => {
    try {
      setGenerating(opp.id);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data, error } = await supabase.functions.invoke("generate-blog-article", {
        body: {
          user_id: user.id,
          title: opp.title,
          category: opp.category,
          keywords: [opp.category, opp.type],
        },
      });

      if (error) throw error;

      toast.success(`Article "${opp.title}" généré avec succès !`);
      // Recharger la page blog
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

  return (
    <div className="space-y-4">
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
