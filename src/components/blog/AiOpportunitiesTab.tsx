import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, RefreshCw, MessageCircle, Bot, FileText, HelpCircle, CheckCircle, Target, ListChecks, GitCompare, Quote } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/language";
import { useStore } from "@/contexts/StoreContext";
import { Progress } from "@/components/ui/progress";

// ✅ Interface AIO mise à jour avec direct_answer top-level
interface AiAnswer {
  id: string;
  platform: 'chatgpt' | 'gemini' | 'copilot';
  query_type: 'direct' | 'list' | 'comparison';
  question: string;
  
  // ✅ AIO CORE - ce que l'IA cite
  direct_answer: string;
  answer_confidence: number;
  
  supporting_content: {
    bullets: string[];
    faq: { q: string; a: string }[];
  };
  
  citation_potential: number;
  product_ids: string[];
  keywords: string[];
  difficulty: string;
  status: string;
}

interface AiOpportunitiesTabProps {
  platform: 'chatgpt' | 'gemini' | 'copilot';
  platformName: string;
  platformColor: string;
  platformIcon: React.ComponentType<any>;
  onGenerateArticle: (opportunity: AiAnswer) => void;
}

// Icons for AIO query types
const QUERY_TYPE_ICONS: Record<string, React.ComponentType<any>> = {
  direct: Target,
  list: ListChecks,
  comparison: GitCompare,
};

