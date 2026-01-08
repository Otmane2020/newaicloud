import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Bot, 
  Brain, 
  Zap, 
  Sparkles, 
  RefreshCw, 
  Lightbulb,
  Plus,
  CheckCircle2,
  Calendar,
  CalendarDays
} from "lucide-react";
import { useTranslation } from "@/lib/language";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { toast } from "sonner";
import { AeoArticleGenerationDialog } from "./AeoArticleGenerationDialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface AiAnswer {
  id: string;
  platform: string;
  query_type: string;
  question: string;
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
  scheduled_date: string | null;
}

interface GeneratedArticle {
  id: string;
  title: string;
  content: string;
  meta_description?: string;
  keywords?: string[];
  shopify_url?: string;
}

interface AeoOpportunitiesListProps {
  platform: string;
}

const platformConfig: Record<string, {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  label: string;
  description: { fr: string; en: string };
}> = {
  chatgpt: {
    icon: Bot,
    color: "#10b981",
    label: "ChatGPT",
    description: {
      fr: "Questions conversationnelles et comparaisons",
      en: "Conversational questions and comparisons"
    }
  },
  gemini: {
    icon: Brain,
    color: "#3b82f6",
    label: "Gemini",
    description: {
      fr: "Requêtes factuelles et recherche Google",
      en: "Factual queries and Google search"
    }
  },
  copilot: {
    icon: Zap,
    color: "#8b5cf6",
    label: "Copilot",
    description: {
      fr: "Tutoriels et intégration Bing",
      en: "Tutorials and Bing integration"
    }
  },
  perplexity: {
    icon: Lightbulb,
    color: "#f59e0b",
    label: "Perplexity",
    description: {
      fr: "Recherche approfondie avec sources",
      en: "Deep research with sources"
    }
  },
  claude: {
    icon: Brain,
    color: "#ec4899",
    label: "Claude",
    description: {
      fr: "Analyses détaillées et raisonnement",
      en: "Detailed analysis and reasoning"
    }
  }
};

