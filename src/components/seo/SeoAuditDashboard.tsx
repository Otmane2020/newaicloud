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
  ArrowRight,
  Zap
} from "lucide-react";
import { toast } from "sonner";
import { HomePageSeoAudit } from "./HomePageSeoAudit";
import { AutoOptimizationDialog } from "./AutoOptimizationDialog";

export function SeoAuditDashboard() {
  const navigate = useNavigate();
  const [audit, setAudit] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showAutoOptimizeDialog, setShowAutoOptimizeDialog] = useState(false);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadLatestAudit();
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setStats({
        products: { total: 0, optimized: 0, notOptimized: 10 },
        collections: { total: 0, optimized: 0, notOptimized: 5 },
        pages: { total: 0, optimized: 0, notOptimized: 3 },
        articles: { total: 0, optimized: 0, notOptimized: 8 },
        images: { withoutAlt: 45 }
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
    if (score >= 80) return 'text-emerald-500';
    if (score >= 60) return 'text-orange-500';
    return 'text-rose-500';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-orange-500';
    return 'bg-rose-500';
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      high: { className: 'bg-rose-500 text-white border-0', label: '🔴 Haute', icon: AlertCircle },
      medium: { className: 'bg-orange-500 text-white border-0', label: '🟡 Moyenne', icon: AlertCircle },
      low: { className: 'bg-emerald-500 text-white border-0', label: '🟢 Basse', icon: CheckCircle2 }
    };
    const config = variants[priority as keyof typeof variants] || variants.medium;
    const Icon = config.icon;
    return (
      <Badge className={`gap-1 ${config.className}`}>
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
    <div className="space-y-8">
      {/* Hero Header simple et coloré */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-dark p-8 shadow-xl">
        <div className="relative z-10 flex justify-between items-center">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-white/20">
                <FileSearch className="w-6 h-6 text-white" />
              </div>
              <Badge className="bg-white/20 text-white border-0">
                Analyse IA
              </Badge>
            </div>
            <h1 className="text-4xl font-black text-white mb-2">
              Audit SEO Complet
            </h1>
            <p className="text-white/90 text-base max-w-2xl">
              Analyse détaillée avec recommandations pour améliorer votre visibilité
            </p>
          </div>
          <Button
            onClick={handleGenerateAudit}
            disabled={generating}
            size="lg"
            className="bg-white text-primary hover:bg-white/90 font-bold shadow-lg"
          >
            {generating ? (
              <>
                <Sparkles className="w-5 h-5 mr-2 animate-spin" />
                Analyse...
              </>
            ) : (
              <>
                <FileSearch className="w-5 h-5 mr-2" />
                {audit ? 'Relancer' : 'Lancer l\'audit'}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Section éducative simplifiée */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-0 shadow-md hover:shadow-lg transition-all">
          <CardHeader>
            <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center mb-2">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-base">Pourquoi un audit ?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Identifiez les opportunités pour augmenter votre visibilité sur Google
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-md hover:shadow-lg transition-all">
          <CardHeader>
            <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center mb-2">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-base">Ce que vous obtenez</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Score détaillé, problèmes identifiés et plan d'action priorisé
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-md hover:shadow-lg transition-all">
          <CardHeader>
            <div className="w-12 h-12 rounded-xl bg-rose-500 flex items-center justify-center mb-2">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-base">Analyse IA</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Recommandations sur-mesure et actionnables pour votre boutique
            </p>
          </CardContent>
        </Card>
      </div>

      {!audit ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="py-16 text-center">
            <div className="max-w-2xl mx-auto">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary-dark mx-auto mb-6 flex items-center justify-center shadow-lg">
                <FileSearch className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-3xl font-bold mb-3">Prêt à booster votre SEO ?</h3>
              <p className="text-muted-foreground mb-6">
                Lancez votre audit SEO complet pour améliorer votre classement Google
              </p>
              <Button
                onClick={handleGenerateAudit}
                disabled={generating}
                size="lg"
                className="shadow-lg"
              >
                <FileSearch className="w-5 h-5 mr-2" />
                Lancer mon audit
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Global Score - Simple et coloré */}
          <Card className="border-0 shadow-xl overflow-hidden">
            <CardContent className="p-8">
              <div className="flex items-center justify-between gap-8">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-muted-foreground mb-4">Score SEO Global</h3>
                  <div className="flex items-baseline gap-4 mb-6">
                    <span className={`text-9xl font-black ${getScoreColor(audit.global_score)}`}>
                      {audit.global_score}
                    </span>
                    <span className="text-5xl text-muted-foreground font-bold">/100</span>
                  </div>
                  <div className="space-y-2">
                    <Progress value={audit.global_score} className="h-3" />
                    <p className="text-sm text-muted-foreground">
                      Audit du {new Date(audit.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                <div className={`w-40 h-40 rounded-full flex items-center justify-center ${getScoreBgColor(audit.global_score)}`}>
                  <div className="text-center">
                    <div className="text-5xl font-black text-white">
                      {audit.global_score >= 80 ? '🎯' : audit.global_score >= 60 ? '📈' : '⚡'}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category Scores - Design cards premium */}
          <div>
            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-2">Détail par Catégorie</h3>
              <p className="text-muted-foreground">
                Cliquez sur une catégorie pour accéder aux optimisations correspondantes
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[
                { key: 'homepage_score', label: 'Homepage', icon: Home, tab: 'homepage' },
                { key: 'products_score', label: 'Produits', icon: ShoppingBag, tab: 'products' },
                { key: 'collections_score', label: 'Collections', icon: Layers, tab: 'collections' },
                { key: 'blog_score', label: 'Contenu', icon: FileText, tab: 'articles' },
                { key: 'images_score', label: 'Images', icon: ImageIcon, tab: 'alt-image' },
                { key: 'technical_score', label: 'Technique', icon: Sparkles, tab: 'products' }
              ].map(({ key, label, icon: Icon, tab }) => {
                const score = audit[key] || 0;
                
                return (
                  <Card 
                    key={key}
                    className="group cursor-pointer hover:shadow-xl transition-all border-0 overflow-hidden"
                    onClick={() => navigate(`/seo?tab=${tab}`)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className={`p-3 rounded-xl ${getScoreBgColor(score)}`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                      <h4 className="font-bold text-lg mb-3">{label}</h4>
                      <div className="flex items-baseline gap-2 mb-3">
                        <span className={`text-5xl font-black ${getScoreColor(score)}`}>
                          {score}
                        </span>
                        <span className="text-xl text-muted-foreground">/100</span>
                      </div>
                      <Progress value={score} className="h-2" />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
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

          {/* Issues - Simple et coloré */}
          {audit.audit_results?.issues && audit.audit_results.issues.length > 0 && (
            <Card className="border-0 shadow-xl">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <AlertCircle className="w-5 h-5 text-rose-500" />
                    Problèmes Détectés
                  </CardTitle>
                  <Badge className="bg-rose-500 text-white border-0">
                    {audit.audit_results.issues.length} problème{audit.audit_results.issues.length > 1 ? 's' : ''}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {audit.audit_results.issues.map((issue: any, index: number) => (
                    <div
                      key={index}
                      className="border rounded-xl p-4 hover:shadow-md transition-all"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="capitalize">
                              {issue.category}
                            </Badge>
                            {getPriorityBadge(issue.priority)}
                          </div>
                          <h4 className="font-bold mb-2">{issue.title}</h4>
                          <p className="text-sm text-muted-foreground">{issue.description}</p>
                        </div>
                        {issue.count && (
                          <Badge className="ml-4 bg-primary text-white">
                            {issue.count}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-3 mt-3">
                        <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                          <div className="flex items-center gap-2 mb-1">
                            <AlertCircle className="w-4 h-4 text-orange-500" />
                            <span className="text-sm font-bold text-orange-700">Impact</span>
                          </div>
                          <p className="text-sm">{issue.impact}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span className="text-sm font-bold text-emerald-700">Action</span>
                          </div>
                          <p className="text-sm">{issue.action}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations - Timeline simple et coloré */}
          {audit.recommendations && audit.recommendations.length > 0 && (
            <Card className="border-0 shadow-xl">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    Plan d'Action SEO
                  </CardTitle>
                  <Badge className="bg-emerald-500 text-white border-0">
                    {audit.recommendations.length} étapes
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-8">
                <div className="space-y-6">
                  {audit.recommendations.map((rec: any, index: number) => (
                    <div key={index} className="relative pl-12">
                      {/* Timeline dot */}
                      <div className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                        rec.priority === 'high' ? 'bg-rose-500' :
                        rec.priority === 'medium' ? 'bg-orange-500' :
                        'bg-emerald-500'
                      }`}>
                        {index + 1}
                      </div>
                      
                      <div className="border rounded-xl p-4 hover:shadow-md transition-all">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="mb-2">
                              {rec.priority === 'high' && <Badge className="bg-rose-500 text-white border-0">🔥 Priorité Haute</Badge>}
                              {rec.priority === 'medium' && <Badge className="bg-orange-500 text-white border-0">⚡ Priorité Moyenne</Badge>}
                              {rec.priority === 'low' && <Badge className="bg-emerald-500 text-white border-0">✓ Priorité Basse</Badge>}
                            </div>
                            <h4 className="font-bold text-lg">{rec.title}</h4>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-muted-foreground">Actions :</p>
                          {rec.actions?.map((action: string, idx: number) => {
                            const getActionHandler = (actionText: string) => {
                              const lower = actionText.toLowerCase();
                              if (lower.includes('alt') || lower.includes('image')) {
                                return () => navigate('/seo?tab=alt-image');
                              }
                              if (lower.includes('produit')) {
                                return () => navigate('/seo?tab=products');
                              }
                              if (lower.includes('collection')) {
                                return () => navigate('/seo?tab=collections');
                              }
                              if (lower.includes('article') || lower.includes('blog')) {
                                return () => navigate('/blog');
                              }
                              if (lower.includes('page')) {
                                return () => navigate('/seo?tab=pages');
                              }
                              return undefined;
                            };
                            
                            const handler = getActionHandler(action);
                            
                            return (
                              <div
                                key={idx}
                                className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                                  handler
                                    ? 'bg-primary/10 hover:bg-primary/20 cursor-pointer'
                                    : 'bg-muted/50'
                                }`}
                                onClick={handler}
                              >
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                <span className="text-sm flex-1">{action}</span>
                                {handler && <ArrowRight className="w-4 h-4 text-primary flex-shrink-0" />}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* CTA final */}
                <div className="mt-8 p-6 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border-2 border-primary/20 text-center">
                  <Sparkles className="w-10 h-10 mx-auto mb-3 text-primary" />
                  <h5 className="text-lg font-bold mb-2">Optimisation Automatique</h5>
                  <p className="text-sm text-muted-foreground mb-4">
                    Laissez l'IA appliquer ces recommandations automatiquement
                  </p>
                  <Button 
                    size="lg" 
                    className="gap-2"
                    onClick={() => setShowAutoOptimizeDialog(true)}
                  >
                    <Zap className="w-5 h-5" />
                    Optimiser automatiquement
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
      
      {/* Auto Optimization Dialog */}
      <AutoOptimizationDialog
        open={showAutoOptimizeDialog}
        onOpenChange={setShowAutoOptimizeDialog}
        onComplete={() => {
          loadLatestAudit();
          loadStats();
        }}
        stats={{
          productsCount: stats?.products?.notOptimized || 0,
          collectionsCount: stats?.collections?.notOptimized || 0,
          imagesCount: stats?.images?.withoutAlt || 0,
          articlesCount: stats?.articles?.notOptimized || 0,
          pagesCount: stats?.pages?.notOptimized || 0
        }}
      />
    </div>
  );
}