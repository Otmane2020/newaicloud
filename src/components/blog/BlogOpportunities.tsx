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

  const analyzeAndGenerateOpportunities = async (products: any[], userId: string): Promise<Opportunity[]> => {
    try {
      console.log('🧠 Analyzing product catalog for opportunities...');
      
      // Group products by category
      const categoryMap = new Map<string, number>();
      const priceRanges = { low: 0, medium: 0, high: 0 };
      let totalProducts = products.length;
      
      products.forEach(product => {
        const category = product.category || product.product_type || 'Général';
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
        
        const price = parseFloat(product.price) || 0;
        if (price < 50) priceRanges.low++;
        else if (price < 200) priceRanges.medium++;
        else priceRanges.high++;
      });

      // Build a shorter, optimized prompt
      const categories = Array.from(categoryMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      
      const prompt = `Analyse ce catalogue e-commerce et génère 6-8 opportunités d'articles de blog SEO.

📊 STATISTIQUES DU CATALOGUE :
- Total produits : ${totalProducts}
- Prix bas (<50€) : ${priceRanges.low}
- Prix moyen (50-200€) : ${priceRanges.medium}  
- Prix haut (>200€) : ${priceRanges.high}

📁 CATÉGORIES PRINCIPALES :
${categories.map(([cat, count]) => `- ${cat} : ${count} produits`).join('\n')}

🎯 TYPES D'ARTICLES DEMANDÉS :
1. Guides d'achat comparatifs
2. Tutoriels pratiques
3. Sélections thématiques
4. Conseils d'experts
5. Tendances du marché

📝 FORMAT ATTENDU (JSON strict) :
{
  "opportunities": [
    {
      "title": "Guide d'achat : Comment choisir...",
      "description": "Description captivante de 2-3 phrases",
      "category": "${categories[0]?.[0] || 'Général'}",
      "type": "guide",
      "keywords": ["mot-clé 1", "mot-clé 2", "mot-clé 3"],
      "seoScore": 85,
      "difficulty": "medium"
    }
  ]
}

⚠️ RÈGLES STRICTES :
- Retourner UNIQUEMENT du JSON valide
- Minimum 6 opportunités, maximum 8
- Titres accrocheurs avec mots-clés SEO
- Descriptions courtes et percutantes
- Keywords pertinents pour chaque article`;

      console.log('📤 Sending request to AI (timeout: 30s)...');
      
      // Create abort controller for timeout
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 30000); // 30 second timeout
      
      try {
        const { data, error } = await supabase.functions.invoke('chat-smart', {
          body: {
            userMessage: prompt,
            conversationHistory: []
          }
        });

        clearTimeout(timeoutId);

        if (error) {
          console.error('❌ Error from chat-smart:', error);
          throw new Error(`Erreur API: ${error.message || 'Erreur inconnue'}`);
        }

        if (!data || !data.response) {
          throw new Error('Réponse vide de l\'API');
        }

        console.log('✅ Received response from AI');
        console.log('📄 Response preview:', data.response.substring(0, 200));
        
        // Parse response
        let responseText = data.response;
        
        // Clean up response
        if (responseText.includes('```json')) {
          responseText = responseText.split('```json')[1].split('```')[0];
        } else if (responseText.includes('```')) {
          responseText = responseText.split('```')[1].split('```')[0];
        }
        
        const parsed = JSON.parse(responseText.trim());
        
        if (!parsed.opportunities || !Array.isArray(parsed.opportunities)) {
          throw new Error('Format de réponse invalide: propriété "opportunities" manquante');
        }

        if (parsed.opportunities.length === 0) {
          throw new Error('Aucune opportunité générée');
        }

        console.log(`✅ Generated ${parsed.opportunities.length} opportunities`);
        return parsed.opportunities;
        
      } catch (apiError: any) {
        clearTimeout(timeoutId);
        if (apiError.name === 'AbortError') {
          throw new Error('Timeout: L\'analyse a pris trop de temps (>30s)');
        }
        throw apiError;
      }
      
    } catch (error) {
      console.error('❌ Error in analyzeAndGenerateOpportunities:', error);
      console.error('📋 Error details:', {
        name: (error as Error).name,
        message: (error as Error).message,
        stack: (error as Error).stack
      });
      throw error;
    }
  };

  const loadOpportunities = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading opportunities...');
      const { data: { user: authUser } } = await supabase.auth.getUser();

      const { data: products, error: productsError } = await supabase
        .from('shopify_products')
        .select('id, title, category, product_type, price, vendor')
        .eq('seller_id', authUser?.id);

      if (productsError) {
        console.error('❌ Error fetching products:', productsError);
        throw new Error(`Erreur base de données: ${productsError.message}`);
      }

      if (!products || products.length === 0) {
        console.log('⚠️ No products found');
        setOpportunities([]);
        toast.info('Aucun produit trouvé. Importez des produits pour générer des opportunités.');
        return;
      }

      console.log(`📦 Found ${products.length} products`);
      
      const opportunities = await analyzeAndGenerateOpportunities(products, authUser?.id || '');
      setOpportunities(opportunities);
      toast.success(`✅ ${opportunities.length} opportunités détectées`);
      
    } catch (error) {
      console.error('❌ Error loading opportunities:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      toast.error(`Erreur lors de l'analyse du catalogue: ${errorMessage}`);
      setOpportunities([]);
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
