import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  FileText, 
  TrendingUp, 
  Eye, 
  Sparkles,
  RefreshCw,
  Plus,
  BarChart3,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface KeywordOpportunity {
  query: string;
  currentPosition: number;
  impressions: number;
  clicks: number;
  ctr: number;
  potential: 'high' | 'medium' | 'low';
  suggestedTopic: string;
  relatedProducts?: string[];
  relatedCollections?: string[];
}

interface TrackedKeyword {
  id: string;
  keyword: string;
  created_at: string;
  initial_position: number;
  current_position: number;
  history: Array<{
    date: string;
    position: number;
    clicks: number;
    impressions: number;
  }>;
}

interface GSCArticleOpportunitiesProps {
  selectedDomain: string;
  topQueries: Array<{
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
}

export function GSCArticleOpportunities({ 
  selectedDomain, 
  topQueries 
}: GSCArticleOpportunitiesProps) {
  const [opportunities, setOpportunities] = useState<KeywordOpportunity[]>([]);
  const [trackedKeywords, setTrackedKeywords] = useState<TrackedKeyword[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedKeyword, setSelectedKeyword] = useState<TrackedKeyword | null>(null);

  useEffect(() => {
    if (selectedDomain) {
      loadTrackedKeywords();
    }
  }, [selectedDomain]);

  useEffect(() => {
    if (topQueries.length > 0) {
      analyzeOpportunities();
    }
  }, [topQueries]);

  const analyzeOpportunities = () => {
    // Analyser les requêtes pour trouver des opportunités
    const analyzed = topQueries
      .filter(q => q.position > 10 && q.impressions > 100) // Requêtes avec du potentiel
      .map(q => {
        let potential: 'high' | 'medium' | 'low' = 'low';
        
        // Calcul du potentiel basé sur position et impressions
        if (q.position <= 20 && q.impressions > 500) {
          potential = 'high';
        } else if (q.position <= 30 && q.impressions > 200) {
          potential = 'medium';
        }

        // Générer un sujet d'article suggéré
        const suggestedTopic = generateArticleTopic(q.query);

        return {
          query: q.query,
          currentPosition: q.position,
          impressions: q.impressions,
          clicks: q.clicks,
          ctr: q.ctr,
          potential,
          suggestedTopic,
        };
      })
      .sort((a, b) => {
        // Trier par potentiel puis par impressions
        const potentialOrder = { high: 3, medium: 2, low: 1 };
        if (potentialOrder[a.potential] !== potentialOrder[b.potential]) {
          return potentialOrder[b.potential] - potentialOrder[a.potential];
        }
        return b.impressions - a.impressions;
      })
      .slice(0, 10);

    setOpportunities(analyzed);
  };

  const generateArticleTopic = (query: string): string => {
    // Générer un titre d'article basé sur la requête
    const templates = [
      `Guide complet : ${query}`,
      `Tout savoir sur ${query}`,
      `Comment choisir ${query}`,
      `Les meilleurs ${query}`,
      `${query} : Guide d'achat`,
    ];
    
    return templates[Math.floor(Math.random() * templates.length)];
  };

  const loadTrackedKeywords = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('gsc_keyword_tracking')
        .select('*')
        .eq('user_id', user.id)
        .eq('domain', selectedDomain)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Charger l'historique pour chaque keyword
      const keywordsWithHistory = await Promise.all(
        (data || []).map(async (kw) => {
          const { data: history } = await supabase
            .from('gsc_keyword_history')
            .select('*')
            .eq('tracking_id', kw.id)
            .order('date', { ascending: true });

          return {
            ...kw,
            history: history || [],
          };
        })
      );

      setTrackedKeywords(keywordsWithHistory);
    } catch (error) {
      console.error('Error loading tracked keywords:', error);
    } finally {
      setLoading(false);
    }
  };

  const trackKeyword = async (keyword: string, initialPosition: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('gsc_keyword_tracking')
        .insert({
          user_id: user.id,
          domain: selectedDomain,
          keyword,
          initial_position: initialPosition,
          current_position: initialPosition,
        });

      if (error) throw error;

      toast.success(`Mot-clé "${keyword}" ajouté au suivi`);
      await loadTrackedKeywords();
    } catch (error) {
      console.error('Error tracking keyword:', error);
      toast.error('Erreur lors de l\'ajout du suivi');
    }
  };

  const getPotentialBadgeVariant = (potential: string) => {
    switch (potential) {
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getPotentialLabel = (potential: string) => {
    switch (potential) {
      case 'high':
        return 'Fort potentiel';
      case 'medium':
        return 'Potentiel moyen';
      default:
        return 'Faible potentiel';
    }
  };

  return (
    <div className="space-y-6">
      {/* Opportunités d'articles */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Opportunités d'articles SEO</h3>
              <p className="text-sm text-muted-foreground">
                Mots-clés avec du potentiel pour créer du contenu
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={analyzeOpportunities}
            disabled={analyzing}
            className="gap-2"
          >
            {analyzing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Réanalyser
          </Button>
        </div>

        {opportunities.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mot-clé</TableHead>
                <TableHead>Sujet suggéré</TableHead>
                <TableHead className="text-right">Position</TableHead>
                <TableHead className="text-right">Impressions</TableHead>
                <TableHead>Potentiel</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {opportunities.map((opp, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{opp.query}</TableCell>
                  <TableCell className="max-w-xs truncate" title={opp.suggestedTopic}>
                    {opp.suggestedTopic}
                  </TableCell>
                  <TableCell className="text-right">{opp.currentPosition.toFixed(0)}</TableCell>
                  <TableCell className="text-right">{opp.impressions.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={getPotentialBadgeVariant(opp.potential)}>
                      {getPotentialLabel(opp.potential)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => trackKeyword(opp.query, opp.currentPosition)}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Suivre
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          // Naviguer vers la création d'article avec le sujet pré-rempli
                          window.location.href = `/blog/new?topic=${encodeURIComponent(opp.suggestedTopic)}&keyword=${encodeURIComponent(opp.query)}`;
                        }}
                        className="gap-2"
                      >
                        <FileText className="h-4 w-4" />
                        Créer article
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Aucune opportunité détectée pour le moment
            </p>
          </div>
        )}
      </Card>

      {/* Mots-clés suivis */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Eye className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Mots-clés suivis</h3>
              <p className="text-sm text-muted-foreground">
                Évolution des positions de vos mots-clés cibles
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : trackedKeywords.length > 0 ? (
          <div className="space-y-6">
            {trackedKeywords.map((keyword) => {
              const positionChange = keyword.initial_position - keyword.current_position;
              const isImproving = positionChange > 0;

              return (
                <div key={keyword.id} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold">{keyword.keyword}</h4>
                      <Badge variant={isImproving ? 'default' : 'secondary'}>
                        Position {keyword.current_position.toFixed(0)}
                      </Badge>
                      {positionChange !== 0 && (
                        <div className="flex items-center gap-1 text-sm">
                          {isImproving ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />
                          )}
                          <span className={isImproving ? 'text-green-600' : 'text-red-600'}>
                            {Math.abs(positionChange).toFixed(0)} positions
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {keyword.history.length > 1 && (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={keyword.history}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(date) => new Date(date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}
                        />
                        <YAxis reversed domain={['auto', 'auto']} />
                        <Tooltip 
                          labelFormatter={(date) => new Date(date).toLocaleDateString('fr-FR')}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="position" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                          activeDot={{ r: 6 }}
                          name="Position"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Aucun mot-clé suivi pour le moment
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Ajoutez des mots-clés depuis les opportunités ci-dessus
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
