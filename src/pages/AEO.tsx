import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "@/lib/language";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { Bot, Brain, Zap, Sparkles, RefreshCw, Lightbulb, Plus } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { AeoArticleGenerationDialog } from "@/components/aeo/AeoArticleGenerationDialog";

// ✅ AEO Interface - Direct Answer Top-Level (from ai_answers table)
interface AiAnswer {
  id: string;
  platform: string;
  query_type: string;
  question: string;
  
  // ✅ AEO CORE - Ce que l'IA cite
  direct_answer: string;
  answer_confidence: number | null;
  
  supporting_content: {
    bullets?: string[];
    faq?: { q: string; a: string }[];
  } | null;
  
  citation_potential: number | null;
  keywords: string[] | null;
  difficulty: string | null;
  status: string | null;
  category: string | null;
  created_at: string;
}

interface GeneratedArticle {
  id: string;
  title: string;
  content: string;
  meta_description?: string;
  keywords?: string[];
  shopify_url?: string;
}

const platformConfig = {
  chatgpt: {
    icon: Bot,
    color: "#10b981",
    label: "ChatGPT",
    description: {
      fr: "Questions conversationnelles et comparaisons de produits",
      en: "Conversational questions and product comparisons"
    }
  },
  gemini: {
    icon: Brain,
    color: "#3b82f6",
    label: "Gemini",
    description: {
      fr: "Requêtes factuelles et recherche intégrée Google",
      en: "Factual queries and Google-integrated search"
    }
  },
  copilot: {
    icon: Zap,
    color: "#8b5cf6",
    label: "Copilot",
    description: {
      fr: "Tutoriels pratiques et intégration Bing Shopping",
      en: "Practical tutorials and Bing Shopping integration"
    }
  }
};

