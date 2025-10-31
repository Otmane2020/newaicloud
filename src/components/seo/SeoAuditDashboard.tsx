import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  FileSearch, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2,
  Sparkles,
  ShoppingBag,
  Image as ImageIcon,
  FileText,
  Home,
  Layers,
  ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { HomePageSeoAudit } from "./HomePageSeoAudit";

export function SeoAuditDashboard() {
  const navigate = useNavigate();
  const [audit, setAudit] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadLatestAudit();
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const [products, collections, pages, articles] = await Promise.all([
        supabase.from('shopify_products').select('id, enrichment_status').eq('seller_id', user?.id),
        supabase.from('shopify_collections').select('id, optimization_count').eq('user_id', user?.id),
        supabase.from('shopify_pages').select('id, optimized').eq('user_id', user?.id),
        supabase.from('blog_articles').select('id, optimization_count').eq('user_id', user?.id),
      ]);

      setStats({
        products: {
          total: products.data?.length || 0,
          optimized: products.data?.filter(p => p.enrichment_status === 'enriched').length || 0
        },
        collections: {
          total: collections.data?.length || 0,
          optimized: collections.data?.filter(c => c.optimization_count && c.optimization_count > 0).length || 0
        },
        pages: {
          total: pages.data?.length || 0,
          optimized: pages.data?.filter(p => p.optimized).length || 0
        },
        articles: {
          total: articles.data?.length || 0,
          optimized: articles.data?.filter(a => a.optimization_count && a.optimization_count > 0).length || 0
        }
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadLatestAudit = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('seo_audit_reports')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setAudit(data);
    } catch (error) {
      console.error('Error loading audit:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAudit = async () => {
    try {
      setGenerating(true);
      toast.info('Analyse SEO en cours... Cela peut prendre quelques instants.');

      const { data, error } = await supabase.functions.invoke('generate-comprehensive-seo-audit');

      if (error) throw error;

      toast.success('Audit SEO généré avec succès !');
      await loadLatestAudit();
    } catch (error: any) {
      console.error('Error generating audit:', error);
      toast.error(error.message || 'Erreur lors de la génération de l\'audit');
    } finally {
      setGenerating(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 border-green-300';
    if (score >= 60) return 'bg-yellow-100 border-yellow-300';
    return 'bg-red-100 border-red-300';
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      high: { variant: 'destructive' as const, label: '🔴 Haute', icon: AlertCircle },
      medium: { variant: 'default' as const, label: '🟡 Moyenne', icon: AlertCircle },
      low: { variant: 'secondary' as const, label: '🟢 Basse', icon: CheckCircle2 }
    };
    const config = variants[priority as keyof typeof variants] || variants.medium;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Sparkles className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Audit SEO Complet</h2>
          <p className="text-muted-foreground mt-1">
            Analyse détaillée de votre boutique avec recommandations prioritaires
          </p>
        </div>
        <Button
          onClick={handleGenerateAudit}
          disabled={generating}
          size="lg"
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
        >
          {generating ? (
            <>
              <Sparkles className="w-5 h-5 mr-2 animate-spin" />
              Analyse en cours...
            </>
          ) : (
            <>
              <FileSearch className="w-5 h-5 mr-2" />
              {audit ? 'Relancer l\'audit' : 'Lancer l\'audit'}
            </>
          )}
        </Button>
      </div>

      {!audit ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileSearch className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Aucun audit disponible</h3>
            <p className="text-muted-foreground mb-6">
              Lancez votre premier audit SEO pour obtenir des recommandations personnalisées
            </p>
            <Button
              onClick={handleGenerateAudit}
              disabled={generating}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <FileSearch className="w-5 h-5 mr-2" />
              Lancer l'audit
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Global Score */}
          <Card className={`border-2 ${getScoreBgColor(audit.global_score)}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-6 h-6" />
                Score SEO Global
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-6xl font-bold ${getScoreColor(audit.global_score)}`}>
                    {audit.global_score}<span className="text-3xl">/100</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Audit généré le {new Date(audit.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium mb-2">Niveau d'optimisation</div>
                  <Progress value={audit.global_score} className="w-48 h-3" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category Scores */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              { key: 'homepage_score', label: 'Homepage', icon: Home, tab: 'homepage' },
              { key: 'products_score', label: 'Produits', icon: ShoppingBag, tab: 'products' },
              { key: 'collections_score', label: 'Collections', icon: Layers, tab: 'collections' },
              { key: 'blog_score', label: 'Blog', icon: FileText, tab: 'articles' },
              { key: 'images_score', label: 'Images', icon: ImageIcon, tab: 'alt' },
              { key: 'technical_score', label: 'Technique', icon: Sparkles, tab: 'products' }
            ].map(({ key, label, icon: Icon, tab }) => {
              const categoryStats = stats?.[tab === 'products' ? 'products' : tab === 'collections' ? 'collections' : tab === 'articles' ? 'articles' : tab === 'homepage' ? 'pages' : 'pages'];
              const optimizedCount = categoryStats?.optimized || 0;
              const totalCount = categoryStats?.total || 0;
              
              return (
                <Card 
                  key={key}
                  className="cursor-pointer hover:shadow-lg transition-all hover:scale-105"
                  onClick={() => navigate(`/seo?tab=${tab}`)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {label}
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-2">
                      <div className={`text-3xl font-bold ${getScoreColor(audit[key] || 0)}`}>
                        {audit[key] || 0}/100
                      </div>
                      {totalCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {optimizedCount}/{totalCount}
                        </Badge>
                      )}
                    </div>
                    <Progress value={audit[key] || 0} className="mt-2" />
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Homepage SEO Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="w-5 h-5" />
                Analyse Homepage SEO
              </CardTitle>
              <CardDescription>
                Optimisation détaillée de votre page d'accueil
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HomePageSeoAudit />
            </CardContent>
          </Card>

          {/* Issues */}
          {audit.audit_results?.issues && audit.audit_results.issues.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Problèmes Détectés ({audit.audit_results.issues.length})
                </CardTitle>
                <CardDescription>
                  Points d'amélioration identifiés par l'analyse
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {audit.audit_results.issues.map((issue: any, index: number) => (
                    <div
                      key={index}
                      className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="capitalize">
                              {issue.category}
                            </Badge>
                            {getPriorityBadge(issue.priority)}
                          </div>
                          <h4 className="font-semibold">{issue.title}</h4>
                        </div>
                        {issue.count && (
                          <Badge variant="secondary" className="ml-2">
                            {issue.count} éléments
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{issue.description}</p>
                      <div className="bg-yellow-50 dark:bg-yellow-950 p-3 rounded-md mb-2">
                        <p className="text-sm">
                          <strong>Impact:</strong> {issue.impact}
                        </p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-950 p-3 rounded-md">
                        <p className="text-sm">
                          <strong>Action recommandée:</strong> {issue.action}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {audit.recommendations && audit.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Plan d'Action Recommandé
                </CardTitle>
                <CardDescription>
                  Étapes prioritaires pour améliorer votre SEO
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {audit.recommendations.map((rec: any, index: number) => (
                    <div key={index}>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        {rec.priority === 'high' && <span className="text-red-600">●</span>}
                        {rec.priority === 'medium' && <span className="text-yellow-600">●</span>}
                        {rec.priority === 'low' && <span className="text-green-600">●</span>}
                        {rec.title}
                      </h4>
                      <ul className="space-y-2 ml-4">
                        {rec.actions?.map((action: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}