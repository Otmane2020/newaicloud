import { useState, useEffect, useCallback } from "react";
import { Bot, Brain, Zap, RefreshCw, Sparkles, Check, FileText, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { useTranslation } from "@/lib/language";
import { Progress } from "@/components/ui/progress";

interface AiAnswer {
  id: string;
  question: string;
  direct_answer: string;
  supporting_content?: {
    bullets?: string[];
    faq?: { q: string; a: string }[];
  };
  keywords?: string[];
  difficulty?: string;
  citation_potential: number;
  synced_at?: string | null;
  article_id?: string | null;
  status?: string;
}

interface PlatformConfig {
  icon: React.ElementType;
  color: string;
  bgColor: string;
  label: string;
  description: {
    fr: string;
    en: string;
  };
}

const platformConfigs: Record<string, PlatformConfig> = {
  chatgpt: {
    icon: Bot,
    color: "#10b981",
    bgColor: "bg-emerald-500/10",
    label: "ChatGPT",
    description: {
      fr: "Optimisez vos réponses pour être cité par ChatGPT d'OpenAI",
      en: "Optimize your answers to be cited by OpenAI's ChatGPT"
    }
  },
  gemini: {
    icon: Brain,
    color: "#3b82f6",
    bgColor: "bg-blue-500/10",
    label: "Gemini",
    description: {
      fr: "Optimisez vos réponses pour être cité par Google Gemini",
      en: "Optimize your answers to be cited by Google Gemini"
    }
  },
  copilot: {
    icon: Zap,
    color: "#8b5cf6",
    bgColor: "bg-violet-500/10",
    label: "Copilot",
    description: {
      fr: "Optimisez vos réponses pour être cité par Microsoft Copilot",
      en: "Optimize your answers to be cited by Microsoft Copilot"
    }
  }
};

interface AeoPlatformPageProps {
  platform: 'chatgpt' | 'gemini' | 'copilot';
}

export function AeoPlatformPage({ platform }: AeoPlatformPageProps) {
  const { user } = useAuth();
  const { selectedStore } = useStore();
  const { language } = useTranslation();
  const [answers, setAnswers] = useState<AiAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  
  const config = platformConfigs[platform];
  const Icon = config.icon;

  const fetchAnswers = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const query = supabase
        .from('ai_answers')
        .select('*')
        .eq('user_id', user.id)
        .eq('platform', platform)
        .order('created_at', { ascending: false });

      if (selectedStore?.id) {
        query.eq('store_id', selectedStore.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAnswers((data || []) as AiAnswer[]);
    } catch (error) {
      console.error('Error fetching answers:', error);
      toast.error(language === 'fr' ? 'Erreur lors du chargement' : 'Error loading data');
    } finally {
      setLoading(false);
    }
  }, [user, selectedStore, platform, language]);

  useEffect(() => {
    fetchAnswers();
  }, [fetchAnswers]);

  const syncAnswer = async (answer: AiAnswer): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-aeo-article', {
        body: {
          answer_id: answer.id,
          user_id: user?.id,
          store_id: selectedStore?.id,
          direct_answer: answer.direct_answer,
          question: answer.question,
          supporting_content: answer.supporting_content,
          keywords: answer.keywords,
          platform,
          language: language === 'fr' ? 'fr' : 'en'
        }
      });

      if (error) throw error;

      if (data?.success) {
        // Update local state - mark as synced
        await supabase
          .from('ai_answers')
          .update({ synced_at: new Date().toISOString() })
          .eq('id', answer.id);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error syncing answer:', error);
      return false;
    }
  };

  const handleSyncSingle = async (answer: AiAnswer) => {
    setSyncingIds(prev => new Set(prev).add(answer.id));
    
    const success = await syncAnswer(answer);
    
    if (success) {
      toast.success(language === 'fr' ? 'Article AEO créé !' : 'AEO article created!');
      fetchAnswers(); // Refresh to get updated synced_at
    } else {
      toast.error(language === 'fr' ? 'Erreur lors de la synchronisation' : 'Error during sync');
    }
    
    setSyncingIds(prev => {
      const next = new Set(prev);
      next.delete(answer.id);
      return next;
    });
  };

  const handleSyncAll = async () => {
    const unsyncedAnswers = answers.filter(a => !a.synced_at);
    if (unsyncedAnswers.length === 0) {
      toast.info(language === 'fr' ? 'Toutes les réponses sont déjà synchronisées' : 'All answers are already synced');
      return;
    }

    setSyncing(true);
    setSyncProgress(0);
    
    let successCount = 0;
    
    for (let i = 0; i < unsyncedAnswers.length; i++) {
      const answer = unsyncedAnswers[i];
      const success = await syncAnswer(answer);
      if (success) successCount++;
      setSyncProgress(((i + 1) / unsyncedAnswers.length) * 100);
    }

    setSyncing(false);
    setSyncProgress(0);
    
    toast.success(
      language === 'fr' 
        ? `${successCount}/${unsyncedAnswers.length} articles créés` 
        : `${successCount}/${unsyncedAnswers.length} articles created`
    );
    
    fetchAnswers();
  };

  const getDifficultyBadge = (difficulty?: string) => {
    const colors: Record<string, string> = {
      easy: 'bg-green-100 text-green-700 border-green-200',
      medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      hard: 'bg-red-100 text-red-700 border-red-200'
    };
    const labels: Record<string, { fr: string; en: string }> = {
      easy: { fr: 'Facile', en: 'Easy' },
      medium: { fr: 'Moyen', en: 'Medium' },
      hard: { fr: 'Difficile', en: 'Hard' }
    };
    const d = difficulty || 'medium';
    return (
      <Badge variant="outline" className={colors[d]}>
        {labels[d]?.[language] || d}
      </Badge>
    );
  };

  const unsyncedCount = answers.filter(a => !a.synced_at).length;

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div 
            className={`w-14 h-14 rounded-xl ${config.bgColor} flex items-center justify-center`}
            style={{ boxShadow: `0 4px 14px ${config.color}30` }}
          >
            <Icon className="w-7 h-7" style={{ color: config.color }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{config.label}</h1>
            <p className="text-muted-foreground text-sm">
              {config.description[language]}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={fetchAnswers}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {language === 'fr' ? 'Actualiser' : 'Refresh'}
          </Button>
          
          <Button 
            onClick={handleSyncAll}
            disabled={syncing || unsyncedCount === 0}
            className="gap-2"
            style={{ backgroundColor: config.color }}
          >
            <Sparkles className="w-4 h-4" />
            {syncing 
              ? (language === 'fr' ? 'Synchronisation...' : 'Syncing...') 
              : (language === 'fr' ? `Sync All (${unsyncedCount})` : `Sync All (${unsyncedCount})`)}
          </Button>
        </div>
      </div>

      {/* Sync Progress */}
      {syncing && (
        <Card className="border-2" style={{ borderColor: config.color }}>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <RefreshCw className="w-5 h-5 animate-spin" style={{ color: config.color }} />
              <div className="flex-1">
                <p className="text-sm font-medium mb-2">
                  {language === 'fr' ? 'Création des articles en cours...' : 'Creating articles...'}
                </p>
                <Progress value={syncProgress} className="h-2" />
              </div>
              <span className="text-sm font-bold" style={{ color: config.color }}>
                {Math.round(syncProgress)}%
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Answers List */}
      {answers.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Icon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              {language === 'fr' ? 'Aucune réponse trouvée' : 'No answers found'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {language === 'fr' 
                ? `Utilisez l'assistant AEO pour générer des opportunités ${config.label}`
                : `Use the AEO wizard to generate ${config.label} opportunities`}
            </p>
            <Button variant="outline" onClick={() => window.location.href = '/aeo?tab=wizard'}>
              {language === 'fr' ? "Aller à l'Assistant" : "Go to Wizard"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {answers.map(answer => {
            const isSynced = !!answer.synced_at;
            const isSyncing = syncingIds.has(answer.id);
            
            return (
              <Card 
                key={answer.id} 
                className={`transition-all hover:shadow-md ${isSynced ? 'border-l-4' : ''}`}
                style={{ borderLeftColor: isSynced ? config.color : undefined }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold leading-tight">
                        {answer.question}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        {getDifficultyBadge(answer.difficulty)}
                        <Badge variant="outline" className="text-xs">
                          {answer.citation_potential}% {language === 'fr' ? 'citation' : 'citation'}
                        </Badge>
                        {isSynced && (
                          <Badge className="bg-green-100 text-green-700 border-green-200">
                            <Check className="w-3 h-3 mr-1" />
                            {language === 'fr' ? 'Synchronisé' : 'Synced'}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      size="sm"
                      variant={isSynced ? "outline" : "default"}
                      onClick={() => handleSyncSingle(answer)}
                      disabled={isSyncing}
                      className="shrink-0"
                      style={{ 
                        backgroundColor: isSynced ? undefined : config.color,
                        borderColor: isSynced ? config.color : undefined,
                        color: isSynced ? config.color : undefined
                      }}
                    >
                      {isSyncing ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : isSynced ? (
                        <>
                          <FileText className="w-4 h-4 mr-1" />
                          {language === 'fr' ? 'Re-sync' : 'Re-sync'}
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-1" />
                          {language === 'fr' ? 'Créer article' : 'Create article'}
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div 
                    className="p-4 rounded-lg text-sm"
                    style={{ backgroundColor: `${config.color}10` }}
                  >
                    <p className="font-medium text-xs mb-2 flex items-center gap-1" style={{ color: config.color }}>
                      <Sparkles className="w-3 h-3" />
                      {language === 'fr' ? 'Réponse directe' : 'Direct Answer'}
                    </p>
                    <p className="text-foreground leading-relaxed">
                      {answer.direct_answer}
                    </p>
                  </div>
                  
                  {answer.keywords && answer.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {answer.keywords.slice(0, 5).map((kw, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {kw}
                        </Badge>
                      ))}
                      {answer.keywords.length > 5 && (
                        <Badge variant="secondary" className="text-xs">
                          +{answer.keywords.length - 5}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