export default function AEO() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { language } = useTranslation();
  const { user } = useAuth();
  const { selectedStore } = useStore();
  const [opportunities, setOpportunities] = useState<AiAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Article generation state
  const [generationDialogOpen, setGenerationDialogOpen] = useState(false);
  const [isGeneratingArticle, setIsGeneratingArticle] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStep, setGenerationStep] = useState<string>('analyzing');
  const [generatedArticle, setGeneratedArticle] = useState<GeneratedArticle | null>(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState<AiAnswer | null>(null);

  const currentPlatform = (searchParams.get("platform") || "chatgpt") as keyof typeof platformConfig;

  useEffect(() => {
    if (user?.id && selectedStore?.id) {
      fetchOpportunities();
    }
  }, [user?.id, selectedStore?.id, currentPlatform]);

  const fetchOpportunities = async () => {
    if (!user?.id || !selectedStore?.id) return;
    
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // ✅ Query from ai_answers table (not ai_opportunities)
      const { data, error } = await supabase
        .from("ai_answers")
        .select("*")
        .eq("user_id", user.id)
        .eq("store_id", selectedStore.id)
        .eq("platform", currentPlatform)
        .gte("created_at", `${today}T00:00:00`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setOpportunities(data as AiAnswer[]);
      } else {
        await generateOpportunities();
      }
    } catch (error) {
      console.error("Error fetching opportunities:", error);
      toast.error(language === 'fr' ? "Erreur lors du chargement" : "Error loading opportunities");
    } finally {
      setLoading(false);
    }
  };

  const generateOpportunities = async () => {
    if (!user?.id || !selectedStore?.id) return;
    
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-ai-query-opportunities", {
        body: {
          storeId: selectedStore.id,
          platform: currentPlatform,
          refresh: true
        }
      });

      if (error) throw error;
      
      if (data?.opportunities) {
        // ✅ No frontend limit - backend decides
        setOpportunities(data.opportunities as AiAnswer[]);
        toast.success(language === 'fr' ? "Opportunités générées" : "Opportunities generated");
      }
    } catch (error) {
      console.error("Error generating opportunities:", error);
      toast.error(language === 'fr' ? "Erreur lors de la génération" : "Error generating opportunities");
    } finally {
      setRefreshing(false);
    }
  };

  const handleGenerateArticle = async (opportunity: AiAnswer) => {
    if (!selectedStore?.id) return;
    
    setSelectedOpportunity(opportunity);
    setGeneratedArticle(null);
    setGenerationProgress(0);
    setGenerationStep('analyzing');
    setIsGeneratingArticle(true);
    setGenerationDialogOpen(true);

    try {
      // Simulate progress steps
      const steps = ['analyzing', 'structuring', 'generating', 'optimizing', 'complete'];
      
      for (let i = 0; i < steps.length - 1; i++) {
        setGenerationStep(steps[i]);
        setGenerationProgress((i + 1) * 20);
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      // ✅ Call dedicated AEO article generator (Answer-First)
      const { data, error } = await supabase.functions.invoke("generate-aeo-article", {
        body: {
          answer_id: opportunity.id,
          user_id: user?.id,
          store_id: selectedStore.id,
          direct_answer: opportunity.direct_answer,
          question: opportunity.question,
          supporting_content: opportunity.supporting_content,
          keywords: opportunity.keywords || [],
          platform: opportunity.platform,
          language: language
        }
      });

      if (error) throw error;

      setGenerationStep('complete');
      setGenerationProgress(100);

      if (data?.article) {
        setGeneratedArticle({
          id: data.article.id,
          title: data.article.title,
          content: data.article.content,
          meta_description: data.article.meta_description,
          keywords: data.article.keywords,
          shopify_url: data.article.shopify_url
        });

        // Update local state
        setOpportunities(prev => 
          prev.map(o => o.id === opportunity.id ? { ...o, status: 'treated' } : o)
        );

        toast.success(language === 'fr' ? "Article AEO généré avec succès !" : "AEO article generated successfully!");
      }
    } catch (error) {
      console.error("Error generating article:", error);
      toast.error(language === 'fr' ? "Erreur lors de la génération de l'article" : "Error generating article");
      setGenerationDialogOpen(false);
    } finally {
      setIsGeneratingArticle(false);
    }
  };

  const handleTabChange = (value: string) => {
    setSearchParams({ platform: value });
  };

  const getDifficultyBadge = (difficulty: string | null) => {
    const colors: Record<string, string> = {
      easy: "bg-green-500/10 text-green-600 border-green-500/20",
      medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
      hard: "bg-red-500/10 text-red-600 border-red-500/20"
    };
    const labels: Record<string, Record<string, string>> = {
      easy: { fr: "Facile", en: "Easy" },
      medium: { fr: "Moyen", en: "Medium" },
      hard: { fr: "Difficile", en: "Hard" }
    };
    return (
      <Badge variant="outline" className={colors[difficulty || "medium"]}>
        {labels[difficulty || "medium"]?.[language] || difficulty}
      </Badge>
    );
  };

  const PlatformIcon = platformConfig[currentPlatform]?.icon || Lightbulb;
  const currentColor = platformConfig[currentPlatform]?.color || "#10b981";

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Lightbulb className="h-7 w-7 text-primary" />
            {language === 'fr' ? 'Opportunités AEO' : 'AEO Opportunities'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === 'fr' 
              ? 'Optimisez votre contenu pour être cité par les IA'
              : 'Optimize your content to be cited by AI platforms'}
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            onClick={generateOpportunities} 
            disabled={refreshing || !selectedStore?.id}
            className="flex-1 sm:flex-none"
            style={{ backgroundColor: currentColor }}
          >
            <Plus className={`h-4 w-4 mr-2`} />
            {language === 'fr' ? 'Nouvelles opportunités' : 'New opportunities'}
          </Button>
          <Button 
            onClick={fetchOpportunities} 
            disabled={refreshing || loading || !selectedStore?.id}
            variant="outline"
            size="icon"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing || loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Platform Tabs */}
      <Tabs value={currentPlatform} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-3">
          {Object.entries(platformConfig).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <TabsTrigger key={key} value={key} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{config.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {Object.entries(platformConfig).map(([key, config]) => (
          <TabsContent key={key} value={key} className="space-y-4 mt-4">
            {/* Platform Description */}
            <Card className="border-l-4" style={{ borderLeftColor: config.color }}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div 
                    className="p-1.5 rounded"
                    style={{ backgroundColor: config.color }}
                  >
                    <config.icon className="h-4 w-4 text-white" />
                  </div>
                  {config.label}
                </CardTitle>
                <CardDescription>
                  {config.description[language as 'fr' | 'en']}
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Opportunities List */}
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : opportunities.length > 0 ? (
              <div className="space-y-4">
                {opportunities.map((opp) => {
                  const isTreated = opp.status === 'treated';
                  return (
                    <Card 
                      key={opp.id} 
                      className={`hover:shadow-md transition-shadow ${isTreated ? 'opacity-70' : ''}`}
                      style={{ borderColor: isTreated ? undefined : `${config.color}30` }}
                    >
                      <CardContent className="p-4 space-y-3">
                        {/* Question */}
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">
                            {language === 'fr' ? 'Question type' : 'Typical question'}
                          </p>
                          <p className="font-medium text-lg">"{opp.question}"</p>
                        </div>

                        {/* ✅ Direct Answer - CE QUE L'IA VA CITER (top-level) */}
                        {opp.direct_answer && (
                          <div className="bg-muted/50 p-3 rounded-lg border-l-4" style={{ borderLeftColor: config.color }}>
                            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                              <Sparkles className="h-3 w-3" />
                              {language === 'fr' ? 'Réponse citable par l\'IA' : 'AI-citable answer'}
                            </p>
                            <p className="text-sm font-medium leading-relaxed">
                              "{opp.direct_answer}"
                            </p>
                            
                            {/* ✅ WHY IT WORKS - Education utilisateur */}
                            <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-2">
                              {opp.direct_answer.length <= 150 && (
                                <span className="flex items-center gap-1">✓ {language === 'fr' ? 'Réponse courte' : 'Short answer'}</span>
                              )}
                              {/\d/.test(opp.direct_answer) && (
                                <span className="flex items-center gap-1">✓ {language === 'fr' ? 'Contient des chiffres' : 'Contains numbers'}</span>
                              )}
                              {!opp.direct_answer.toLowerCase().includes('dépend') && !opp.direct_answer.toLowerCase().includes('depends') && (
                                <span className="flex items-center gap-1">✓ {language === 'fr' ? 'Affirmative' : 'Affirmative'}</span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Category badge */}
                        {opp.category && (
                          <Badge variant="outline" className="text-xs capitalize">
                            {opp.category}
                          </Badge>
                        )}

                        {/* Meta info */}
                        <div className="flex flex-wrap items-center gap-2 pt-2">
                          {getDifficultyBadge(opp.difficulty)}
                          
                          {opp.citation_potential && (
                            <Badge variant="secondary">
                              {language === 'fr' ? 'Score citation' : 'Citation score'}: {opp.citation_potential}%
                            </Badge>
                          )}

                          {isTreated && (
                            <Badge className="bg-success hover:bg-success">
                              ✓ {language === 'fr' ? 'Traité' : 'Treated'}
                            </Badge>
                          )}
                        </div>

                        {/* Keywords */}
                        {opp.keywords && opp.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {opp.keywords.slice(0, 4).map((keyword) => (
                              <Badge key={keyword} variant="outline" className="text-xs">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Action Button */}
                        <div className="pt-2">
                          <Button 
                            size="sm" 
                            className="w-full sm:w-auto"
                            onClick={() => handleGenerateArticle(opp)}
                            disabled={isTreated}
                            style={{ backgroundColor: isTreated ? undefined : config.color }}
                          >
                            <Sparkles className="h-4 w-4 mr-2" />
                            {isTreated 
                              ? (language === 'fr' ? 'Article généré' : 'Article generated')
                              : (language === 'fr' ? 'Générer article AEO' : 'Generate AEO article')
                            }
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    {!selectedStore?.id 
                      ? (language === 'fr' ? 'Sélectionnez une boutique pour voir les opportunités' : 'Select a store to see opportunities')
                      : (language === 'fr' ? 'Aucune opportunité générée. Cliquez sur "Nouvelles opportunités".' : 'No opportunities generated. Click "New opportunities".')
                    }
                  </p>
                  {selectedStore?.id && (
                    <Button 
                      onClick={generateOpportunities} 
                      disabled={refreshing}
                      style={{ backgroundColor: config.color }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {language === 'fr' ? 'Générer des opportunités' : 'Generate opportunities'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Article Generation Dialog */}
      <AeoArticleGenerationDialog
        open={generationDialogOpen}
        onClose={() => setGenerationDialogOpen(false)}
        isGenerating={isGeneratingArticle}
        progress={generationProgress}
        currentStep={generationStep}
        generatedArticle={generatedArticle}
        opportunityTitle={selectedOpportunity?.question}
        platformColor={currentColor}
      />
    </div>
  );
}
