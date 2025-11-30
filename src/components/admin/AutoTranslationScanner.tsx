import React, { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Search, History, BarChart3, Copy, Check, Trash2, AlertTriangle, CheckCircle, Wand2, FileCode, Languages, Sparkles, RefreshCw, ChevronDown, ChevronRight, FileText, FolderOpen, Layout, MessageSquare, Bell, ShoppingCart, PenTool, Globe, Settings } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface DetectedIssue {
  type: string;
  text: string;
  line: number;
  detectedLanguage: "fr" | "en" | "mixed" | "unknown";
  suggestedKey: string;
  suggestedFr: string;
  suggestedEn: string;
  fix: string;
  context: string;
}

interface AnalysisResult {
  issues: DetectedIssue[];
  summary: { total: number; fr: number; en: number; mixed: number };
  correctedCode: string;
  translationsFr: Record<string, unknown>;
  translationsEn: Record<string, unknown>;
}

interface AuditRecord {
  id: string;
  file_path: string | null;
  code_snippet: string | null;
  issues: unknown[];
  corrected_code: string | null;
  translations_fr: Record<string, unknown> | null;
  translations_en: Record<string, unknown> | null;
  total_issues: number;
  fr_count: number;
  en_count: number;
  mixed_count: number;
  created_at: string;
}

interface FileCategory {
  name: string;
  icon: React.ReactNode;
  files: { path: string; name: string }[];
}

