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
    if (score >= 60) return 'text-[#FF8C00]';  // Orange vif
    return 'text-[#EF4444]';  // Rouge vif
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-[#FF8C00]';  // Orange vif
    return 'bg-[#EF4444]';  // Rouge vif
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      high: { className: 'bg-[#EF4444] text-white border-0', label: '🔴 Haute', icon: AlertCircle },
      medium: { className: 'bg-[#FF8C00] text-white border-0', label: '🟡 Moyenne', icon: AlertCircle },
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
      {/* Hero Header premium */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary-dark to-primary-light p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-2xl translate-y-24 -translate-x-24" />
        
        <div className="relative z-10 flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-sm">
                <FileSearch className="w-8 h-8 text-white" />
              </div>
              <Badge className="bg-white/20 text-white border-white/30 px-4 py-1.5 text-sm font-semibold">
                Analyse IA Avancée
              </Badge>
            </div>
            <h1 className="text-4xl font-black text-white mb-3">
              Audit SEO Complet
            </h1>
            <p className="text-white/90 text-lg font-medium max-w-2xl leading-relaxed">
              Obtenez une analyse détaillée de votre boutique Shopify avec des recommandations actionnables
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm">
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span className="text-sm font-semibold text-white">6 Catégories</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm">
                <TrendingUp className="w-4 h-4 text-white" />
                <span className="text-sm font-semibold text-white">Scoring intelligent</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm">
                <Sparkles className="w-4 h-4 text-white" />
                <span className="text-sm font-semibold text-white">Plan d'action</span>
              </div>
            </div>
          </div>
          <Button
            onClick={handleGenerateAudit}
            disabled={generating}
            size="lg"
            className="bg-white text-primary hover:bg-white/90 font-bold shadow-xl px-8 py-6 text-lg"
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
      </div>

      {/* Section éducative premium */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-2 hover:shadow-lg transition-all">
          <CardHeader>
            <div className="w-12 h-12 rounded-xl bg-[#FF8C00]/10 flex items-center justify-center mb-3">
              <TrendingUp className="w-6 h-6 text-[#FF8C00]" />
            </div>
            <CardTitle className="text-lg">Pourquoi un audit SEO ?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Un audit SEO identifie les opportunités d'amélioration pour augmenter votre visibilité sur Google
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-2 hover:shadow-lg transition-all">
          <CardHeader>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <CardTitle className="text-lg">Ce que vous obtenez</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Une analyse complète de 6 catégories avec score détaillé et plan d'action priorisé
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-2 hover:shadow-lg transition-all">
          <CardHeader>
            <div className="w-12 h-12 rounded-xl bg-[#EF4444]/10 flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6 text-[#EF4444]" />
            </div>
            <CardTitle className="text-lg">Analyse IA avancée</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Notre IA analyse automatiquement votre boutique pour vous fournir des recommandations actionnables
            </p>
          </CardContent>
        </Card>
      </div>

      {!audit ? (
        <Card className="border-2 shadow-xl">
          <CardContent className="py-16 text-center">
            <div className="max-w-2xl mx-auto">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary-dark mx-auto mb-6 flex items-center justify-center shadow-lg">
                <FileSearch className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-3xl font-bold mb-4">Prêt à booster votre SEO ?</h3>
              <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                Lancez votre premier audit SEO complet pour découvrir comment améliorer votre classement sur Google. L'analyse prend environ 30 secondes.
              </p>
              <Button
                onClick={handleGenerateAudit}
                disabled={generating}
                size="lg"
                className="bg-gradient-to-r from-primary to-primary-dark text-lg px-8 py-6 shadow-xl"
              >
                <FileSearch className="w-6 h-6 mr-2" />
                Lancer mon audit gratuit
              </Button>
              <p className="text-xs text-muted-foreground mt-4">
                🔒 Analyse 100% automatique et sécurisée
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Global Score - Premium */}
          <Card className="border-2 shadow-2xl bg-gradient-to-br from-card via-card to-primary/5 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl" />
            <CardHeader className="relative z-10">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10">
                    <TrendingUp className="w-7 h-7 text-primary" />
                  </div>
                  Score SEO Global
                </CardTitle>
                <Badge className={`text-lg px-5 py-2 border-0 ${
                  audit.global_score >= 80 ? 'bg-emerald-500 text-white' :
                  audit.global_score >= 60 ? 'bg-[#FF8C00] text-white' :
                  'bg-[#EF4444] text-white'
                }`}>
                  {audit.global_score >= 80 ? '🎯 Excellent' :
                   audit.global_score >= 60 ? '📈 Bon' : '⚠️ À améliorer'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="flex items-center justify-between gap-8">
                <div className="flex-1">
                  <div className="flex items-baseline gap-3 mb-4">
                    <span className={`text-8xl font-black ${getScoreColor(audit.global_score)}`}>
                      {audit.global_score}
                    </span>
                    <span className="text-4xl text-muted-foreground font-bold">/100</span>
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground font-medium">
                      📅 Audit généré le {new Date(audit.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-muted-foreground mb-2">PROGRESSION</div>
                        <Progress value={audit.global_score} className="h-4 shadow-inner" />
                      </div>
                      <span className="text-sm font-bold text-primary">
                        {100 - audit.global_score} pts restants
                      </span>
                    </div>
                  </div>
                </div>
                <div className="hidden md:block">
                  <div className="w-48 h-48 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-xl border-4 border-primary/20">
                    <div className="text-center">
                      <div className={`text-5xl font-black ${getScoreColor(audit.global_score)} mb-2`}>
                        {Math.round(audit.global_score / 16.67)}
                      </div>
                      <div className="text-xs text-muted-foreground font-semibold">sur 6 catégories</div>
                      <div className="text-xs text-muted-foreground">optimisées</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Message motivationnel */}
              <div className={`mt-6 p-4 rounded-xl border-2 ${
                audit.global_score >= 80 ? 'bg-emerald-500/10 border-emerald-500/20' :
                audit.global_score >= 60 ? 'bg-[#FF8C00]/10 border-[#FF8C00]/20' :
                'bg-[#EF4444]/10 border-[#EF4444]/20'
              }`}>
                <p className="text-sm font-semibold">
                  {audit.global_score >= 80 ? 
                    '🎉 Excellent travail ! Votre boutique est très bien optimisée.' :
                   audit.global_score >= 60 ?
                    '👍 Bon score ! Quelques optimisations supplémentaires vous permettront d\'atteindre l\'excellence.' :
                    '💪 Il y a du potentiel ! Suivez nos recommandations pour améliorer rapidement.'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Category Scores - Premium avec effets */}
          <div>
            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-2">Détail par Catégorie</h3>
              <p className="text-muted-foreground">
                Cliquez sur une catégorie pour accéder aux optimisations
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[
                { key: 'homepage_score', label: 'Homepage', icon: Home, tab: 'homepage', desc: 'Titre et meta' },
                { key: 'products_score', label: 'Produits', icon: ShoppingBag, tab: 'products', desc: 'Fiches SEO' },
                { key: 'collections_score', label: 'Collections', icon: Layers, tab: 'collections', desc: 'Pages collections' },
                { key: 'blog_score', label: 'Contenu', icon: FileText, tab: 'articles', desc: 'Articles et pages' },
                { key: 'images_score', label: 'Images', icon: ImageIcon, tab: 'alt-image', desc: 'Textes alternatifs' },
                { key: 'technical_score', label: 'Technique', icon: Sparkles, tab: 'products', desc: 'Configuration' }
              ].map(({ key, label, icon: Icon, tab, desc }) => {
                const score = audit[key] || 0;
                
                return (
                  <Card 
                    key={key}
                    className="group cursor-pointer hover:shadow-2xl transition-all duration-300 hover:scale-105 border-2 hover:border-primary/50 bg-gradient-to-br from-card to-muted/20 overflow-hidden relative"
                    onClick={() => navigate(`/seo?tab=${tab}`)}
                  >
                    <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl ${
                      score >= 80 ? 'bg-emerald-500/20' : score >= 60 ? 'bg-[#FF8C00]/20' : 'bg-[#EF4444]/20'
                    } group-hover:blur-3xl transition-all`} />
                    
                    <CardHeader className="pb-3 relative z-10">
                      <div className="flex items-center justify-between mb-2">
                        <div className={`p-3 rounded-xl ${
                          score >= 80 ? 'bg-emerald-500/10' : score >= 60 ? 'bg-[#FF8C00]/10' : 'bg-[#EF4444]/10'
                        } group-hover:scale-110 transition-transform`}>
                          <Icon className={`w-5 h-5 ${
                            score >= 80 ? 'text-emerald-500' : score >= 60 ? 'text-[#FF8C00]' : 'text-[#EF4444]'
                          }`} />
                        </div>
                        <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                      <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">
                        {label}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground font-medium">{desc}</p>
                    </CardHeader>
                    <CardContent className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className={`text-4xl font-black ${
                          score >= 80 ? 'text-emerald-500' : score >= 60 ? 'text-[#FF8C00]' : 'text-[#EF4444]'
                        }`}>
                          {score}
                          <span className="text-lg text-muted-foreground">/100</span>
                        </div>
                      </div>
                      <div className="relative h-3 bg-muted rounded-full overflow-hidden shadow-inner">
                        <div
                          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ${
                            score >= 80 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
                            score >= 60 ? 'bg-gradient-to-r from-[#FF8C00] to-[#FFB84D]' :
                            'bg-gradient-to-r from-[#EF4444] to-[#F87171]'
                          }`}
                          style={{ 
                            width: `${score}%`,
                            boxShadow: score >= 80 ? '0 0 8px #10b981' :
                                       score >= 60 ? '0 0 8px #FF8C00' :
                                       '0 0 8px #EF4444'
                          }}
                        />
                      </div>
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

          {/* Issues - Premium */}
          {audit.audit_results?.issues && audit.audit_results.issues.length > 0 && (
            <Card className="border-2 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-[#EF4444]/5 to-[#FF8C00]/5 border-b-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-3 text-2xl">
                      <div className="p-3 rounded-xl bg-[#EF4444]/10">
                        <AlertCircle className="w-6 h-6 text-[#EF4444]" />
                      </div>
                      Problèmes Détectés
                    </CardTitle>
                    <CardDescription className="mt-2 text-base">
                      {audit.audit_results.issues.length} point{audit.audit_results.issues.length > 1 ? 's' : ''} d'amélioration identifié{audit.audit_results.issues.length > 1 ? 's' : ''}
                    </CardDescription>
                  </div>
                  <Badge className="bg-[#EF4444] text-white text-lg px-4 py-2 border-0">
                    {audit.audit_results.issues.filter((i: any) => i.priority === 'high').length} prioritaire{audit.audit_results.issues.filter((i: any) => i.priority === 'high').length > 1 ? 's' : ''}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  {audit.audit_results.issues.map((issue: any, index: number) => (
                    <div
                      key={index}
                      className={`border-2 rounded-2xl p-6 transition-all hover:shadow-xl ${
                        issue.priority === 'high' ? 'border-[#EF4444]/30 bg-[#EF4444]/5' :
                        issue.priority === 'medium' ? 'border-[#FF8C00]/30 bg-[#FF8C00]/5' :
                        'border-muted bg-muted/20'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <Badge variant="outline" className="capitalize text-sm font-semibold">
                              📍 {issue.category}
                            </Badge>
                            {getPriorityBadge(issue.priority)}
                          </div>
                          <h4 className="font-bold text-lg mb-2">{issue.title}</h4>
                          <p className="text-sm text-muted-foreground leading-relaxed">{issue.description}</p>
                        </div>
                        {issue.count && (
                          <Badge className="ml-4 bg-primary text-white text-base px-4 py-2 border-0">
                            {issue.count} élément{issue.count > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4 mt-4">
                        <div className="p-4 rounded-xl bg-[#FF8C00]/10 border-2 border-[#FF8C00]/20">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="w-4 h-4 text-[#FF8C00]" />
                            <span className="text-sm font-bold text-[#FF8C00]">Impact SEO</span>
                          </div>
                          <p className="text-sm font-medium leading-relaxed">{issue.impact}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/20">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span className="text-sm font-bold text-emerald-500">Action recommandée</span>
                          </div>
                          <p className="text-sm font-medium leading-relaxed">{issue.action}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations - Premium timeline */}
          {audit.recommendations && audit.recommendations.length > 0 && (
            <Card className="border-2 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-emerald-500/5 to-primary/5 border-b-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-3 text-2xl">
                      <div className="p-3 rounded-xl bg-emerald-500/10">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                      </div>
                      Plan d'Action SEO
                    </CardTitle>
                    <CardDescription className="mt-2 text-base">
                      Suivez ces {audit.recommendations.length} étapes prioritaires
                    </CardDescription>
                  </div>
                  <Badge className="bg-emerald-500 text-white text-lg px-4 py-2 border-0">
                    {audit.recommendations.length} étapes
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-8">
                <div className="space-y-8 relative">
                  {/* Timeline line */}
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-primary/20" />
                  
                  {audit.recommendations.map((rec: any, index: number) => (
                    <div key={index} className="relative pl-16">
                      {/* Timeline dot */}
                      <div className={`absolute left-0 w-12 h-12 rounded-full flex items-center justify-center font-black text-white shadow-lg ${
                        rec.priority === 'high' ? 'bg-gradient-to-br from-[#EF4444] to-[#DC2626]' :
                        rec.priority === 'medium' ? 'bg-gradient-to-br from-[#FF8C00] to-[#FF9500]' :
                        'bg-gradient-to-br from-emerald-500 to-emerald-600'
                      }`}>
                        {index + 1}
                      </div>
                      
                      <div className="border-2 rounded-2xl p-6 hover:shadow-xl transition-all bg-card hover:border-primary/50">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              {rec.priority === 'high' && <Badge className="bg-[#EF4444] text-white border-0">🔥 Priorité Haute</Badge>}
                              {rec.priority === 'medium' && <Badge className="bg-[#FF8C00] text-white border-0">⚡ Priorité Moyenne</Badge>}
                              {rec.priority === 'low' && <Badge className="bg-emerald-500 text-white border-0">✓ Priorité Basse</Badge>}
                            </div>
                            <h4 className="font-bold text-xl mb-2">{rec.title}</h4>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="text-sm font-semibold text-muted-foreground mb-3">Actions à réaliser :</div>
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
                                className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${
                                  handler
                                    ? 'bg-primary/10 hover:bg-primary/20 cursor-pointer border-2 border-primary/20'
                                    : 'bg-muted/30 hover:bg-muted/50'
                                }`}
                                onClick={handler}
                              >
                                <div className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                </div>
                                <span className="text-sm font-medium leading-relaxed flex-1">{action}</span>
                                {handler && <ArrowRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* CTA final */}
                <div className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary/20 text-center">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 text-primary" />
                  <h5 className="text-xl font-bold mb-2">Besoin d'aide pour optimiser ?</h5>
                  <p className="text-sm text-muted-foreground mb-4">
                    Notre IA peut appliquer ces recommandations automatiquement
                  </p>
                  <Button 
                    size="lg" 
                    className="bg-gradient-to-r from-primary to-primary-dark text-white gap-2"
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