import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, RefreshCw, MessageCircle, Bot, FileText, HelpCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/language";
import { useStore } from "@/contexts/StoreContext";
import { Progress } from "@/components/ui/progress";

interface AiOpportunity {
  id: string;
  platform: 'chatgpt' | 'gemini' | 'copilot';
  query_type: string;
  question: string;
  suggested_title: string;
  suggested_structure: any;
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
  onGenerateArticle: (opportunity: AiOpportunity) => void;
}

const QUERY_TYPE_ICONS: Record<string, React.ComponentType<any>> = {
  comparison: FileText,
  recommendation: Sparkles,
  guide: FileText,
  howto: HelpCircle,
  faq: HelpCircle,
  review: MessageCircle,
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
  const [opportunities, setOpportunities] = useState<AiOpportunity[]>([]);
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
          store_id: selectedStore.id, 
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

  const handleGenerateArticle = async (opp: AiOpportunity) => {
    setGenerating(opp.id);
    try {
      onGenerateArticle(opp);
      
      // Mark as treated
      await supabase
        .from('ai_opportunities')
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
    const labels: Record<string, string> = {
      comparison: t.blog.dialogs.aiOpportunities.queryTypes.comparison,
      recommendation: t.blog.dialogs.aiOpportunities.queryTypes.recommendation,
      guide: t.blog.dialogs.aiOpportunities.queryTypes.guide,
      howto: t.blog.dialogs.aiOpportunities.queryTypes.howto,
      faq: t.blog.dialogs.aiOpportunities.queryTypes.faq,
      review: t.blog.dialogs.aiOpportunities.queryTypes.review,
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

      {/* Info Card */}
      <Card className="border-dashed" style={{ borderColor: `${platformColor}40` }}>
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full" style={{ backgroundColor: `${platformColor}15` }}>
              <Sparkles className="w-5 h-5" style={{ color: platformColor }} />
            </div>
            <div className="space-y-1">
              <p className="font-medium">{t.blog.dialogs.aiOpportunities.aeoTitle}</p>
              <p className="text-sm text-muted-foreground">
                {tf('blog.dialogs.aiOpportunities.aeoDescription', { platform: platformName })}
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
            const QueryIcon = QUERY_TYPE_ICONS[opp.query_type] || FileText;
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
                      {t.blog.dialogs.aiOpportunities.userAsks}
                    </span>
                    <br />
                    "{opp.question}"
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Suggested Title */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {t.blog.dialogs.aiOpportunities.suggestedTitle}
                    </p>
                    <p className="text-sm font-medium">{opp.suggested_title}</p>
                  </div>

                  {/* Citation Potential */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{t.blog.dialogs.aiOpportunities.citationPotential}</span>
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
                    📦 {opp.product_ids?.length || 0} {t.blog.dialogs.opportunities.products}
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
                        {t.blog.dialogs.opportunities.generatingBtn}
                      </>
                    ) : isTreated ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        {t.blog.dialogs.opportunities.treated}
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        {t.blog.dialogs.aiOpportunities.generateAeoArticle}
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
