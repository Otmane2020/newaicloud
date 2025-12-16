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
import { Bot, Brain, Zap, Sparkles, RefreshCw, ExternalLink, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface AiOpportunity {
  id: string;
  platform: string;
  query_type: string;
  question: string;
  suggested_title: string | null;
  suggested_structure: any;
  citation_potential: number | null;
  keywords: string[] | null;
  difficulty: string | null;
  status: string | null;
  created_at: string;
}

const platformConfig = {
  chatgpt: {
    icon: Bot,
    color: "bg-emerald-500",
    label: "ChatGPT",
    description: {
      fr: "Questions conversationnelles et comparaisons de produits",
      en: "Conversational questions and product comparisons"
    }
  },
  gemini: {
    icon: Brain,
    color: "bg-blue-500",
    label: "Gemini",
    description: {
      fr: "Requêtes factuelles et recherche intégrée Google",
      en: "Factual queries and Google-integrated search"
    }
  },
  copilot: {
    icon: Zap,
    color: "bg-purple-500",
    label: "Copilot",
    description: {
      fr: "Tutoriels pratiques et intégration Bing Shopping",
      en: "Practical tutorials and Bing Shopping integration"
    }
  }
};

export default function AEO() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { language, t } = useTranslation();
  const { user } = useAuth();
  const { selectedStore } = useStore();
  const [opportunities, setOpportunities] = useState<AiOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      // Fetch cached opportunities for current platform (max 3 per day)
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from("ai_opportunities")
        .select("*")
        .eq("user_id", user.id)
        .eq("store_id", selectedStore.id)
        .eq("platform", currentPlatform)
        .gte("created_at", `${today}T00:00:00`)
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) throw error;

      if (data && data.length > 0) {
        setOpportunities(data);
      } else {
        // Generate new opportunities if none exist for today
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
        setOpportunities(data.opportunities.slice(0, 3));
        toast.success(language === 'fr' ? "Opportunités générées" : "Opportunities generated");
      }
    } catch (error) {
      console.error("Error generating opportunities:", error);
      toast.error(language === 'fr' ? "Erreur lors de la génération" : "Error generating opportunities");
    } finally {
      setRefreshing(false);
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
        <Button 
          onClick={generateOpportunities} 
          disabled={refreshing || !selectedStore?.id}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {language === 'fr' ? 'Actualiser' : 'Refresh'}
        </Button>
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
            <Card className="border-l-4" style={{ borderLeftColor: config.color.replace('bg-', '') }}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <config.icon className={`h-5 w-5 ${config.color} text-white p-1 rounded`} />
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
                {opportunities.map((opp) => (
                  <Card key={opp.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 space-y-3">
                      {/* Question */}
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {language === 'fr' ? 'Question type' : 'Typical question'}
                        </p>
                        <p className="font-medium text-lg">"{opp.question}"</p>
                      </div>

                      {/* Suggested Title */}
                      {opp.suggested_title && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">
                            {language === 'fr' ? 'Titre suggéré' : 'Suggested title'}
                          </p>
                          <p className="font-semibold text-primary">{opp.suggested_title}</p>
                        </div>
                      )}

                      {/* Meta info */}
                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        {getDifficultyBadge(opp.difficulty)}
                        
                        {opp.citation_potential && (
                          <Badge variant="secondary">
                            {language === 'fr' ? 'Potentiel citation' : 'Citation potential'}: {opp.citation_potential}%
                          </Badge>
                        )}

                        {opp.keywords?.slice(0, 3).map((keyword) => (
                          <Badge key={keyword} variant="outline" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>

                      {/* Action Button */}
                      <div className="pt-2">
                        <Button size="sm" className="w-full sm:w-auto">
                          <Sparkles className="h-4 w-4 mr-2" />
                          {language === 'fr' ? 'Générer article AEO' : 'Generate AEO article'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {!selectedStore?.id 
                      ? (language === 'fr' ? 'Sélectionnez une boutique pour voir les opportunités' : 'Select a store to see opportunities')
                      : (language === 'fr' ? 'Aucune opportunité générée. Cliquez sur Actualiser.' : 'No opportunities generated. Click Refresh.')
                    }
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
