import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
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
  Target,
  List,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { HomePageSeoAudit } from "./HomePageSeoAudit";
import { useTranslation } from "@/lib/language";

export function SeoAuditDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { selectedStore } = useStore();
  const { t, tf } = useTranslation();
  const [audit, setAudit] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [stats, setStats] = useState<any>(null);
  
  // Get subtab from URL params, default to "overview"
  const activeSubTab = searchParams.get("subtab") || "overview";

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (selectedStore) {
        loadLatestAudit();
        loadStats();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [selectedStore?.id]);

  const loadStats = async () => {
    if (!selectedStore?.id) {
      setStats(null);
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const [products, collections, pages, articles] = await Promise.all([
        supabase.from("shopify_products").select("id, enrichment_status").eq("seller_id", user?.id).eq("store_id", selectedStore.id),
        supabase.from("shopify_collections").select("id, optimization_count").eq("user_id", user?.id).eq("store_id", selectedStore.id),
        supabase.from("shopify_pages").select("id, optimized").eq("user_id", user?.id).eq("store_id", selectedStore.id),
        supabase.from("blog_articles").select("id, optimization_count").eq("user_id", user?.id).eq("store_id", selectedStore.id),
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
    if (!selectedStore?.id) {
      setAudit(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Note: seo_audit_reports remain global (no store filter) as table doesn't have store_id
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
      toast.info(t.seo.audit.analyzing);

      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke("generate-comprehensive-seo-audit", {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;

      toast.success(t.seoAuditDashboard.toasts.auditGenerated);
      await loadLatestAudit();
    } catch (error: any) {
      console.error("Error generating audit:", error);
      toast.error(error.message || t.seoAuditDashboard.toasts.auditError);
    } finally {
      setGenerating(false);
    }
  };

  // Palette de couleurs: vert (excellent), orange (bon), rouge (faible < 60)
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-[#22c55e]"; // Vert pour excellent
    if (score >= 60) return "text-[#FF8000]"; // Orange pour bon
    return "text-[#FF3333]"; // Rouge pour faible < 60
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-[#22c55e]/10 border-[#22c55e]/30";
    if (score >= 60) return "bg-[#FF8000]/10 border-[#FF8000]/30";
    return "bg-[#FF3333]/10 border-[#FF3333]/30";
  };

  const getScoreGradient = (score: number) => {
    if (score >= 80) return "from-[#22c55e]/20 to-[#22c55e]/5";
    if (score >= 60) return "from-[#FF8000]/20 to-[#FF8000]/5";
    return "from-[#FF3333]/20 to-[#FF3333]/5";
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
        text: "text-[#FF8000]",
        bg: "bg-gradient-to-r from-[#FF8000] to-[#FF8000]",
        glow: "0 0 10px #FF8000",
        dot: "bg-[#FF8000]",
        gradient: "from-[#FF8000]/20 to-[#FF8000]/5",
      };
    return {
      text: "text-[#FF3333]",
      bg: "bg-gradient-to-r from-[#FF3333] to-[#FF3333]",
      glow: "0 0 10px #FF3333",
      dot: "bg-[#FF3333]",
      gradient: "from-[#FF3333]/20 to-[#FF3333]/5",
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
        start: "#FF8000",
        end: "#FF8000",
        glow: "bg-[#FF8000]/30",
      };
    return {
      start: "#FF3333",
      end: "#FF3333",
      glow: "bg-[#FF3333]/30",
    };
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      high: { variant: "destructive" as const, label: t.seoAuditDashboard.issuesSection.high, icon: AlertCircle },
      medium: { variant: "default" as const, label: t.seoAuditDashboard.issuesSection.medium, icon: AlertCircle },
      low: { variant: "secondary" as const, label: t.seoAuditDashboard.issuesSection.low, icon: CheckCircle2 },
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
      {!audit ? (
        <>
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
                    {t.seoAuditDashboard.advancedAI}
                  </Badge>
                </div>
                <h1 className="text-4xl font-black text-white mb-3">{t.seo.audit.title}</h1>
                <p className="text-white/90 text-lg font-medium max-w-2xl leading-relaxed">
                  {t.seo.audit.description}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span className="text-sm font-semibold text-white">{t.seoAuditDashboard.categoriesAnalyzed}</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm">
                    <TrendingUp className="w-4 h-4 text-white" />
                    <span className="text-sm font-semibold text-white">{t.seoAuditDashboard.intelligentScoring}</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm">
                    <Sparkles className="w-4 h-4 text-white" />
                    <span className="text-sm font-semibold text-white">{t.seoAuditDashboard.personalizedPlan}</span>
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
                    {t.seo.audit.analyzing}
                  </>
                ) : (
                  <>
                    <FileSearch className="w-5 h-5 mr-2" />
                    {audit ? t.seo.audit.relaunchAudit : t.seo.audit.generateAudit}
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
                <CardTitle className="text-lg">{t.seo.audit.noAudit.benefits.comprehensive}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t.seo.audit.noAudit.benefits.comprehensiveDesc}
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-6 h-6 text-success" />
                </div>
                <CardTitle className="text-lg">{t.seo.audit.noAudit.benefits.opportunities}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t.seo.audit.noAudit.benefits.opportunitiesDesc}
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center mb-3">
                  <Sparkles className="w-6 h-6 text-warning" />
                </div>
                <CardTitle className="text-lg">{t.seo.audit.noAudit.benefits.actionPlan}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t.seo.audit.noAudit.benefits.actionPlanDesc}
                </p>
              </CardContent>
            </Card>
          </div>
          <Card className="border-2 shadow-xl">
            <CardContent className="py-16 text-center">
              <div className="max-w-2xl mx-auto">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary-dark mx-auto mb-6 flex items-center justify-center shadow-lg">
                  <FileSearch className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-3xl font-bold mb-4">{t.seo.audit.noAudit.cta}</h3>
                <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                  {t.seo.audit.noAudit.ctaDesc}
                </p>
                <Button
                  onClick={handleGenerateAudit}
                  disabled={generating}
                  size="lg"
                  className="bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-lg px-8 py-6 shadow-xl"
                >
                  <FileSearch className="w-6 h-6 mr-2" />
                  {t.seo.audit.generateAudit}
                </Button>
                <p className="text-xs text-muted-foreground mt-4">{t.seoAuditDashboard.secureAnalysis}</p>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="space-y-8">
          {/* Header only for overview */}
          {activeSubTab === "overview" && (
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
                      {t.seoAuditDashboard.advancedAI}
                    </Badge>
                  </div>
                  <h1 className="text-4xl font-black text-white mb-3">{t.seo.audit.title}</h1>
                  <p className="text-white/90 text-lg font-medium max-w-2xl leading-relaxed">
                    {t.seo.audit.description}
                  </p>
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
                      {t.seo.audit.analyzing}
                    </>
                  ) : (
                    <>
                      <FileSearch className="w-5 h-5 mr-2" />
                      {t.seo.audit.relaunchAudit}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
          {/* Content based on activeSubTab */}
          {activeSubTab === "overview" && (
            <>
              {/* Quick Access Cards */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card
                  className="group cursor-pointer hover:shadow-xl transition-all border-2 hover:border-primary/50 bg-gradient-to-br from-card to-primary/5"
                  onClick={() => navigate("/seo?tab=audit-dashboard&subtab=homepage")}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <Home className="w-6 h-6 text-primary" />
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                    <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors">{t.seo.audit.quickAccess.homepage}</h3>
                    <p className="text-sm text-muted-foreground">{t.seo.audit.quickAccess.homepageDesc}</p>
                  </CardContent>
                </Card>

                <Card
                  className="group cursor-pointer hover:shadow-xl transition-all border-2 hover:border-destructive/50 bg-gradient-to-br from-card to-destructive/5"
                  onClick={() => navigate("/seo?tab=audit-dashboard&subtab=issues")}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-3 rounded-xl bg-destructive/10 group-hover:bg-destructive/20 transition-colors">
                        <AlertCircle className="w-6 h-6 text-destructive" />
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-destructive group-hover:translate-x-1 transition-all" />
                    </div>
                    <h3 className="font-bold text-lg mb-1 group-hover:text-destructive transition-colors">{t.seo.audit.quickAccess.issues}</h3>
                    <p className="text-sm text-muted-foreground">
                      {tf('seo.audit.quickAccess.issuesDesc', { count: audit?.audit_results?.issues?.length || 0 })}
                    </p>
                  </CardContent>
                </Card>

                <Card
                  className="group cursor-pointer hover:shadow-xl transition-all border-2 hover:border-success/50 bg-gradient-to-br from-card to-success/5"
                  onClick={() => navigate("/seo?tab=audit-dashboard&subtab=actions")}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-3 rounded-xl bg-success/10 group-hover:bg-success/20 transition-colors">
                        <Target className="w-6 h-6 text-success" />
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-success group-hover:translate-x-1 transition-all" />
                    </div>
                    <h3 className="font-bold text-lg mb-1 group-hover:text-success transition-colors">{t.seoAuditDashboard.actionsSection.actionPlan}</h3>
                    <p className="text-sm text-muted-foreground">
                      {tf('seoAuditDashboard.actionsSection.priorityActions', { count: audit?.audit_results?.action_plan?.length || 0 })}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Global Score - Design premium avec jauge améliorée */}
            <Card className="border-2 shadow-2xl bg-gradient-to-br from-card via-card to-primary/5 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl" />
            <CardHeader className="relative z-10">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10">
                    <TrendingUp className="w-7 h-7 text-primary" />
                  </div>
                  {t.seoAuditDashboard.overview.title}
                </CardTitle>
                <Badge
                  className={`text-lg px-5 py-2 ${
                    audit.global_score >= 80
                      ? "bg-[#22c55e] text-white"
                      : audit.global_score >= 60
                        ? "bg-[#FF8000] text-white"
                        : "bg-[#FF3333] text-white"
                  }`}
                >
                  {audit.global_score >= 80
                    ? t.seoAuditDashboard.scoreLabel.excellent
                    : audit.global_score >= 60
                      ? t.seoAuditDashboard.scoreLabel.good
                      : t.seoAuditDashboard.scoreLabel.low}
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
                      📅 {t.seoAuditDashboard.overview.analysisDate}{" "}
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
                        <div className="text-xs font-semibold text-muted-foreground mb-2">{t.seoAuditDashboard.overview.progression}</div>
                        <div className="relative h-4 bg-muted rounded-full overflow-hidden shadow-inner">
                          <div
                            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ${
                              audit.global_score >= 80
                                ? "bg-gradient-to-r from-[#22c55e] to-[#16a34a]"
                                : audit.global_score >= 60
                                  ? "bg-gradient-to-r from-[#FF8000] to-[#FF8000]"
                                  : "bg-gradient-to-r from-[#FF3333] to-[#FF3333]"
                            }`}
                            style={{
                              width: `${audit.global_score}%`,
                              boxShadow:
                                audit.global_score >= 80
                                  ? "0 0 10px #22c55e"
                                  : audit.global_score >= 60
                                    ? "0 0 10px #FF8000"
                                    : "0 0 10px #FF3333",
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-bold text-primary">{tf('seoAuditDashboard.overview.pointsRemaining', { count: 100 - audit.global_score })}</span>
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
                              : "bg-[#b91c1c]/30"
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
                                    : "#b91c1c"
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
                      <div className="text-xs text-muted-foreground font-semibold">{tf('seoAuditDashboard.overview.categoriesOptimized', { count: 6 })}</div>
                      <div className="text-xs text-muted-foreground">{t.seoAuditDashboard.overview.optimized}</div>
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
                      ? "bg-[#FF8000]/10 border-2 border-[#FF8000]/20"
                      : "bg-[#FF3333]/10 border-2 border-[#FF3333]/20"
                }`}
              >
                <p className="text-sm font-semibold">
                  {audit.global_score >= 80
                    ? t.seoAuditDashboard.motivational.excellent
                    : audit.global_score >= 60
                      ? t.seoAuditDashboard.motivational.good
                      : t.seoAuditDashboard.motivational.low}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Category Scores - Moved from categories tab */}
          <div>
            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-2">{t.seoAuditDashboard.categoryDetail.title}</h3>
              <p className="text-muted-foreground">
                {t.seoAuditDashboard.categoryDetail.subtitle}
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  key: "homepage_score",
                  label: t.seoAuditDashboard.categories.homepage,
                  icon: Home,
                  tab: "audit-dashboard",
                  subtab: "homepage",
                  desc: t.seoAuditDashboard.categoryDescriptions.homepage,
                },
                {
                  key: "products_score",
                  label: t.seoAuditDashboard.categories.products,
                  icon: ShoppingBag,
                  tab: "products",
                  desc: t.seoAuditDashboard.categoryDescriptions.products,
                },
                {
                  key: "collections_score",
                  label: t.seoAuditDashboard.categories.collections,
                  icon: Layers,
                  tab: "collections",
                  desc: t.seoAuditDashboard.categoryDescriptions.collections,
                },
                { 
                  key: "blog_score", 
                  label: t.seoAuditDashboard.categories.content, 
                  icon: FileText, 
                  tab: "articles", 
                  desc: t.seoAuditDashboard.categoryDescriptions.content 
                },
                { 
                  key: "images_score", 
                  label: t.seoAuditDashboard.categories.images, 
                  icon: ImageIcon, 
                  tab: "alt", 
                  desc: t.seoAuditDashboard.categoryDescriptions.images 
                },
                {
                  key: "technical_score",
                  label: t.seoAuditDashboard.categories.technical,
                  icon: Sparkles,
                  tab: "products",
                  desc: t.seoAuditDashboard.categoryDescriptions.technical,
                },
              ].map(({ key, label, icon: Icon, tab, subtab, desc }) => {
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
                    onClick={() => navigate(subtab ? `/seo?tab=${tab}&subtab=${subtab}` : `/seo?tab=${tab}`)}
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
          </>
          )}

          {/* Homepage Section */}
          {activeSubTab === "homepage" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="w-5 h-5" />
                  {t.seoAuditDashboard.homepageSection.title}
                </CardTitle>
                <CardDescription>{t.seoAuditDashboard.homepageSection.subtitle}</CardDescription>
              </CardHeader>
              <CardContent>
                <HomePageSeoAudit />
              </CardContent>
            </Card>
          )}

          {/* Issues Section */}
          {activeSubTab === "issues" && audit?.audit_results?.issues && audit.audit_results.issues.length > 0 && (
            <Card className="border-2 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-[#b91c1c]/5 to-[#f59e0b]/5 border-b-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-3 text-2xl">
                      <div className="p-3 rounded-xl bg-[#b91c1c]/10">
                        <AlertCircle className="w-6 h-6 text-[#b91c1c]" />
                      </div>
                      {t.seoAuditDashboard.issuesSection.title}
                    </CardTitle>
                    <CardDescription className="mt-2 text-base">
                      {audit.audit_results.issues.length === 1 
                        ? tf('seoAuditDashboard.issuesSection.issueFound', { count: audit.audit_results.issues.length })
                        : tf('seoAuditDashboard.issuesSection.issueFoundPlural', { count: audit.audit_results.issues.length })
                      }
                    </CardDescription>
                  </div>
                  <Badge className="bg-[#b91c1c] text-white text-lg px-4 py-2">
                    {audit.audit_results.issues.filter((i: any) => i.priority === "high").length === 1
                      ? tf('seoAuditDashboard.issuesSection.highPriority', { count: audit.audit_results.issues.filter((i: any) => i.priority === "high").length })
                      : tf('seoAuditDashboard.issuesSection.highPriorityPlural', { count: audit.audit_results.issues.filter((i: any) => i.priority === "high").length })
                    }
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  {audit.audit_results.issues.map((issue: any, index: number) => {
                    const issueColor =
                      issue.priority === "high"
                        ? {
                            border: "border-[#b91c1c]/30",
                            bg: "bg-[#b91c1c]/5",
                            text: "text-[#b91c1c]",
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
                          <Button
                            variant="outline"
                            size="sm"
                            className="ml-4 bg-primary/10 hover:bg-primary/20 border-primary/30 font-semibold"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Détermine l'onglet et le filtre en fonction de la catégorie
                              const categoryMap: Record<string, { tab: string; filter?: string }> = {
                                'produits': { tab: 'products', filter: 'poor' },
                                'products': { tab: 'products', filter: 'poor' },
                                'collections': { tab: 'collections', filter: 'poor' },
                                'images': { tab: 'alt', filter: 'poor' },
                                'alt': { tab: 'alt', filter: 'poor' },
                                'tags': { tab: 'tags', filter: 'poor' },
                                'articles': { tab: 'articles', filter: 'poor' },
                                'pages': { tab: 'pages', filter: 'poor' },
                                'content': { tab: 'articles', filter: 'poor' }, // Content = articles + pages
                                'technical': { tab: 'products', filter: 'poor' }, // Technical issues généralement liés aux produits
                                'homepage': { tab: 'homepage' },
                              };
                              
                              const mapping = categoryMap[issue.category?.toLowerCase()] || { tab: 'products', filter: 'poor' };
                              const url = mapping.filter 
                                ? `/seo?tab=${mapping.tab}&filter=${mapping.filter}`
                                : `/seo?tab=${mapping.tab}`;
                              
                              navigate(url);
                            }}
                          >
                            <ArrowRight className="w-4 h-4 mr-1" />
                            {issue.count} élément{issue.count > 1 ? "s" : ""}
                          </Button>
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

          {/* Actions Section */}
          {activeSubTab === "actions" && audit.recommendations && audit.recommendations.length > 0 && (
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
                            ? "bg-gradient-to-br from-[#b91c1c] to-[#991b1b]"
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
                                <Badge className="bg-[#b91c1c] text-white">🔥 Priorité Haute</Badge>
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
        </div>
      )}
    </div>
  );
}
