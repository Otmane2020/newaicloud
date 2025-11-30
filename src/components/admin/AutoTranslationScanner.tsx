import React, { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Loader2, History, BarChart3, Copy, Check, Trash2, AlertTriangle, CheckCircle, 
  Wand2, Languages, Sparkles, RefreshCw, ChevronDown, ChevronRight, FileText, 
  FolderOpen, Layout, Settings, PenTool, Globe, ShoppingCart 
} from "lucide-react";
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
  files: string[];
}

// Registry of important files to scan - COMPREHENSIVE LIST
const FILE_REGISTRY: FileCategory[] = [
  {
    name: "Pages Principales",
    icon: <Layout className="h-4 w-4" />,
    files: [
      "src/pages/Index.tsx",
      "src/pages/Dashboard.tsx",
      "src/pages/Products.tsx",
      "src/pages/Collections.tsx",
      "src/pages/Articles.tsx",
      "src/pages/ArticleManagement.tsx",
      "src/pages/Settings.tsx",
      "src/pages/Pricing.tsx",
      "src/pages/Auth.tsx",
      "src/pages/Onboarding.tsx",
      "src/pages/SuperAdmin.tsx",
      "src/pages/LandingPages.tsx",
      "src/pages/Blog.tsx",
      "src/pages/Demo.tsx",
      "src/pages/ShopifyApp.tsx",
      "src/pages/NotFound.tsx",
    ],
  },
  {
    name: "Blog Components",
    icon: <PenTool className="h-4 w-4" />,
    files: [
      "src/components/blog/BlogWizard.tsx",
      "src/components/blog/BlogOpportunities.tsx",
      "src/components/blog/BlogCampaignMonitoring.tsx",
      "src/components/blog/OpportunitiesSettings.tsx",
      "src/components/blog/ArticleEditor.tsx",
      "src/components/blog/ArticlePreview.tsx",
      "src/components/blog/CampaignWizard.tsx",
    ],
  },
  {
    name: "SEO Components",
    icon: <Globe className="h-4 w-4" />,
    files: [
      "src/components/seo/SeoAuditReport.tsx",
      "src/components/seo/ProductSeoTab.tsx",
      "src/components/seo/CollectionSeoTab.tsx",
      "src/components/seo/HomePageSeo.tsx",
      "src/components/seo/SeoAuditAI.tsx",
      "src/components/seo/PageSeoTab.tsx",
      "src/components/seo/ArticleSeoTab.tsx",
      "src/components/seo/SeoScoreDisplay.tsx",
    ],
  },
  {
    name: "Shopify Components",
    icon: <ShoppingCart className="h-4 w-4" />,
    files: [
      "src/components/shopify/ShopifyConnectionWizard.tsx",
      "src/components/shopify/ShopifyInstallGuide.tsx",
      "src/components/shopify/StoreSelector.tsx",
      "src/components/shopify/ShopifySync.tsx",
      "src/components/shopify/AutoSyncProgressDialog.tsx",
    ],
  },
  {
    name: "Dashboard Components",
    icon: <BarChart3 className="h-4 w-4" />,
    files: [
      "src/components/dashboard/DashboardStats.tsx",
      "src/components/dashboard/QuickActions.tsx",
      "src/components/dashboard/SyncStatus.tsx",
      "src/components/dashboard/RecentActivity.tsx",
      "src/components/dashboard/QuotaMonitoring.tsx",
    ],
  },
  {
    name: "Settings Components",
    icon: <Settings className="h-4 w-4" />,
    files: [
      "src/components/settings/GeneralSettings.tsx",
      "src/components/settings/AutomationSettings.tsx",
      "src/components/settings/NotificationSettings.tsx",
      "src/components/settings/SubscriptionSettings.tsx",
      "src/components/settings/ApiSettings.tsx",
    ],
  },
  {
    name: "Dialogs & Modals",
    icon: <AlertTriangle className="h-4 w-4" />,
    files: [
      "src/components/ui/dialog.tsx",
      "src/components/ui/alert-dialog.tsx",
      "src/components/dialogs/ConfirmDialog.tsx",
      "src/components/dialogs/ExportDialog.tsx",
      "src/components/dialogs/ImportDialog.tsx",
    ],
  },
  {
    name: "Admin Components",
    icon: <Settings className="h-4 w-4" />,
    files: [
      "src/components/admin/AdminDashboard.tsx",
      "src/components/admin/UserManagement.tsx",
      "src/components/admin/SystemHealthCheck.tsx",
      "src/components/admin/EmailInbox.tsx",
      "src/components/admin/SubscriptionManager.tsx",
      "src/components/admin/AutoTranslationScanner.tsx",
    ],
  },
  {
    name: "Landing Components",
    icon: <Sparkles className="h-4 w-4" />,
    files: [
      "src/components/landing/HeroSection.tsx",
      "src/components/landing/FeaturesSection.tsx",
      "src/components/landing/PricingSection.tsx",
      "src/components/landing/TestimonialsSection.tsx",
      "src/components/landing/FooterSection.tsx",
      "src/components/landing/CTASection.tsx",
    ],
  },
  {
    name: "Pricing Components",
    icon: <BarChart3 className="h-4 w-4" />,
    files: [
      "src/components/pricing/PricingCard.tsx",
      "src/components/pricing/PricingComparison.tsx",
      "src/components/pricing/UpgradeDialog.tsx",
      "src/components/pricing/CheckoutButton.tsx",
    ],
  },
  {
    name: "Chat Components",
    icon: <PenTool className="h-4 w-4" />,
    files: [
      "src/components/chat/ChatWidget.tsx",
      "src/components/chat/ChatMessages.tsx",
      "src/components/chat/ChatInput.tsx",
      "src/components/chat/ChatSettings.tsx",
    ],
  },
  {
    name: "Integration Components",
    icon: <Globe className="h-4 w-4" />,
    files: [
      "src/components/integration/GoogleAdsIntegration.tsx",
      "src/components/integration/GoogleMerchantIntegration.tsx",
      "src/components/integration/GoogleSearchConsoleIntegration.tsx",
      "src/components/integration/StripeIntegration.tsx",
    ],
  },
  {
    name: "Product Components",
    icon: <ShoppingCart className="h-4 w-4" />,
    files: [
      "src/components/products/ProductCard.tsx",
      "src/components/products/ProductList.tsx",
      "src/components/products/ProductFilters.tsx",
      "src/components/products/BulkActions.tsx",
      "src/components/products/SmartBackgroundGenerator.tsx",
    ],
  },
  {
    name: "Toasts & Notifications",
    icon: <AlertTriangle className="h-4 w-4" />,
    files: [
      "src/hooks/use-toast.ts",
      "src/components/ui/toast.tsx",
      "src/components/ui/toaster.tsx",
      "src/components/notifications/NotificationCenter.tsx",
    ],
  },
  {
    name: "Forms & Inputs",
    icon: <PenTool className="h-4 w-4" />,
    files: [
      "src/components/ui/input.tsx",
      "src/components/ui/textarea.tsx",
      "src/components/ui/select.tsx",
      "src/components/forms/LoginForm.tsx",
      "src/components/forms/SignupForm.tsx",
    ],
  },
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
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["Pages"]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
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

  // Toggle category expansion
  const toggleCategory = (name: string) => {
    setExpandedCategories(prev => 
      prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]
    );
  };

  // Handle file click - open dialog to paste content
  const handleFileClick = (filePath: string) => {
    setSelectedFile(filePath);
    setFileName(filePath);
    setCode("");
    setResult(null);
    setIsDialogOpen(true);
  };

  // Get file status from history
  const getFileStatus = (filePath: string) => {
    const record = history.find(h => h.file_path === filePath);
    if (!record) return null;
    return {
      issues: record.total_issues,
      date: new Date(record.created_at).toLocaleDateString(),
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
          Sélectionnez un fichier à scanner ou collez du code manuellement
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

          {/* Files Tab */}
          <TabsContent value="files" className="space-y-2">
            <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground mb-4">
              <p>📁 Cliquez sur un fichier pour l'analyser. Vous devrez coller son contenu depuis votre IDE.</p>
            </div>
            <ScrollArea className="h-[400px]">
              {FILE_REGISTRY.map((category) => (
                <Collapsible
                  key={category.name}
                  open={expandedCategories.includes(category.name)}
                  onOpenChange={() => toggleCategory(category.name)}
                >
                  <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 hover:bg-muted rounded-lg transition-colors">
                    {expandedCategories.includes(category.name) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    {category.icon}
                    <span className="font-medium">{category.name}</span>
                    <Badge variant="secondary" className="ml-auto">
                      {category.files.length}
                    </Badge>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-8 space-y-1">
                    {category.files.map((file) => {
                      const status = getFileStatus(file);
                      return (
                        <button
                          key={file}
                          onClick={() => handleFileClick(file)}
                          className="flex items-center gap-2 w-full p-2 text-left hover:bg-muted rounded-lg transition-colors text-sm"
                        >
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="flex-1 truncate">{file.split('/').pop()}</span>
                          {status && (
                            <div className="flex items-center gap-2">
                              {status.issues === 0 ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <Badge variant="destructive" className="text-xs">
                                  {status.issues}
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">{status.date}</span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              ))}
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
                        <div className="flex gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => {
                              setCode(result.correctedCode);
                              toast.success("Code remplacé ! Copiez-le dans votre IDE.");
                            }}
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Appliquer Fix
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(result.correctedCode, "code")}
                          >
                            {copiedField === "code" ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                            Copier
                          </Button>
                        </div>
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
                          <Languages className="h-5 w-5 text-purple-500" />
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
          <TabsContent value="history">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">Analyses récentes</h3>
              <Button variant="outline" size="sm" onClick={loadHistory} disabled={isLoadingHistory}>
                {isLoadingHistory ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            </div>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {history.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Aucune analyse enregistrée
                  </p>
                ) : (
                  history.map((record) => (
                    <div
                      key={record.id}
                      className="p-3 rounded-lg bg-muted/30 border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm truncate max-w-[200px]">
                            {record.file_path || "Code manuel"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {record.total_issues === 0 ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Badge variant="destructive">{record.total_issues}</Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteHistoryItem(record.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2 text-xs">
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-500">🇫🇷 {record.fr_count}</Badge>
                        <Badge variant="outline" className="bg-red-500/10 text-red-500">🇬🇧 {record.en_count}</Badge>
                        <Badge variant="outline" className="bg-orange-500/10 text-orange-500">🔄 {record.mixed_count}</Badge>
                        <span className="text-muted-foreground ml-auto">
                          {new Date(record.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{stats.scans}</div>
                  <p className="text-xs text-muted-foreground">Scans effectués</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-yellow-500">{stats.total}</div>
                  <p className="text-xs text-muted-foreground">Problèmes détectés</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-blue-500">{stats.fr}</div>
                  <p className="text-xs text-muted-foreground">Textes FR</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-red-500">{stats.en}</div>
                  <p className="text-xs text-muted-foreground">Textes EN</p>
                </CardContent>
              </Card>
            </div>
            
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">Répartition par type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Français uniquement</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500" 
                          style={{ width: `${stats.total > 0 ? (stats.fr / stats.total) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-12 text-right">
                        {stats.total > 0 ? Math.round((stats.fr / stats.total) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Anglais uniquement</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-red-500" 
                          style={{ width: `${stats.total > 0 ? (stats.en / stats.total) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-12 text-right">
                        {stats.total > 0 ? Math.round((stats.en / stats.total) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Mixte</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-orange-500" 
                          style={{ width: `${stats.total > 0 ? (stats.mixed / stats.total) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-12 text-right">
                        {stats.total > 0 ? Math.round((stats.mixed / stats.total) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* File Analysis Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Analyser: {selectedFile?.split('/').pop()}
            </DialogTitle>
            <DialogDescription>
              Copiez le contenu du fichier depuis votre IDE et collez-le ci-dessous
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-4">
            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              <p className="text-muted-foreground">
                📋 <strong>Fichier:</strong> <code className="bg-background px-2 py-1 rounded">{selectedFile}</code>
              </p>
            </div>
            
            {!result && (
              <>
                <textarea
                  placeholder="Collez le contenu du fichier ici..."
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="min-h-[200px] w-full p-3 font-mono text-sm bg-muted rounded-lg border border-border resize-y"
                />
                
                <div className="flex gap-2">
                  <Button onClick={analyzeCode} disabled={isAnalyzing || !code.trim()} className="flex-1">
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyse en cours...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Analyser avec l'IA
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Fermer
                  </Button>
                </div>
              </>
            )}

            {/* Full Results Display - Same as Analyse tab */}
            {result && (
              <div className="space-y-4">
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
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setResult(null)}
                    className="ml-auto"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Nouvelle analyse
                  </Button>
                </div>

                {/* Issues List */}
                {result.issues.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        Problèmes détectés ({result.issues.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[250px]">
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
                                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(`{t.${issue.suggestedKey}}`, `dialog-key-${idx}`)} className="h-6 px-2">
                                    {copiedField === `dialog-key-${idx}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
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
                        <div className="flex gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => copyToClipboard(result.correctedCode, "dialog-fixed-code")}
                          >
                            {copiedField === "dialog-fixed-code" ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                            Copier le code corrigé
                          </Button>
                        </div>
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
                          <Languages className="h-5 w-5 text-purple-500" />
                          Traductions à Ajouter
                        </CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(
                            `// FR:\n${JSON.stringify(result.translationsFr, null, 2)}\n\n// EN:\n${JSON.stringify(result.translationsEn, null, 2)}`,
                            "dialog-translations"
                          )}
                        >
                          {copiedField === "dialog-translations" ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                          Copier tout
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium mb-2 text-blue-600">🇫🇷 Français</h4>
                          <ScrollArea className="h-[120px]">
                            <pre className="text-xs font-mono bg-blue-500/10 p-3 rounded-lg">{JSON.stringify(result.translationsFr, null, 2)}</pre>
                          </ScrollArea>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium mb-2 text-red-600">🇬🇧 English</h4>
                          <ScrollArea className="h-[120px]">
                            <pre className="text-xs font-mono bg-red-500/10 p-3 rounded-lg">{JSON.stringify(result.translationsEn, null, 2)}</pre>
                          </ScrollArea>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Close button */}
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => { setIsDialogOpen(false); setResult(null); }}>
                    Fermer
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