// Comprehensive file registry organized by category - VERIFIED EXISTING FILES ONLY
const FILE_REGISTRY: FileCategory[] = [
  {
    name: "📄 Pages",
    icon: <Layout className="h-4 w-4" />,
    files: [
      { path: "src/pages/Index.tsx", name: "Index (Homepage)" },
      { path: "src/pages/Dashboard.tsx", name: "Dashboard" },
      { path: "src/pages/Products.tsx", name: "Products" },
      { path: "src/pages/Collections.tsx", name: "Collections" },
      { path: "src/pages/ArticleManagement.tsx", name: "Article Management" },
      { path: "src/pages/Blog.tsx", name: "Blog" },
      { path: "src/pages/BlogCampaignMonitoring.tsx", name: "Blog Campaign" },
      { path: "src/pages/Pricing.tsx", name: "Pricing" },
      { path: "src/pages/SuperAdmin.tsx", name: "Super Admin" },
      { path: "src/pages/Auth.tsx", name: "Auth" },
      { path: "src/pages/Onboarding.tsx", name: "Onboarding" },
      { path: "src/pages/SEO.tsx", name: "SEO" },
      { path: "src/pages/Shopping.tsx", name: "Google Shopping" },
      { path: "src/pages/ShopifyApp.tsx", name: "Shopify App" },
      { path: "src/pages/Integration.tsx", name: "Integration" },
      { path: "src/pages/ProductDetail.tsx", name: "Product Detail" },
      { path: "src/pages/Chat.tsx", name: "Chat" },
    ]
  },
  {
    name: "✍️ Blog & Content",
    icon: <PenTool className="h-4 w-4" />,
    files: [
      { path: "src/components/blog/BlogWizard.tsx", name: "Blog Wizard" },
      { path: "src/components/blog/ArticleWizard.tsx", name: "Article Wizard" },
      { path: "src/components/blog/ArticleManagement.tsx", name: "Article Management" },
      { path: "src/components/blog/ArticlePreviewDialog.tsx", name: "Article Preview Dialog" },
      { path: "src/components/blog/CampaignWizard.tsx", name: "Campaign Wizard" },
      { path: "src/components/blog/BlogOpportunities.tsx", name: "Blog Opportunities" },
      { path: "src/components/blog/QuickPress.tsx", name: "Quick Press" },
      { path: "src/components/blog/NetlinkingTable.tsx", name: "Netlinking Table" },
    ]
  },
  {
    name: "🔍 SEO Components",
    icon: <Globe className="h-4 w-4" />,
    files: [
      { path: "src/components/seo/SeoOptimization.tsx", name: "SEO Optimization" },
      { path: "src/components/seo/SeoAuditDashboard.tsx", name: "SEO Audit Dashboard" },
      { path: "src/components/seo/SeoAuditReports.tsx", name: "SEO Audit Reports" },
      { path: "src/components/seo/HomePageSeo.tsx", name: "Homepage SEO" },
      { path: "src/components/seo/HomePageSeoAudit.tsx", name: "Homepage SEO Audit" },
      { path: "src/components/seo/GoogleSearchPreview.tsx", name: "Google Search Preview" },
      { path: "src/components/seo/GoogleShopping.tsx", name: "Google Shopping" },
      { path: "src/components/seo/GoogleMerchant.tsx", name: "Google Merchant" },
      { path: "src/components/seo/SmartPricingAI.tsx", name: "Smart Pricing AI" },
      { path: "src/components/seo/TagOptimization.tsx", name: "Tag Optimization" },
      { path: "src/components/seo/CollectionOptimization.tsx", name: "Collection Optimization" },
      { path: "src/components/seo/PageOptimization.tsx", name: "Page Optimization" },
      { path: "src/components/seo/SeoAltImage.tsx", name: "SEO Alt Image" },
      { path: "src/components/seo/SeoAltImageList.tsx", name: "SEO Alt Image List" },
    ]
  },
  {
    name: "🎨 Dashboard Components",
    icon: <Sparkles className="h-4 w-4" />,
    files: [
      { path: "src/components/dashboard/MetricCard.tsx", name: "Metric Card" },
      { path: "src/components/dashboard/QuickActionCard.tsx", name: "Quick Action Card" },
      { path: "src/components/dashboard/UsageWidget.tsx", name: "Usage Widget" },
      { path: "src/components/dashboard/UsageLimits.tsx", name: "Usage Limits" },
      { path: "src/components/dashboard/SubscriptionManagement.tsx", name: "Subscription Management" },
      { path: "src/components/dashboard/ShopifyConnection.tsx", name: "Shopify Connection" },
      { path: "src/components/dashboard/AIRecommendations.tsx", name: "AI Recommendations" },
      { path: "src/components/dashboard/SeoScoreGauge.tsx", name: "SEO Score Gauge" },
      { path: "src/components/dashboard/AccountSettings.tsx", name: "Account Settings" },
    ]
  },
  {
    name: "🔗 Integration Components",
    icon: <FolderOpen className="h-4 w-4" />,
    files: [
      { path: "src/components/integration/ShopifyConnectionWizard.tsx", name: "Shopify Connection Wizard" },
      { path: "src/components/integration/ShopifyConnectionDialog.tsx", name: "Shopify Connection Dialog" },
      { path: "src/components/integration/ShopifyIntegrationTabs.tsx", name: "Shopify Integration Tabs" },
      { path: "src/components/integration/ShopifySyncSettings.tsx", name: "Shopify Sync Settings" },
      { path: "src/components/integration/SyncProgressDialog.tsx", name: "Sync Progress Dialog" },
      { path: "src/components/integration/SyncResultDialog.tsx", name: "Sync Result Dialog" },
    ]
  },
  {
    name: "🎬 Landing Pages",
    icon: <Layout className="h-4 w-4" />,
    files: [
      { path: "src/components/landing/LandingPagePreview.tsx", name: "Landing Page Preview" },
      { path: "src/components/landing/LandingPageVisionShowcase.tsx", name: "Landing Vision Showcase" },
      { path: "src/components/landing/PreferencesConfigurator.tsx", name: "Preferences Configurator" },
    ]
  },
  {
    name: "💳 Pricing Components",
    icon: <ShoppingCart className="h-4 w-4" />,
    files: [
      { path: "src/components/pricing/PricingCard.tsx", name: "Pricing Card" },
    ]
  },
  {
    name: "⚙️ Admin Components",
    icon: <Settings className="h-4 w-4" />,
    files: [
      { path: "src/components/admin/EmailInbox.tsx", name: "Email Inbox" },
      { path: "src/components/admin/SystemStatusDashboard.tsx", name: "System Status Dashboard" },
      { path: "src/components/admin/SystemEventLogs.tsx", name: "System Event Logs" },
      { path: "src/components/admin/AdminToolbox.tsx", name: "Admin Toolbox" },
      { path: "src/components/admin/GoogleAdsAdmin.tsx", name: "Google Ads Admin" },
      { path: "src/components/admin/EmailTemplates.tsx", name: "Email Templates" },
      { path: "src/components/admin/UserInsightPanel.tsx", name: "User Insight Panel" },
    ]
  }
];

