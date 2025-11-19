import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, TrendingUp, FileText, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { useTranslation } from "@/lib/language";
import { useStore } from "@/contexts/StoreContext";
import { ArticleGenerationProgress } from "@/components/blog/ArticleGenerationProgress";

interface Opportunity {
  id: string;
  title: string;
  description: string;
  category: string;
  subCategory?: string;
  productsCount: number;
  type: "comparison" | "guide" | "niche" | "tutorial" | "selection";
  angle?: string;
  targetAudience?: string;
  primaryKeywords: string[];
  secondaryKeywords: string[];
  metaDescription: string;
  estimatedWordCount: number;
  seoScore: number;
  difficulty: "easy" | "medium" | "hard";
  productIds: string[];
  collectionIds?: string[];
}

export function BlogOpportunities() {
  const { selectedStore } = useStore();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showGenerationProgress, setShowGenerationProgress] = useState(false);
  const { limits, canDoAction, refresh: refreshLimits } = useUsageLimits();
  const { t, tf } = useTranslation();

  useEffect(() => {
    const initOpportunities = async () => {
      if (!selectedStore?.id) {
        setOpportunities([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        await loadOpportunities();
      } catch (error) {
        console.error("Error initializing opportunities:", error);
        toast.error(t.blog.dialogs.opportunities.errorLoading);
      }
    };
    initOpportunities();
  }, [selectedStore?.id]);

  const analyzeAndGenerateOpportunities = async (products: any[], userId: string): Promise<Opportunity[]> => {
    try {
      console.log('🧠 Calling generate-blog-opportunities edge function...');
      
      const { data, error } = await supabase.functions.invoke('generate-blog-opportunities', {
        body: { store_id: selectedStore?.id }
      });

      if (error) {
        console.error('❌ Error from edge function:', error);
        throw new Error(tf('blog.dialogs.opportunities.errorApi', { message: error.message || 'Erreur inconnue' }));
      }

      if (!data || !data.opportunities) {
        throw new Error(t.blog.dialogs.opportunities.invalidResponse);
      }

      console.log(`✅ Generated ${data.opportunities.length} opportunities`);
      return data.opportunities;
      
    } catch (error) {
      console.error('❌ Error in analyzeAndGenerateOpportunities:', error);
      throw error;
    }
  };

  const loadOpportunities = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading opportunities...');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // Check cache first (24h expiration)
      let cachedOpportunities: any = null;
      let cacheError: any = null;
      
      if (selectedStore?.id) {
        const result = await supabase
          .from('blog_opportunities')
          .select('*')
          .eq('user_id', user.id)
          .eq('store_id', selectedStore.id)
          .eq('is_cached', true)
          .gt('cache_expires_at', new Date().toISOString())
          .order('created_at', { ascending: false });
        cachedOpportunities = result.data;
        cacheError = result.error;
      } else {
        const result = await supabase
          .from('blog_opportunities')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_cached', true)
          .gt('cache_expires_at', new Date().toISOString())
          .order('created_at', { ascending: false });
        cachedOpportunities = result.data;
        cacheError = result.error;
      }

      if (!cacheError && cachedOpportunities && cachedOpportunities.length > 0) {
        console.log('✅ Using cached opportunities:', cachedOpportunities.length);
        const formattedOps: Opportunity[] = cachedOpportunities.map((opp: any) => ({
          id: opp.id,
          title: opp.article_title,
          description: opp.intro_excerpt || opp.meta_description,
          category: opp.type,
          productsCount: opp.product_ids?.length || 0,
          type: opp.type,
          primaryKeywords: opp.primary_keywords || [],
          secondaryKeywords: opp.secondary_keywords || [],
          metaDescription: opp.meta_description || '',
          estimatedWordCount: opp.estimated_word_count || 2000,
          seoScore: opp.seo_opportunity_score || 0,
          difficulty: opp.difficulty || 'medium',
          productIds: opp.product_ids || [],
        }));
        setOpportunities(formattedOps);
        setLoading(false);
        return;
      }

      console.log('📦 No valid cache, checking database...');
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!selectedStore?.id) {
        setOpportunities([]);
        return;
      }

      const { data: products, error: productsError } = await supabase
        .from('shopify_products')
        .select('id, title, category, product_type, price, vendor')
        .eq('seller_id', authUser?.id)
        .eq('store_id', selectedStore.id);

      if (productsError) {
        console.error('❌ Error fetching products:', productsError);
        throw new Error(tf('blog.dialogs.opportunities.errorDatabase', { message: productsError.message }));
      }

      if (!products || products.length === 0) {
        console.log('⚠️ No products found');
        setOpportunities([]);
        toast.info(t.blog.dialogs.opportunities.noProducts);
        return;
      }

      console.log(`📦 Found ${products.length} products`);
      
      const opportunities = await analyzeAndGenerateOpportunities(products, user.id || '');
      
      // Save with cache enabled (24h expiration)
      const cacheExpiresAt = new Date();
      cacheExpiresAt.setHours(cacheExpiresAt.getHours() + 24);
      
      await supabase
        .from('blog_opportunities')
        .update({
          is_cached: true,
          cache_expires_at: cacheExpiresAt.toISOString(),
          last_refreshed_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
      
      setOpportunities(opportunities);
      toast.success(tf('blog.dialogs.opportunities.detected', { count: opportunities.length }));
      
    } catch (error) {
      console.error('❌ Error loading opportunities:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      toast.error(tf('blog.dialogs.opportunities.errorAnalysis', { message: errorMessage }));
      setOpportunities([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateArticle = async (opp: Opportunity) => {
    if (!selectedStore?.id) {
      toast.error("Aucune boutique sélectionnée");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Utilisateur non authentifié");
      return;
    }

    if (!canDoAction('optimizations')) {
      toast.error('Limite d\'optimisations atteinte');
      setShowUpgradeDialog(true);
      return;
    }

    setGenerating(opp.id);
    setShowGenerationProgress(true);
    
    try {
      toast.info("🚀 Génération automatique de l'article...", {
        description: `Cela peut prendre 1-2 minutes. ${opp.estimatedWordCount} mots.`,
        duration: 5000
      });

      // Auto-select layout based on opportunity type
      const layoutMap: Record<Opportunity['type'], string> = {
        comparison: "magazine",
        guide: "classic",
        niche: "modern",
        tutorial: "classic",
        selection: "magazine"
      };

      // Auto-select color palette based on category/difficulty
      const colorPaletteMap: Record<string, string> = {
        lifestyle: "sunset",
        tech: "ocean",
        fashion: "forest",
        home: "lavender",
        sports: "sunset",
        beauty: "rose"
      };

      // Map editorial angle from opportunity type
      const editorialAngleMap: Record<Opportunity['type'], string> = {
        comparison: "comparison",
        guide: "guide",
        niche: "guide",
        tutorial: "tutorial",
        selection: "selection"
      };

      const layout = layoutMap[opp.type] || "classic";
      const colorPalette = colorPaletteMap[opp.category?.toLowerCase()] || "ocean";
      const editorialAngle = editorialAngleMap[opp.type] || "guide";

      const { data, error } = await supabase.functions.invoke('generate-blog-article', {
        body: {
          user_id: user.id,
          store_id: selectedStore.id,
          category: opp.category,
          keywords: [...opp.primaryKeywords, ...opp.secondaryKeywords],
          title: opp.title,
          articleLength: opp.estimatedWordCount <= 1000 ? "700" : 
                         opp.estimatedWordCount <= 3000 ? "2000" : "4000",
          language: "fr",
          productIds: opp.productIds,
          collectionTitle: opp.collectionIds?.[0] || "",
          // ✨ NEW: Add ArticleWizard-quality parameters
          layout: layout,
          colorPalette: colorPalette,
          editorialAngle: editorialAngle,
          generateFeaturedImage: true,
          opportunityData: {
            opportunityId: opp.id,
            angle: opp.angle,
            targetAudience: opp.targetAudience,
            metaDescription: opp.metaDescription,
            subCategory: opp.subCategory,
            type: opp.type,
            difficulty: opp.difficulty
          }
        }
      });

      if (error) throw error;

      if (data?.success && data?.article?.id) {
        toast.success("✅ Article créé avec succès !", {
          description: `"${opp.title}" est maintenant disponible`,
          duration: 6000
        });

        await refreshLimits();
        await loadOpportunities();
        
        setTimeout(() => {
          window.location.href = `/blog?subtab=articles&articleId=${data.article.id}`;
        }, 1000);
      } else {
        throw new Error("Article ID manquant dans la réponse");
      }
      
    } catch (error) {
      console.error('Error generating article:', error);
      toast.error("Erreur lors de la génération", {
        description: error.message || "Réessayez plus tard"
      });
    } finally {
      setGenerating(null);
      setShowGenerationProgress(false);
    }
  };

  const handleCreateWithWizard = (opp: Opportunity) => {
    const params = new URLSearchParams({
      opportunityId: opp.id,
      title: opp.title,
      category: opp.category,
      subCategory: opp.subCategory || '',
      primaryKeywords: opp.primaryKeywords.join(','),
      secondaryKeywords: opp.secondaryKeywords.join(','),
      metaDescription: opp.metaDescription,
      angle: opp.angle || '',
      targetAudience: opp.targetAudience || '',
      estimatedWordCount: opp.estimatedWordCount.toString(),
      productIds: opp.productIds.join(','),
      collectionIds: (opp.collectionIds || []).join(','),
      difficulty: opp.difficulty,
    });
    
    window.location.href = `/blog?tab=new&${params.toString()}`;
  };

  const handleRegenerate = async () => {
    // Check usage limits first
    if (!canDoAction('optimizations')) {
      toast.error('Limite d\'optimisations atteinte', {
        description: limits.isTrialing 
          ? 'Passez à un plan payant pour générer plus d\'opportunités.'
          : 'Limite mensuelle atteinte. Contactez le support ou attendez le mois prochain.'
      });
      setShowUpgradeDialog(true);
      return;
    }

    setRegenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // Clear cache to force regeneration
      await supabase
        .from('blog_opportunities')
        .update({ is_cached: false, cache_expires_at: null })
        .eq('user_id', user.id);

      toast.info(t.blog.dialogs.opportunities.analyzing, {
        description: t.blog.dialogs.opportunities.patience,
        duration: 5000
      });
      
      await loadOpportunities();
      await refreshLimits(); // Refresh usage limits
    } catch (error) {
      console.error('Error regenerating:', error);
      toast.error('Erreur lors de la régénération');
    } finally {
      setRegenerating(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "comparison":
        return TrendingUp;
      case "guide":
        return FileText;
      case "niche":
        return Lightbulb;
      case "tutorial":
        return FileText;
      case "selection":
        return Sparkles;
      default:
        return Sparkles;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="relative">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <div className="absolute inset-0 w-12 h-12 rounded-full bg-primary/20 animate-ping" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-lg font-medium">{t.common.loading}</p>
          <p className="text-sm text-muted-foreground">{t.modals.pleaseWait}</p>
        </div>
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
              {t.blog.submenu.opportunitiesDesc}
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
                  {t.common.loading}
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  {t.blog.createNew}
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
          <h3 className="text-xl font-semibold">{t.blog.submenu.opportunities}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {opportunities.length} {t.blog.submenu.opportunitiesDesc}
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
              {t.common.loading}
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              {t.blog.createNew}
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
                    <Badge variant={opp.seoScore >= 80 ? "default" : "secondary"}>
                      SEO: {opp.seoScore}/100
                    </Badge>
                    {opp.collectionIds && opp.collectionIds.length > 0 && (
                      <Badge variant="outline">
                        {opp.collectionIds.length} collection{opp.collectionIds.length > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                </div>
                <CardTitle className="text-lg">{opp.title}</CardTitle>
                <CardDescription>{opp.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm">
                    <span className="font-semibold">{t.common.category}:</span> {opp.category}
                    {opp.subCategory && ` > ${opp.subCategory}`}
                  </div>
                  
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
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {opp.type}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {opp.difficulty === 'easy' ? '🟢 Facile' : opp.difficulty === 'medium' ? '🟡 Moyen' : '🔴 Difficile'}
                    </Badge>
                  </div>

                  {opp.primaryKeywords && opp.primaryKeywords.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {opp.primaryKeywords.slice(0, 3).map((keyword: string, idx: number) => (
                        <Badge key={idx} variant="default" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    📝 ~{opp.estimatedWordCount} mots
                  </div>

                  <div className="flex gap-2 w-full">
                    <Button 
                      onClick={() => handleCreateArticle(opp)} 
                      className="flex-1"
                      disabled={generating === opp.id}
                    >
                      {generating === opp.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Génération...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Créer Auto
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleCreateWithWizard(opp)}
                      disabled={generating === opp.id}
                    >
                      Personnaliser
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      <UpgradeDialog 
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        limitType="articles"
      />
      
      <ArticleGenerationProgress 
        open={showGenerationProgress} 
        onClose={() => setShowGenerationProgress(false)} 
      />
    </div>
  );
}
