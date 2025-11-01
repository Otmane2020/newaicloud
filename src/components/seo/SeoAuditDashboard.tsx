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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const [products, collections, pages, articles] = await Promise.all([
        supabase.from("shopify_products").select("id, enrichment_status").eq("seller_id", user?.id),
        supabase.from("shopify_collections").select("id, optimization_count").eq("user_id", user?.id),
        supabase.from("shopify_pages").select("id, optimized").eq("user_id", user?.id),
        supabase.from("blog_articles").select("id, optimization_count").eq("user_id", user?.id),
      ]);

      setStats({
        products: {
          total: products.data?.length || 0,
          optimized: products.data?.filter((p) => p.enrichment_status === "enriched").length || 0,
        },
        collections: {
          total: collections.data?.length || 0,
          optimized: collections.data?.filter((c) => c.optimization_count && c.optimization_count > 0).length || 0,
        },
        pages: {
          total: pages.data?.length || 0,
          optimized: pages.data?.filter((p) => p.optimized).length || 0,
        },
        articles: {
          total: articles.data?.length || 0,
          optimized: articles.data?.filter((a) => a.optimization_count && a.optimization_count > 0).length || 0,
        },
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const loadLatestAudit = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("seo_audit_reports")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      setAudit(data);
    } catch (error) {
      console.error("Error loading audit:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAudit = async () => {
    try {
      setGenerating(true);
      toast.info("Analyse SEO en cours... Cela peut prendre quelques instants.");

      const { data, error } = await supabase.functions.invoke("generate-comprehensive-seo-audit");

      if (error) throw error;

      toast.success("Audit SEO généré avec succès !");
      await loadLatestAudit();
    } catch (error: any) {
      console.error("Error generating audit:", error);
      toast.error(error.message || "Erreur lors de la génération de l'audit");
    } finally {
      setGenerating(false);
    }
  };

  // Palette de couleurs: vert (excellent), orange (moyen), rouge (faible)
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-[#22c55e]"; // Vert pour excellent
    if (score >= 60) return "text-[rgb(255,94,23)]"; // Orange vif
    if (score >= 40) return "text-[rgb(255,94,23)]"; // Orange vif
    return "text-[#dc2626]"; // Rouge pour faible
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-[#22c55e]/10 border-[#22c55e]/30";
    if (score >= 60) return "bg-[rgb(255,94,23)]/10 border-[rgb(255,94,23)]/30";
    if (score >= 40) return "bg-[rgb(255,94,23)]/10 border-[rgb(255,94,23)]/30";
    return "bg-[#dc2626]/10 border-[#dc2626]/30";
  };

  const getScoreGradient = (score: number) => {
    if (score >= 80) return "from-[#22c55e]/20 to-[#22c55e]/5";
    if (score >= 60) return "from-[rgb(255,94,23)]/20 to-[rgb(255,94,23)]/5";
    if (score >= 40) return "from-[rgb(255,94,23)]/20 to-[rgb(255,94,23)]/5";
    return "from-[#dc2626]/20 to-[#dc2626]/5";
  };

  const getCategoryColor = (value: number) => {
    if (value >= 80)
      return {
        text: "text-[#22c55e]",
        bg: "bg-gradient-to-r from-[#22c55e] to-[#16a34a]",
        glow: "0 0 10px #22c55e",
        dot: "bg-[#22c55e]",
        gradient: "from-[#22c55e]/20 to-[#22c55e]/5",
      };
    if (value >= 60)
      return {
        text: "text-[rgb(255,94,23)]",
        bg: "bg-gradient-to-r from-[rgb(255,94,23)] to-[rgb(230,80,20)]",
        glow: "0 0 10px rgb(255,94,23)",
        dot: "bg-[rgb(255,94,23)]",
        gradient: "from-[rgb(255,94,23)]/20 to-[rgb(255,94,23)]/5",
      };
    if (value >= 40)
      return {
        text: "text-[rgb(255,94,23)]",
        bg: "bg-gradient-to-r from-[rgb(255,94,23)] to-[rgb(230,80,20)]",
        glow: "0 0 10px rgb(255,94,23)",
        dot: "bg-[rgb(255,94,23)]",
        gradient: "from-[rgb(255,94,23)]/20 to-[rgb(255,94,23)]/5",
      };
    return {
      text: "text-[#dc2626]",
      bg: "bg-gradient-to-r from-[#dc2626] to-[#b91c1c]",
      glow: "0 0 10px #dc2626",
      dot: "bg-[#dc2626]",
      gradient: "from-[#dc2626]/20 to-[#dc2626]/5",
    };
  };

  const getGaugeGradient = (score: number) => {
    if (score >= 80)
      return {
        start: "#22c55e",
        end: "#16a34a",
        glow: "bg-[#22c55e]/30",
      };
    if (score >= 60)
      return {
        start: "rgb(255,94,23)",
        end: "rgb(230,80,20)",
        glow: "bg-[rgb(255,94,23)]/30",
      };
    if (score >= 40)
      return {
        start: "rgb(255,94,23)",
        end: "rgb(230,80,20)",
        glow: "bg-[rgb(255,94,23)]/30",
      };
    return {
      start: "#dc2626",
      end: "#b91c1c",
      glow: "bg-[#dc2626]/30",
    };
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      high: { variant: "destructive" as const, label: "🔴 Haute", icon: AlertCircle },
      medium: { variant: "default" as const, label: "🟡 Moyenne", icon: AlertCircle },
      low: { variant: "secondary" as const, label: "🟢 Basse", icon: CheckCircle2 },
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
    <div className="space-y-8">
      {/* Hero Header avec design premium */}
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
            <h1 className="text-4xl font-black text-white mb-3">Audit SEO Complet</h1>
            <p className="text-white/90 text-lg font-medium max-w-2xl leading-relaxed">
              Obtenez une analyse détaillée de votre boutique Shopify avec des recommandations actionnables pour
              améliorer votre visibilité en ligne et augmenter votre trafic organique.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm">
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span className="text-sm font-semibold text-white">6 Catégories analysées</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm">
                <TrendingUp className="w-4 h-4 text-white" />
                <span className="text-sm font-semibold text-white">Scoring intelligent</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm">
                <Sparkles className="w-4 h-4 text-white" />
                <span className="text-sm font-semibold text-white">Plan d'action personnalisé</span>
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
                {audit ? "Relancer l'audit" : "Lancer l'audit"}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Section éducative */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-2 hover:shadow-lg transition-all">
          <CardHeader>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Pourquoi un audit SEO ?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Un audit SEO identifie les opportunités d'amélioration pour augmenter votre visibilité sur Google et
              attirer plus de clients qualifiés vers votre boutique.
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 hover:shadow-lg transition-all">
          <CardHeader>
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6 text-success" />
            </div>
            <CardTitle className="text-lg">Ce que vous obtenez</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Une analyse complète de 6 catégories SEO avec un score détaillé, des problèmes identifiés et un plan
              d'action priorisé pour des résultats rapides.
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 hover:shadow-lg transition-all">
          <CardHeader>
            <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6 text-warning" />
            </div>
            <CardTitle className="text-lg">Analyse IA avancée</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Notre IA analyse automatiquement vos produits, collections, contenus et images pour vous fournir des
              recommandations sur-mesure et actionnables.
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
                Lancez votre premier audit SEO complet pour découvrir comment améliorer votre classement sur Google et
                attirer plus de clients. L'analyse prend environ 30 secondes.
              </p>
              <Button
                onClick={handleGenerateAudit}
                disabled={generating}
                size="lg"
                className="bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-lg px-8 py-6 shadow-xl"
              >
                <FileSearch className="w-6 h-6 mr-2" />
                Lancer mon audit gratuit
              </Button>
              <p className="text-xs text-muted-foreground mt-4">🔒 Analyse 100% automatique et sécurisée</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Global Score - Design premium avec jauge améliorée */}
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
                <Badge
                  className={`text-lg px-5 py-2 ${
                    audit.global_score >= 80
                      ? "bg-[#22c55e] text-white"
                      : audit.global_score >= 60
                        ? "bg-[rgb(255,94,23)] text-white"
                        : audit.global_score >= 40
                          ? "bg-[rgb(255,94,23)] text-white"
                          : "bg-[#dc2626] text-white"
                  }`}
                >
                  {audit.global_score >= 80
                    ? "🎯 Excellent"
                    : audit.global_score >= 60
                      ? "📈 Bon"
                      : audit.global_score >= 40
                        ? "⚠️ Moyen"
                        : "🚨 Faible"}
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
                      📅 Audit généré le{" "}
                      {new Date(audit.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-muted-foreground mb-2">PROGRESSION</div>
                        <div className="relative h-4 bg-muted rounded-full overflow-hidden shadow-inner">
                          <div
                            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ${
                              audit.global_score >= 80
                                ? "bg-gradient-to-r from-[#22c55e] to-[#16a34a]"
                                : audit.global_score >= 60
                                  ? "bg-gradient-to-r from-[rgb(255,94,23)] to-[rgb(230,80,20)]"
                                  : audit.global_score >= 40
                                    ? "bg-gradient-to-r from-[rgb(255,94,23)] to-[rgb(230,80,20)]"
                                    : "bg-gradient-to-r from-[#dc2626] to-[#b91c1c]"
                            }`}
                            style={{
                              width: `${audit.global_score}%`,
                              boxShadow:
                                audit.global_score >= 80
                                  ? "0 0 10px #22c55e"
                                  : audit.global_score >= 60
                                    ? "0 0 10px rgb(255,94,23)"
                                    : audit.global_score >= 40
                                      ? "0 0 10px rgb(255,94,23)"
                                      : "0 0 10px #dc2626",
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-bold text-primary">{100 - audit.global_score} pts restants</span>
                    </div>
                  </div>
                </div>
                <div className="hidden md:block">
                  {/* Jauge circulaire améliorée */}
                  <div className="relative w-48 h-48">
                    <div
                      className={`absolute inset-0 rounded-full blur-xl ${
                        audit.global_score >= 80
                          ? "bg-[#22c55e]/30"
                          : audit.global_score >= 60
                            ? "bg-[rgb(255,94,23)]/30"
                            : audit.global_score >= 40
                              ? "bg-[rgb(255,94,23)]/30"
                              : "bg-[#dc2626]/30"
                      } animate-pulse`}
                    />
                    <svg className="w-48 h-48 transform -rotate-90 relative z-10" viewBox="0 0 192 192">
                      <defs>
                        <linearGradient id="globalGaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop
                            offset="0%"
                            stopColor={
                              audit.global_score >= 80
                                ? "#22c55e"
                                : audit.global_score >= 60
                                  ? "rgb(255,94,23)"
                                  : audit.global_score >= 40
                                    ? "rgb(255,94,23)"
                                    : "#dc2626"
                            }
                          />
                          <stop
                            offset="100%"
                            stopColor={
                              audit.global_score >= 80
                                ? "#16a34a"
                                : audit.global_score >= 60
                                  ? "rgb(230,80,20)"
                                  : audit.global_score >= 40
                                    ? "rgb(230,80,20)"
                                    : "#b91c1c"
                            }
                          />
                        </linearGradient>
                      </defs>
                      <circle
                        cx="96"
                        cy="96"
                        r="84"
                        stroke="hsl(var(--muted))"
                        strokeWidth="12"
                        fill="none"
                        opacity="0.3"
                      />
                      <circle
                        cx="96"
                        cy="96"
                        r="84"
                        stroke="url(#globalGaugeGradient)"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${(audit.global_score / 100) * 528} 528`}
                        strokeLinecap="round"
                        className="transition-all duration-1500 ease-out"
                        style={{
                          filter: "drop-shadow(0 0 8px currentColor)",
                        }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className={`text-3xl font-black ${getScoreColor(audit.global_score)}`}>
                        {Math.round(audit.global_score / 16.67)}
                      </div>
                      <div className="text-xs text-muted-foreground font-semibold">sur 6 catégories</div>
                      <div className="text-xs text-muted-foreground">optimisées</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Message motivationnel */}
              <div
                className={`mt-6 p-4 rounded-xl ${
                  audit.global_score >= 80
                    ? "bg-[#22c55e]/10 border-2 border-[#22c55e]/20"
                    : audit.global_score >= 60
                      ? "bg-[rgb(255,94,23)]/10 border-2 border-[rgb(255,94,23)]/20"
                      : audit.global_score >= 40
                        ? "bg-[rgb(255,94,23)]/10 border-2 border-[rgb(255,94,23)]/20"
                        : "bg-[#dc2626]/10 border-2 border-[#dc2626]/20"
                }`}
              >
                <p className="text-sm font-semibold">
                  {audit.global_score >= 80
                    ? "🎉 Excellent travail ! Votre boutique est très bien optimisée pour le SEO. Continuez ainsi !"
                    : audit.global_score >= 60
                      ? "👍 Bon score ! Quelques optimisations supplémentaires vous permettront d'atteindre l'excellence."
                      : audit.global_score >= 40
                        ? "💪 Score moyen ! Suivez nos recommandations pour améliorer significativement votre visibilité."
                        : "🚨 Potentiel d'amélioration important ! Mettez en œuvre nos recommandations prioritaires pour booster votre SEO."}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Category Scores - Design cards premium avec couleurs améliorées */}
          <div>
            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-2">Détail par Catégorie</h3>
              <p className="text-muted-foreground">
                Cliquez sur une catégorie pour accéder aux optimisations correspondantes
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  key: "homepage_score",
                  label: "Homepage",
                  icon: Home,
                  tab: "homepage",
                  desc: "Titre et meta description",
                },
                {
                  key: "products_score",
                  label: "Produits",
                  icon: ShoppingBag,
                  tab: "products",
                  desc: "Fiches produits SEO",
                },
                {
                  key: "collections_score",
                  label: "Collections",
                  icon: Layers,
                  tab: "collections",
                  desc: "Pages collections",
                },
                { key: "blog_score", label: "Contenu", icon: FileText, tab: "articles", desc: "Articles et pages" },
                { key: "images_score", label: "Images", icon: ImageIcon, tab: "alt", desc: "Textes alternatifs" },
                {
                  key: "technical_score",
                  label: "Technique",
                  icon: Sparkles,
                  tab: "products",
                  desc: "Configuration Shopify",
                },
              ].map(({ key, label, icon: Icon, tab, desc }) => {
                const categoryStats =
                  stats?.[
                    tab === "products"
                      ? "products"
                      : tab === "collections"
                        ? "collections"
                        : tab === "articles"
                          ? "articles"
                          : "pages"
                  ];
                const optimizedCount = categoryStats?.optimized || 0;
                const totalCount = categoryStats?.total || 0;
                const score = audit[key] || 0;
                const categoryColor = getCategoryColor(score);

                return (
                  <Card
                    key={key}
                    className="group cursor-pointer hover:shadow-2xl transition-all duration-300 hover:scale-105 border-2 hover:border-primary/50 bg-gradient-to-br from-card to-muted/20 overflow-hidden relative"
                    onClick={() => navigate(`/seo?tab=${tab}`)}
                  >
                    <div
                      className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl ${categoryColor.gradient} group-hover:blur-3xl transition-all`}
                    />

                    <CardHeader className="pb-3 relative z-10">
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className={`p-3 rounded-xl bg-gradient-to-br ${categoryColor.gradient} group-hover:scale-110 transition-transform`}
                        >
                          <Icon className={`w-5 h-5 ${categoryColor.text}`} />
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
                        <div className={`text-4xl font-black ${categoryColor.text}`}>
                          {score}
                          <span className="text-lg text-muted-foreground">/100</span>
                        </div>
                        {totalCount > 0 && (
                          <Badge variant="outline" className="text-xs font-semibold">
                            {optimizedCount}/{totalCount} ✓
                          </Badge>
                        )}
                      </div>
                      <div className="relative h-3 bg-muted rounded-full overflow-hidden shadow-inner">
                        <div
                          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ${categoryColor.bg}`}
                          style={{
                            width: `${score}%`,
                            boxShadow: categoryColor.glow,
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
              <CardDescription>Optimisation détaillée de votre page d'accueil</CardDescription>
            </CardHeader>
            <CardContent>
              <HomePageSeoAudit />
            </CardContent>
          </Card>

          {/* Issues - Design premium avec couleurs améliorées */}
          {audit.audit_results?.issues && audit.audit_results.issues.length > 0 && (
            <Card className="border-2 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-[#dc2626]/5 to-[#f59e0b]/5 border-b-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-3 text-2xl">
                      <div className="p-3 rounded-xl bg-[#dc2626]/10">
                        <AlertCircle className="w-6 h-6 text-[#dc2626]" />
                      </div>
                      Problèmes Détectés
                    </CardTitle>
                    <CardDescription className="mt-2 text-base">
                      {audit.audit_results.issues.length} point{audit.audit_results.issues.length > 1 ? "s" : ""}{" "}
                      d'amélioration identifié{audit.audit_results.issues.length > 1 ? "s" : ""} par l'analyse IA
                    </CardDescription>
                  </div>
                  <Badge className="bg-[#dc2626] text-white text-lg px-4 py-2">
                    {audit.audit_results.issues.filter((i: any) => i.priority === "high").length} prioritaire
                    {audit.audit_results.issues.filter((i: any) => i.priority === "high").length > 1 ? "s" : ""}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  {audit.audit_results.issues.map((issue: any, index: number) => {
                    const issueColor =
                      issue.priority === "high"
                        ? {
                            border: "border-[#dc2626]/30",
                            bg: "bg-[#dc2626]/5",
                            text: "text-[#dc2626]",
                          }
                        : issue.priority === "medium"
                          ? {
                              border: "border-[#f59e0b]/30",
                              bg: "bg-[#f59e0b]/5",
                              text: "text-[#f59e0b]",
                            }
                          : {
                              border: "border-[#ea580c]/30",
                              bg: "bg-[#ea580c]/5",
                              text: "text-[#ea580c]",
                            };

                    return (
                      <div
                        key={index}
                        className={`border-2 rounded-2xl p-6 transition-all hover:shadow-xl ${issueColor.border} ${issueColor.bg}`}
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
                            <Badge className="ml-4 bg-primary text-white text-base px-4 py-2">
                              {issue.count} élément{issue.count > 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>

                        <div className="grid md:grid-cols-2 gap-4 mt-4">
                          <div className={`p-4 rounded-xl bg-[#f59e0b]/10 border-2 border-[#f59e0b]/20`}>
                            <div className="flex items-center gap-2 mb-2">
                              <AlertCircle className="w-4 h-4 text-[#f59e0b]" />
                              <span className="text-sm font-bold text-[#f59e0b]">Impact SEO</span>
                            </div>
                            <p className="text-sm font-medium leading-relaxed">{issue.impact}</p>
                          </div>
                          <div className="p-4 rounded-xl bg-[#22c55e]/10 border-2 border-[#22c55e]/20">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />
                              <span className="text-sm font-bold text-[#22c55e]">Action recommandée</span>
                            </div>
                            <p className="text-sm font-medium leading-relaxed">{issue.action}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations - Design premium avec timeline et couleurs améliorées */}
          {audit.recommendations && audit.recommendations.length > 0 && (
            <Card className="border-2 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-[#22c55e]/5 to-primary/5 border-b-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-3 text-2xl">
                      <div className="p-3 rounded-xl bg-[#22c55e]/10">
                        <CheckCircle2 className="w-6 h-6 text-[#22c55e]" />
                      </div>
                      Plan d'Action SEO
                    </CardTitle>
                    <CardDescription className="mt-2 text-base">
                      Suivez ces {audit.recommendations.length} étapes prioritaires pour améliorer votre référencement
                      naturel
                    </CardDescription>
                  </div>
                  <Badge className="bg-primary text-white text-lg px-4 py-2">
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
                      {/* Timeline dot avec couleurs améliorées */}
                      <div
                        className={`absolute left-0 w-12 h-12 rounded-full flex items-center justify-center font-black text-white shadow-lg ${
                          rec.priority === "high"
                            ? "bg-gradient-to-br from-[#dc2626] to-[#b91c1c]"
                            : rec.priority === "medium"
                              ? "bg-gradient-to-br from-[#f59e0b] to-[#d97706]"
                              : "bg-gradient-to-br from-[#22c55e] to-[#16a34a]"
                        }`}
                      >
                        {index + 1}
                      </div>

                      <div className="border-2 rounded-2xl p-6 hover:shadow-xl transition-all bg-card hover:border-primary/50">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              {rec.priority === "high" && (
                                <Badge className="bg-[#dc2626] text-white">🔥 Priorité Haute</Badge>
                              )}
                              {rec.priority === "medium" && (
                                <Badge className="bg-[#f59e0b] text-white">⚡ Priorité Moyenne</Badge>
                              )}
                              {rec.priority === "low" && (
                                <Badge className="bg-[#22c55e] text-white">✓ Priorité Basse</Badge>
                              )}
                            </div>
                            <h4 className="font-bold text-xl mb-2">{rec.title}</h4>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="text-sm font-semibold text-muted-foreground mb-3">Actions à réaliser :</div>
                          {rec.actions?.map((action: string, idx: number) => (
                            <div
                              key={idx}
                              className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                            >
                              <div className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                <CheckCircle2 className="w-4 h-4 text-primary" />
                              </div>
                              <span className="text-sm font-medium leading-relaxed">{action}</span>
                            </div>
                          ))}
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
                    Notre IA peut vous aider à appliquer ces recommandations automatiquement
                  </p>
                  <Button size="lg" className="bg-gradient-to-r from-primary to-primary-dark text-white">
                    Optimiser automatiquement
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