export default function AutoTranslationScanner() {
  const [activeTab, setActiveTab] = useState("files");
  const [code, setCode] = useState("");
  const [fileName, setFileName] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [history, setHistory] = useState<AuditRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [stats, setStats] = useState({ total: 0, fr: 0, en: 0, mixed: 0, scans: 0 });
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["📄 Pages"]);
  const [selectedFile, setSelectedFile] = useState<{ path: string; name: string } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Load history
  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("translation_audit_results")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      
      const records: AuditRecord[] = (data || []).map(record => ({
        id: record.id,
        file_path: record.file_path,
        code_snippet: record.code_snippet,
        issues: Array.isArray(record.issues) ? record.issues : [],
        corrected_code: record.corrected_code,
        translations_fr: typeof record.translations_fr === 'object' ? record.translations_fr as Record<string, unknown> : {},
        translations_en: typeof record.translations_en === 'object' ? record.translations_en as Record<string, unknown> : {},
        total_issues: record.total_issues || 0,
        fr_count: record.fr_count || 0,
        en_count: record.en_count || 0,
        mixed_count: record.mixed_count || 0,
        created_at: record.created_at,
      }));
      
      setHistory(records);

      // Calculate stats
      const totalIssues = records.reduce((sum, r) => sum + (r.total_issues || 0), 0);
      const frIssues = records.reduce((sum, r) => sum + (r.fr_count || 0), 0);
      const enIssues = records.reduce((sum, r) => sum + (r.en_count || 0), 0);
      const mixedIssues = records.reduce((sum, r) => sum + (r.mixed_count || 0), 0);
      
      setStats({
        total: totalIssues,
        fr: frIssues,
        en: enIssues,
        mixed: mixedIssues,
        scans: records.length,
      });
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleFileClick = async (file: { path: string; name: string }) => {
    setSelectedFile(file);
    setFileName(file.path);
    setCode("");
    setResult(null);
    setIsDialogOpen(true);
    
    // Auto-fetch file content from GitHub
    try {
      toast.info(`Chargement de ${file.name}...`);
      const { data, error } = await supabase.functions.invoke("fetch-file-content", {
        body: { filePath: file.path }
      });
      
      if (error) throw error;
      
      if (data?.content) {
        setCode(data.content);
        toast.success(`${file.name} chargé ! Cliquez sur Analyser.`);
      } else {
        toast.error("Fichier vide ou non trouvé");
      }
    } catch (error) {
      console.error("Error fetching file:", error);
      toast.error("Impossible de charger le fichier automatiquement. Collez le code manuellement.");
    }
  };

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryName) 
        ? prev.filter(c => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  const getFileStatus = (filePath: string) => {
    const record = history.find(r => r.file_path === filePath);
    if (!record) return null;
    return {
      issues: record.total_issues,
      status: "scanned",
      lastScanned: record.created_at
    };
  };

  // Analyze code with AI
  const analyzeCode = async () => {
    if (!code.trim()) {
      toast.error("Veuillez coller du code à analyser");
      return;
    }

    setIsAnalyzing(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("scan-translation-issues", {
        body: { code, fileName: fileName || "unknown.tsx" },
      });

      if (error) throw error;

      setResult(data);

      // Save to history
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("translation_audit_results").insert({
          user_id: user.id,
          file_path: fileName || null,
          code_snippet: code.substring(0, 5000),
          issues: data.issues,
          corrected_code: data.correctedCode?.substring(0, 50000),
          translations_fr: data.translationsFr,
          translations_en: data.translationsEn,
          total_issues: data.summary?.total || 0,
          fr_count: data.summary?.fr || 0,
          en_count: data.summary?.en || 0,
          mixed_count: data.summary?.mixed || 0,
        });
        
        loadHistory();
      }

      if (data.issues?.length > 0) {
        toast.success(`${data.issues.length} problème(s) de traduction détecté(s)`);
      } else {
        toast.success("Aucun problème de traduction détecté !");
      }
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Erreur lors de l'analyse");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      toast.success("Copié !");
    } catch {
      toast.error("Erreur de copie");
    }
  };

  // Delete history item
  const deleteHistoryItem = async (id: string) => {
    try {
      await supabase.from("translation_audit_results").delete().eq("id", id);
      setHistory(prev => prev.filter(h => h.id !== id));
      toast.success("Supprimé");
    } catch {
      toast.error("Erreur de suppression");
    }
  };

  // Language badge
  const getLanguageBadge = (lang: string) => {
    switch (lang) {
      case "fr":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">🇫🇷 FR</Badge>;
      case "en":
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">🇬🇧 EN</Badge>;
      case "mixed":
        return <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/30">🔄 Mix</Badge>;
      default:
        return <Badge variant="outline" className="bg-muted text-muted-foreground">❓</Badge>;
    }
  };

  // Type badge
  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      toast: "bg-green-500/10 text-green-500 border-green-500/30",
      dialog: "bg-purple-500/10 text-purple-500 border-purple-500/30",
      button: "bg-blue-500/10 text-blue-500 border-blue-500/30",
      prop: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
      jsx_text: "bg-pink-500/10 text-pink-500 border-pink-500/30",
      error: "bg-red-500/10 text-red-500 border-red-500/30",
      alert: "bg-orange-500/10 text-orange-500 border-orange-500/30",
    };
    return <Badge variant="outline" className={colors[type] || "bg-muted"}>{type}</Badge>;
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Languages className="h-5 w-5 text-primary" />
          Scanner de Traductions IA
        </CardTitle>
        <CardDescription>
          Cliquez sur un fichier pour analyser ses textes en dur avec l'IA
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="files" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Fichiers
            </TabsTrigger>
            <TabsTrigger value="analyze" className="flex items-center gap-2">
              <Wand2 className="h-4 w-4" />
              Analyse
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Historique
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Stats
            </TabsTrigger>
          </TabsList>

          {/* Files Tab - Main feature */}
          <TabsContent value="files" className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              Cliquez sur un fichier pour analyser ses textes en dur. Le scanner détectera automatiquement 
              les toasts, dialogs, boutons et autres textes à traduire.
            </p>
            
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-2">
                {FILE_REGISTRY.map((category) => (
                  <Collapsible 
                    key={category.name}
                    open={expandedCategories.includes(category.name)}
                    onOpenChange={() => toggleCategory(category.name)}
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        {category.icon}
                        <span className="font-medium">{category.name}</span>
                        <Badge variant="secondary" className="ml-2">
                          {category.files.length}
                        </Badge>
                      </div>
                      {expandedCategories.includes(category.name) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      <div className="grid gap-1 pl-4">
                        {category.files.map((file) => {
                          const status = getFileStatus(file.path);
                          return (
                            <button
                              key={file.path}
                              onClick={() => handleFileClick(file)}
                              className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors text-left w-full group"
                            >
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                                <span className="text-sm">{file.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {status ? (
                                  <>
                                    {status.issues > 0 ? (
                                      <Badge variant="destructive" className="text-xs">
                                        {status.issues} issues
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-green-500/20 text-green-500 text-xs">
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        OK
                                      </Badge>
                                    )}
                                  </>
                                ) : (
                                  <Badge variant="outline" className="text-xs">
                                    Non scanné
                                  </Badge>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* AI Analysis Tab */}
          <TabsContent value="analyze" className="space-y-4">
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Nom du fichier (ex: BlogWizard.tsx)"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
              />
              <textarea
                placeholder={`Collez votre code React/TypeScript ici...\n\nExemples de textes détectés:\n- toast.success("Opération réussie")\n- <Button>Enregistrer</Button>\n- placeholder="Entrez votre email"`}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full min-h-[200px] p-3 font-mono text-sm bg-muted rounded-lg border border-border resize-y"
              />
              <div className="flex gap-2">
                <Button onClick={analyzeCode} disabled={isAnalyzing} className="flex-1">
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyse IA en cours...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Analyser avec Gemini AI
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => { setCode(""); setFileName(""); setResult(null); }}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>
            </div>

            {result && (
              <div className="space-y-4 mt-6">
                {/* Summary */}
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 flex-wrap">
                  <div className="flex items-center gap-2">
                    {result.summary.total === 0 ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    )}
                    <span className="font-medium">
                      {result.summary.total} problème(s) détecté(s)
                    </span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-500">🇫🇷 {result.summary.fr}</Badge>
                    <Badge variant="outline" className="bg-red-500/10 text-red-500">🇬🇧 {result.summary.en}</Badge>
                    <Badge variant="outline" className="bg-orange-500/10 text-orange-500">🔄 {result.summary.mixed}</Badge>
                  </div>
                </div>

                {/* Issues List */}
                {result.issues.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        Problèmes détectés
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-3">
                          {result.issues.map((issue, idx) => (
                            <div key={idx} className="p-3 rounded-lg bg-muted/30 border border-border space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                {getTypeBadge(issue.type)}
                                {getLanguageBadge(issue.detectedLanguage)}
                                <span className="text-xs text-muted-foreground">
                                  Ligne {issue.line}
                                </span>
                              </div>
                              <p className="font-medium text-destructive">"{issue.text}"</p>
                              <div className="text-xs space-y-1 pt-2 border-t border-border">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Sparkles className="h-4 w-4 text-primary" />
                                  <span className="text-muted-foreground">Clé:</span>
                                  <code className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono text-xs">t.{issue.suggestedKey}</code>
                                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(`{t.${issue.suggestedKey}}`, `key-${idx}`)} className="h-6 px-2">
                                    {copiedField === `key-${idx}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                  </Button>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                  <div className="bg-blue-500/10 p-2 rounded text-xs">
                                    <span className="font-medium text-blue-600">🇫🇷 FR:</span> {issue.suggestedFr}
                                  </div>
                                  <div className="bg-red-500/10 p-2 rounded text-xs">
                                    <span className="font-medium text-red-600">🇬🇧 EN:</span> {issue.suggestedEn}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}

                {/* Corrected Code */}
                {result.correctedCode && (
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Wand2 className="h-5 w-5 text-green-500" />
                          Code Corrigé
                        </CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(result.correctedCode, "code")}
                        >
                          {copiedField === "code" ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                          Copier
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[200px]">
                        <pre className="text-xs font-mono bg-muted p-4 rounded-lg whitespace-pre-wrap">{result.correctedCode}</pre>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}

                {/* Translations JSON */}
                {(Object.keys(result.translationsFr).length > 0 || Object.keys(result.translationsEn).length > 0) && (
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileCode className="h-5 w-5 text-purple-500" />
                          Traductions à Ajouter
                        </CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(
                            `// FR:\n${JSON.stringify(result.translationsFr, null, 2)}\n\n// EN:\n${JSON.stringify(result.translationsEn, null, 2)}`,
                            "translations"
                          )}
                        >
                          {copiedField === "translations" ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                          Copier tout
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium mb-2 text-blue-600">🇫🇷 Français</h4>
                          <ScrollArea className="h-[150px]">
                            <pre className="text-xs font-mono bg-blue-500/10 p-3 rounded-lg">{JSON.stringify(result.translationsFr, null, 2)}</pre>
                          </ScrollArea>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium mb-2 text-red-600">🇬🇧 English</h4>
                          <ScrollArea className="h-[150px]">
                            <pre className="text-xs font-mono bg-red-500/10 p-3 rounded-lg">{JSON.stringify(result.translationsEn, null, 2)}</pre>
                          </ScrollArea>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {history.length} analyse(s) enregistrée(s)
              </p>
              <Button variant="outline" size="sm" onClick={loadHistory} disabled={isLoadingHistory}>
                {isLoadingHistory ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            </div>
            
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {history.map((record) => (
                  <Card key={record.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileCode className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{record.file_path || "Code sans nom"}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(record.created_at).toLocaleString("fr-FR")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {record.total_issues > 0 ? (
                          <Badge variant="destructive">{record.total_issues} issues</Badge>
                        ) : (
                          <Badge className="bg-green-500/20 text-green-500">OK</Badge>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => deleteHistoryItem(record.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    {record.total_issues > 0 && (
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 text-xs">
                          {record.fr_count} FR
                        </Badge>
                        <Badge variant="outline" className="bg-red-500/10 text-red-500 text-xs">
                          {record.en_count} EN
                        </Badge>
                        <Badge variant="outline" className="bg-orange-500/10 text-orange-500 text-xs">
                          {record.mixed_count} Mix
                        </Badge>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="p-4 text-center">
                <div className="text-3xl font-bold text-primary">{stats.scans}</div>
                <div className="text-sm text-muted-foreground">Fichiers scannés</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-3xl font-bold text-destructive">{stats.total}</div>
                <div className="text-sm text-muted-foreground">Total issues</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-3xl font-bold text-blue-500">{stats.fr}</div>
                <div className="text-sm text-muted-foreground">Textes FR</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-3xl font-bold text-red-500">{stats.en}</div>
                <div className="text-sm text-muted-foreground">Textes EN</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-3xl font-bold text-orange-500">{stats.mixed}</div>
                <div className="text-sm text-muted-foreground">Mixed</div>
              </Card>
            </div>

            {/* Top problematic files */}
            <Card className="p-4">
              <h4 className="font-medium mb-4">Fichiers les plus problématiques</h4>
              <div className="space-y-2">
                {history
                  .filter(r => r.total_issues > 0)
                  .sort((a, b) => b.total_issues - a.total_issues)
                  .slice(0, 10)
                  .map((record, idx) => (
                    <div 
                      key={record.id}
                      className="flex items-center justify-between p-2 rounded bg-muted/30"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-sm">#{idx + 1}</span>
                        <span className="text-sm font-mono">{record.file_path}</span>
                      </div>
                      <Badge variant="destructive">{record.total_issues}</Badge>
                    </div>
                  ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* File Analysis Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileCode className="h-5 w-5" />
                Analyser: {selectedFile?.name}
              </DialogTitle>
              <DialogDescription>
                Collez le contenu de <code className="bg-muted px-1 rounded">{selectedFile?.path}</code> pour lancer l'analyse
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Collez ici le code du fichier..."
                className="w-full min-h-[300px] p-3 font-mono text-sm bg-muted rounded-lg border border-border resize-y"
              />
              
              <Button 
                onClick={async () => {
                  await analyzeCode();
                  if (result || !isAnalyzing) {
                    setIsDialogOpen(false);
                    setActiveTab("analyze");
                  }
                }}
                disabled={isAnalyzing || !code.trim()}
                className="w-full"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyse IA en cours...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analyser avec Gemini 2.5 Flash
                  </>
                )}
              </Button>

              {result && result.issues.length > 0 && (
                <Card className="p-4 border-yellow-500/50">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    <span className="font-medium">{result.issues.length} problème(s) détecté(s)</span>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsDialogOpen(false);
                      setActiveTab("analyze");
                    }}
                  >
                    Voir les détails
                  </Button>
                </Card>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