export function AeoOpportunitiesList({ platform }: AeoOpportunitiesListProps) {
  const { language } = useTranslation();
  const { user } = useAuth();
  const { selectedStore } = useStore();
  
  const [opportunities, setOpportunities] = useState<AiAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating30Days, setGenerating30Days] = useState(false);
  
  // Article generation state
  const [generationDialogOpen, setGenerationDialogOpen] = useState(false);
  const [isGeneratingArticle, setIsGeneratingArticle] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStep, setGenerationStep] = useState<string>('analyzing');
  const [generatedArticle, setGeneratedArticle] = useState<GeneratedArticle | null>(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState<AiAnswer | null>(null);

  const config = platformConfig[platform] || platformConfig.chatgpt;

  useEffect(() => {
    if (user?.id && selectedStore?.id) {
      fetchOpportunities();
    }
  }, [user?.id, selectedStore?.id, platform]);

  const fetchOpportunities = async () => {
    if (!user?.id || !selectedStore?.id) return;
    
    setLoading(true);
    try {
      // Fetch ALL opportunities, ordered by scheduled_date
      const { data, error } = await supabase
        .from("ai_answers")
        .select("*")
        .eq("user_id", user.id)
        .eq("store_id", selectedStore.id)
        .eq("platform", platform)
        .order("scheduled_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      setOpportunities((data || []) as AiAnswer[]);
    } catch (error) {
      console.error("Error fetching opportunities:", error);
      toast.error(language === 'fr' ? "Erreur lors du chargement" : "Error loading opportunities");
    } finally {
      setLoading(false);
    }
  };

  const generate30DaysOpportunities = async () => {
    if (!user?.id || !selectedStore?.id) return;
    
    setGenerating30Days(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-30-days-aeo", {
        body: {
          storeId: selectedStore.id,
          language: language
        }
      });

      if (error) throw error;
      
      if (data?.success) {
        toast.success(
          language === 'fr' 
            ? `${data.opportunities_created} opportunités générées pour 30 jours!` 
            : `${data.opportunities_created} opportunities generated for 30 days!`
        );
        await fetchOpportunities();
      }
    } catch (error) {
      console.error("Error generating 30 days opportunities:", error);
      toast.error(language === 'fr' ? "Erreur lors de la génération" : "Error generating opportunities");
    } finally {
      setGenerating30Days(false);
    }
  };

  const generateOpportunities = async () => {
    if (!user?.id || !selectedStore?.id) return;
    
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-ai-query-opportunities", {
        body: {
          storeId: selectedStore.id,
          platform: platform,
          refresh: true
        }
      });

      if (error) throw error;
      
      if (data?.opportunities) {
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
      const steps = ['analyzing', 'structuring', 'generating', 'optimizing', 'complete'];
      
      for (let i = 0; i < steps.length - 1; i++) {
        setGenerationStep(steps[i]);
        setGenerationProgress((i + 1) * 20);
        await new Promise(resolve => setTimeout(resolve, 800));
      }

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

        setOpportunities(prev => 
          prev.map(o => o.id === opportunity.id ? { ...o, status: 'treated' } : o)
        );

        toast.success(language === 'fr' ? "Article AEO généré !" : "AEO article generated!");
      }
    } catch (error) {
      console.error("Error generating article:", error);
      toast.error(language === 'fr' ? "Erreur lors de la génération" : "Error generating article");
      setGenerationDialogOpen(false);
    } finally {
      setIsGeneratingArticle(false);
    }
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

  const PlatformIcon = config.icon;

  if (loading) {
    return (
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
    );
  }

  return (
    <div className="space-y-4">
      {/* Platform Header */}
      <Card className="border-l-4" style={{ borderLeftColor: config.color }}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div 
                className="p-1.5 rounded"
                style={{ backgroundColor: config.color }}
              >
                <PlatformIcon className="h-4 w-4 text-white" />
              </div>
              {config.label}
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                onClick={generate30DaysOpportunities} 
                disabled={generating30Days || refreshing}
                size="sm"
                variant="default"
                className="bg-gradient-to-r from-primary to-primary/80"
              >
                <CalendarDays className={`h-4 w-4 mr-1 ${generating30Days ? 'animate-pulse' : ''}`} />
                {generating30Days 
                  ? (language === 'fr' ? 'Génération...' : 'Generating...')
                  : (language === 'fr' ? '30 jours' : '30 days')
                }
              </Button>
              <Button 
                onClick={generateOpportunities} 
                disabled={refreshing || generating30Days}
                size="sm"
                style={{ backgroundColor: config.color }}
              >
                <Plus className="h-4 w-4 mr-1" />
                {language === 'fr' ? 'Nouvelles' : 'New'}
              </Button>
              <Button 
                onClick={fetchOpportunities} 
                disabled={refreshing || loading}
                variant="outline"
                size="icon"
                className="h-8 w-8"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          <CardDescription>
            {config.description[language as 'fr' | 'en']}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Opportunities List */}
      {opportunities.length > 0 ? (
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
                  {/* Scheduled Date */}
                  {opp.scheduled_date && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(opp.scheduled_date), 
                        language === 'fr' ? "d MMMM yyyy" : "MMMM d, yyyy", 
                        { locale: language === 'fr' ? fr : undefined }
                      )}
                    </div>
                  )}

                  {/* Question */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {language === 'fr' ? 'Question type' : 'Typical question'}
                    </p>
                    <p className="font-medium text-lg">"{opp.question}"</p>
                  </div>

                  {/* Direct Answer */}
                  {opp.direct_answer && (
                    <div className="bg-muted/50 p-3 rounded-lg border-l-4" style={{ borderLeftColor: config.color }}>
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        {language === 'fr' ? 'Réponse citable' : 'Citable answer'}
                      </p>
                      <p className="text-sm font-medium leading-relaxed">
                        "{opp.direct_answer}"
                      </p>
                    </div>
                  )}

                  {/* Meta info */}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    {getDifficultyBadge(opp.difficulty)}
                    
                    {opp.citation_potential && (
                      <Badge variant="secondary">
                        {language === 'fr' ? 'Score' : 'Score'}: {opp.citation_potential}%
                      </Badge>
                    )}

                    {isTreated && (
                      <Badge className="bg-green-500 hover:bg-green-500">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {language === 'fr' ? 'Traité' : 'Treated'}
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
                ? (language === 'fr' ? 'Sélectionnez une boutique' : 'Select a store')
                : (language === 'fr' ? 'Aucune opportunité trouvée' : 'No opportunities found')
              }
            </p>
            {selectedStore?.id && (
              <Button onClick={generateOpportunities} disabled={refreshing}>
                <Plus className="h-4 w-4 mr-2" />
                {language === 'fr' ? 'Générer des opportunités' : 'Generate opportunities'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Article Generation Dialog */}
      <AeoArticleGenerationDialog
        open={generationDialogOpen}
        onClose={() => setGenerationDialogOpen(false)}
        isGenerating={isGeneratingArticle}
        progress={generationProgress}
        currentStep={generationStep}
        generatedArticle={generatedArticle}
        opportunityTitle={selectedOpportunity?.question}
        platformColor={config.color}
      />
    </div>
  );
}