export function AiOpportunitiesTab({ 
  platform, 
  platformName, 
  platformColor, 
  platformIcon: PlatformIcon,
  onGenerateArticle 
}: AiOpportunitiesTabProps) {
  const { selectedStore } = useStore();
  const { t, tf } = useTranslation();
  const [opportunities, setOpportunities] = useState<AiAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    if (selectedStore?.id) {
      loadOpportunities();
    }
  }, [selectedStore?.id, platform]);

  const loadOpportunities = async (refresh = false) => {
    if (!selectedStore?.id) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('generate-ai-query-opportunities', {
        body: { 
          storeId: selectedStore.id, 
          platform,
          refresh 
        }
      });

      if (error) throw error;

      if (data?.opportunities) {
        setOpportunities(data.opportunities);
        if (refresh) {
          toast.success(tf('blog.dialogs.aiOpportunities.refreshed', { count: data.opportunities.length }));
        }
      }
    } catch (error) {
      console.error('Error loading AI opportunities:', error);
      toast.error(t.toasts.error.generic);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadOpportunities(true);
  };

  const handleGenerateArticle = async (opp: AiAnswer) => {
    setGenerating(opp.id);
    try {
      onGenerateArticle(opp);
      
      // ✅ Update status in ai_answers table
      await supabase
        .from('ai_answers')
        .update({ status: 'treated' })
        .eq('id', opp.id);
      
      // Update local state
      setOpportunities(prev => 
        prev.map(o => o.id === opp.id ? { ...o, status: 'treated' } : o)
      );
    } finally {
      setGenerating(null);
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">🟢 {t.blog.dialogs.opportunities.easy}</Badge>;
      case 'medium':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">🟡 {t.blog.dialogs.opportunities.medium}</Badge>;
      case 'hard':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">🔴 {t.blog.dialogs.opportunities.hard}</Badge>;
      default:
        return null;
    }
  };

  const getQueryTypeLabel = (type: string) => {
    const queryTypes = (t.blog.dialogs.aiOpportunities as any)?.queryTypes || {};
    const labels: Record<string, string> = {
      direct: queryTypes.direct || 'Réponse directe',
      list: queryTypes.list || 'Liste de critères',
      comparison: queryTypes.comparison || 'Comparatif',
    };
    return labels[type] || type;
  };

  if (loading && !refreshing) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="relative">
          <Loader2 className="w-12 h-12 animate-spin" style={{ color: platformColor }} />
        </div>
        <p className="text-muted-foreground">{t.blog.dialogs.aiOpportunities.analyzing}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ backgroundColor: `${platformColor}15` }}>
            <PlatformIcon className="w-6 h-6" style={{ color: platformColor }} />
          </div>
          <div>
            <h3 className="font-semibold">{tf('blog.dialogs.aiOpportunities.titlePlatform', { platform: platformName })}</h3>
            <p className="text-sm text-muted-foreground">
              {t.blog.dialogs.aiOpportunities.description}
            </p>
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {t.common.refresh}
        </Button>
      </div>

      {/* AIO Info Card */}
      <Card className="border-dashed" style={{ borderColor: `${platformColor}40` }}>
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full" style={{ backgroundColor: `${platformColor}15` }}>
              <Quote className="w-5 h-5" style={{ color: platformColor }} />
            </div>
            <div className="space-y-1">
              <p className="font-medium">🎯 AIO = Réponses citables par l'IA</p>
              <p className="text-sm text-muted-foreground">
                Chaque réponse est optimisée pour être citée directement par {platformName}. 
                Format : ≤2 phrases, chiffres concrets, affirmations claires.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Opportunities Grid */}
      {opportunities.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <PlatformIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              {t.blog.dialogs.aiOpportunities.noOpportunities}
            </p>
            <Button onClick={handleRefresh} disabled={refreshing}>
              <Sparkles className="w-4 h-4 mr-2" />
              {t.blog.dialogs.aiOpportunities.generate}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {opportunities.map((opp) => {
            const QueryIcon = QUERY_TYPE_ICONS[opp.query_type] || Target;
            const isTreated = opp.status === 'treated';
            
            return (
              <Card 
                key={opp.id} 
                className={`hover:shadow-lg transition-all ${isTreated ? 'opacity-70' : ''}`}
                style={{ borderColor: isTreated ? undefined : `${platformColor}30` }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <QueryIcon className="w-5 h-5" style={{ color: platformColor }} />
                      <Badge variant="secondary" className="text-xs">
                        {getQueryTypeLabel(opp.query_type)}
                      </Badge>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      {isTreated && (
                        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                          ✓ {t.blog.dialogs.opportunities.treated}
                        </Badge>
                      )}
                      {getDifficultyBadge(opp.difficulty)}
                    </div>
                  </div>
                  
                  <CardTitle className="text-base mt-2">
                    <span className="text-muted-foreground text-sm font-normal">
                      🗣️ Question utilisateur :
                    </span>
                    <br />
                    <span className="italic">"{opp.question}"</span>
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* ✅ DIRECT ANSWER - Ce que l'IA cite */}
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Quote className="w-4 h-4" style={{ color: platformColor }} />
                      <span className="text-xs font-medium" style={{ color: platformColor }}>
                        🎯 Réponse citable par {platformName}
                      </span>
                    </div>
                    <p className="text-sm font-medium leading-relaxed">
                      {opp.direct_answer}
                    </p>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Confiance: {Math.round((opp.answer_confidence || 0.85) * 100)}%
                    </div>
                  </div>

                  {/* Citation Potential */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Potentiel de citation AIO</span>
                      <span className="font-medium" style={{ color: platformColor }}>
                        {opp.citation_potential}%
                      </span>
                    </div>
                    <Progress 
                      value={opp.citation_potential} 
                      className="h-2"
                      style={{ 
                        '--progress-background': platformColor 
                      } as React.CSSProperties}
                    />
                  </div>

                  {/* Keywords */}
                  {opp.keywords && opp.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {opp.keywords.slice(0, 4).map((keyword, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Products Count */}
                  <div className="text-xs text-muted-foreground">
                    📦 {opp.product_ids?.length || 0} produits associés
                  </div>

                  {/* Generate Button */}
                  <Button 
                    onClick={() => handleGenerateArticle(opp)}
                    className="w-full"
                    disabled={generating === opp.id || isTreated}
                    style={{ 
                      backgroundColor: isTreated ? undefined : platformColor,
                      borderColor: platformColor
                    }}
                  >
                    {generating === opp.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Génération en cours...
                      </>
                    ) : isTreated ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Article généré
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Générer article AIO
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
