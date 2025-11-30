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

// Registry of important files to scan - COMPREHENSIVE LIST (190+ toasts, 92+ dialogs)
const FILE_REGISTRY: FileCategory[] = [
  {
    name: "Pages (77 fichiers)",
    icon: <Layout className="h-4 w-4" />,
    files: [
      "src/pages/Index.tsx",
      "src/pages/Dashboard.tsx",
      "src/pages/Products.tsx",
      "src/pages/Collections.tsx",
      "src/pages/ArticleManagement.tsx",
      "src/pages/Settings.tsx",
      "src/pages/Pricing.tsx",
      "src/pages/Auth.tsx",
      "src/pages/Onboarding.tsx",
      "src/pages/SuperAdmin.tsx",
      "src/pages/Blog.tsx",
      "src/pages/Demo.tsx",
      "src/pages/ShopifyApp.tsx",
      "src/pages/Account.tsx",
      "src/pages/Admin.tsx",
      "src/pages/ApiAnalytics.tsx",
      "src/pages/ApiDocs.tsx",
      "src/pages/ApiKeys.tsx",
      "src/pages/ArticleLanding.tsx",
      "src/pages/BlogCampaignMonitoring.tsx",
      "src/pages/BlogNewAI.tsx",
      "src/pages/BlogSeoManagement.tsx",
      "src/pages/Chat.tsx",
      "src/pages/ChatHistory.tsx",
      "src/pages/ChatLearning.tsx",
      "src/pages/ChatOrders.tsx",
      "src/pages/ChatSettings.tsx",
      "src/pages/CronMonitoring.tsx",
      "src/pages/GoogleAds.tsx",
      "src/pages/Integration.tsx",
      "src/pages/LandingConfigurator.tsx",
      "src/pages/LandingPreferences.tsx",
      "src/pages/MediaHistory.tsx",
      "src/pages/Merchant.tsx",
      "src/pages/NotificationSettings.tsx",
      "src/pages/NotificationTemplates.tsx",
      "src/pages/PaymentSuccess.tsx",
      "src/pages/ProductDetail.tsx",
      "src/pages/ProductEnrichment.tsx",
      "src/pages/ProductLanding.tsx",
      "src/pages/ProductSource.tsx",
      "src/pages/ProductTitleDescription.tsx",
      "src/pages/SEO.tsx",
      "src/pages/SearchImage.tsx",
      "src/pages/SearchProducts.tsx",
      "src/pages/SeoSerpAnalysis.tsx",
      "src/pages/ShopifyInstall.tsx",
      "src/pages/ShopifyInstallGuide.tsx",
      "src/pages/ShopifySuccess.tsx",
      "src/pages/ShopifyWebhooksAdmin.tsx",
      "src/pages/Shopping.tsx",
      "src/pages/Subscription.tsx",
      "src/pages/TranslationAudit.tsx",
      "src/pages/UpgradeSuccess.tsx",
      "src/pages/UsageAudit.tsx",
    ],
  },
  {
    name: "Admin Components (20 fichiers)",
    icon: <Settings className="h-4 w-4" />,
    files: [
      "src/components/admin/AdminSmartSearch.tsx",
      "src/components/admin/AdminToolbox.tsx",
      "src/components/admin/AdvancedAnalytics.tsx",
      "src/components/admin/BlogSeoManagementAdmin.tsx",
      "src/components/admin/CodeTranslationAnalyzer.tsx",
      "src/components/admin/EmailInbox.tsx",
      "src/components/admin/EmailSidebar.tsx",
      "src/components/admin/EmailStatsDashboard.tsx",
      "src/components/admin/EmailTemplates.tsx",
      "src/components/admin/GoogleAdsAdmin.tsx",
      "src/components/admin/SystemEventLogs.tsx",
      "src/components/admin/SystemStatusDashboard.tsx",
      "src/components/admin/TemplateDialog.tsx",
      "src/components/admin/UserActivityHistory.tsx",
      "src/components/admin/UserInsightPanel.tsx",
      "src/components/admin/VideoAdsStudio.tsx",
    ],
  },
  {
    name: "Blog Components (16 fichiers)",
    icon: <PenTool className="h-4 w-4" />,
    files: [
      "src/components/blog/ArticleConfigDialog.tsx",
      "src/components/blog/ArticleFeaturedImageDialog.tsx",
      "src/components/blog/ArticleGenerationProgress.tsx",
      "src/components/blog/ArticleLandingPage.tsx",
      "src/components/blog/ArticleManagement.tsx",
      "src/components/blog/ArticlePreviewDialog.tsx",
      "src/components/blog/ArticleSyncDialog.tsx",
      "src/components/blog/ArticleWizard.tsx",
      "src/components/blog/BlogOpportunities.tsx",
      "src/components/blog/BlogWizard.tsx",
      "src/components/blog/CampaignCalendar.tsx",
      "src/components/blog/CampaignWizard.tsx",
      "src/components/blog/NetlinkingTable.tsx",
      "src/components/blog/OpportunitiesSettings.tsx",
      "src/components/blog/QuickPress.tsx",
      "src/components/blog/ReplaceLinkDialog.tsx",
    ],
  },
  {
    name: "SEO Components (78 fichiers)",
    icon: <Globe className="h-4 w-4" />,
    files: [
      "src/components/seo/AiBackgroundDialog.tsx",
      "src/components/seo/AiBackgroundGenerationDialog.tsx",
      "src/components/seo/AutoOptimizationDialog.tsx",
      "src/components/seo/BackgroundDialog.tsx",
      "src/components/seo/BulkLandingProgressDialog.tsx",
      "src/components/seo/CollectionImageDialog.tsx",
      "src/components/seo/CollectionOptimization.tsx",
      "src/components/seo/GenerateDescriptionDialog.tsx",
      "src/components/seo/GoogleCategoryImport.tsx",
      "src/components/seo/GoogleMerchant.tsx",
      "src/components/seo/GoogleMerchantIntegration.tsx",
      "src/components/seo/GoogleMerchantMonitoring.tsx",
      "src/components/seo/GoogleMerchantSettings.tsx",
      "src/components/seo/GoogleMerchantSyncSettings.tsx",
      "src/components/seo/GoogleSearchConsole.tsx",
      "src/components/seo/GoogleSearchConsoleArticles.tsx",
      "src/components/seo/GoogleSearchConsoleInsights.tsx",
      "src/components/seo/GoogleSearchConsoleIntegration.tsx",
      "src/components/seo/GoogleSearchConsoleKeywords.tsx",
      "src/components/seo/GoogleSearchConsolePages.tsx",
      "src/components/seo/GoogleSearchConsoleProducts.tsx",
      "src/components/seo/GoogleSearchConsoleSitemaps.tsx",
      "src/components/seo/GoogleShopping.tsx",
      "src/components/seo/GoogleShoppingSyncSettings.tsx",
      "src/components/seo/GoogleShoppingVariants.tsx",
      "src/components/seo/HomePageSeo.tsx",
      "src/components/seo/HomePageSeoAudit.tsx",
      "src/components/seo/ImageGenerationPreviewDialog.tsx",
      "src/components/seo/ImageHistoryPanel.tsx",
      "src/components/seo/ImagePriceDebugDialog.tsx",
      "src/components/seo/LandingConfigDialog.tsx",
      "src/components/seo/LandingPagePreviewDialog.tsx",
      "src/components/seo/MinimizableProgressDialog.tsx",
      "src/components/seo/OptimizationConfigDialog.tsx",
      "src/components/seo/OptimizationConfirmDialog.tsx",
      "src/components/seo/OptimizeAllDialog.tsx",
      "src/components/seo/PageOptimization.tsx",
      "src/components/seo/PageSyncDialog.tsx",
      "src/components/seo/ProductContentOptimization.tsx",
      "src/components/seo/ProductGalleryDialog.tsx",
      "src/components/seo/ProductMediaOptimization.tsx",
      "src/components/seo/ProductOptimizationTabs.tsx",
      "src/components/seo/ProductTitleLandingDialog.tsx",
      "src/components/seo/ReoptimizeConfirmDialog.tsx",
      "src/components/seo/SeoActionPlan.tsx",
      "src/components/seo/SeoAltImage.tsx",
      "src/components/seo/SeoAltImageList.tsx",
      "src/components/seo/SeoAuditAI.tsx",
      "src/components/seo/SeoAuditDashboard.tsx",
      "src/components/seo/SeoAuditReports.tsx",
      "src/components/seo/SeoAutomation.tsx",
      "src/components/seo/SeoHeroBanner.tsx",
      "src/components/seo/SeoOptimization.tsx",
      "src/components/seo/SeoTasksList.tsx",
      "src/components/seo/SeoWorkflowDialogs.tsx",
      "src/components/seo/ShopifyOptimizationGuide.tsx",
      "src/components/seo/ShopifySyncSuccessDialog.tsx",
      "src/components/seo/SingleImagePreviewDialog.tsx",
      "src/components/seo/SmartBackgroundDialog.tsx",
      "src/components/seo/SmartPricingAI.tsx",
      "src/components/seo/SmartTitle.tsx",
      "src/components/seo/SyncAllDialog.tsx",
      "src/components/seo/TagOptimization.tsx",
      "src/components/seo/VariantSelectionConfirmDialog.tsx",
      "src/components/seo/WhiteBackgroundPreviewDialog.tsx",
      "src/components/seo/WhiteBgPreviewDialog.tsx",
    ],
  },
  {
    name: "Root Components (43 fichiers)",
    icon: <FileText className="h-4 w-4" />,
    files: [
      "src/components/AIAssistant.tsx",
      "src/components/AdminLayout.tsx",
      "src/components/AnnouncementBar.tsx",
      "src/components/AppSidebar.tsx",
      "src/components/AutoSyncProgressDialog.tsx",
      "src/components/BulkOptimizationIndicator.tsx",
      "src/components/ContactForm.tsx",
      "src/components/DemoBookingDialog.tsx",
      "src/components/ErrorBoundary.tsx",
      "src/components/Footer.tsx",
      "src/components/LanguageSwitcher.tsx",
      "src/components/LimitWarningBanner.tsx",
      "src/components/Navigation.tsx",
      "src/components/NoStoreConnectedPrompt.tsx",
      "src/components/NotificationCenter.tsx",
      "src/components/NotificationPermissionPrompt.tsx",
      "src/components/OnboardingTour.tsx",
      "src/components/OptimizationCompletedDialog.tsx",
      "src/components/OptimizationCostDialog.tsx",
      "src/components/PricingComparison.tsx",
      "src/components/ProductCard.tsx",
      "src/components/ProtectedLayout.tsx",
      "src/components/PublicHeader.tsx",
      "src/components/StoreSelector.tsx",
      "src/components/SubscriptionGuard.tsx",
      "src/components/SuperAdminLayout.tsx",
      "src/components/SuperAdminNavigation.tsx",
      "src/components/TrialLimitBanner.tsx",
      "src/components/TrialLimitDialog.tsx",
      "src/components/TrialWarningBanner.tsx",
      "src/components/UpgradeDialog.tsx",
    ],
  },
  {
    name: "Ads Components",
    icon: <BarChart3 className="h-4 w-4" />,
    files: [
      "src/components/ads/GoogleAdsCampaigns.tsx",
      "src/components/ads/GoogleAdsIntegration.tsx",
      "src/components/ads/GoogleAdsOptimizer.tsx",
      "src/components/ads/GoogleAdsSearchTerms.tsx",
      "src/components/ads/LandingPageGenerator.tsx",
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
      "src/components/dashboard/AdvancedAnalyticsDashboard.tsx",
      "src/components/dashboard/AIRecommendationsSection.tsx",
      "src/components/dashboard/SEOChallengesWidget.tsx",
      "src/components/dashboard/SmartRecommendations.tsx",
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
      "src/components/chat/ChatInterface.tsx",
      "src/components/chat/KnowledgeBase.tsx",
      "src/components/chat/OrderTracking.tsx",
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
      "src/components/integration/ShopifyOAuthIntegration.tsx",
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
      "src/components/landing/BeforeAfterShowcase.tsx",
      "src/components/landing/DemoSection.tsx",
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
      "src/components/pricing/SubscriptionCard.tsx",
    ],
  },
  {
    name: "Demo Components",
    icon: <Sparkles className="h-4 w-4" />,
    files: [
      "src/components/demo/DemoReadOnlyBanner.tsx",
      "src/components/demo/DemoSeoComparison.tsx",
    ],
  },
  {
    name: "Hooks (28 fichiers)",
    icon: <Settings className="h-4 w-4" />,
    files: [
      "src/hooks/useActivityTracker.ts",
      "src/hooks/useAutoCategoryClassification.ts",
      "src/hooks/useAutoSync.ts",
      "src/hooks/useBackgroundRemoval.ts",
      "src/hooks/useDemoMode.ts",
      "src/hooks/useGoogleShoppingScore.ts",
      "src/hooks/useImageOptimization.ts",
      "src/hooks/useLandingPreferences.ts",
      "src/hooks/useNotifications.ts",
      "src/hooks/useOptimizationActions.ts",
      "src/hooks/useOptimizationConsumption.ts",
      "src/hooks/useOptimizationNotifications.ts",
      "src/hooks/useOptimizationQueue.ts",
      "src/hooks/useQuotaMonitoring.ts",
      "src/hooks/useShopifyArticlesImport.ts",
      "src/hooks/useShopifySync.ts",
      "src/hooks/useTrialLimits.ts",
      "src/hooks/useUsageLimits.ts",
    ],
  },
];

// Get all files from registry
const getAllFiles = (): string[] => {
  const allFiles: string[] = [];
  FILE_REGISTRY.forEach(category => {
    allFiles.push(...category.files);
  });
  return allFiles;
};

// Total files count
const TOTAL_FILES_COUNT = getAllFiles().length;

export default function AutoTranslationScanner() {
  const [activeTab, setActiveTab] = useState("batch");
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
  
  // Bulk scan states
  const [isBulkScanning, setIsBulkScanning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, currentFile: "" });
  const [bulkResults, setBulkResults] = useState<{
    totalToasts: number;
    totalDialogs: number;
    totalProps: number;
    totalJsxText: number;
    totalButtons: number;
    totalAlerts: number;
    filesWithIssues: number;
    filesSummary: { file: string; toasts: number; dialogs: number; total: number }[];
  } | null>(null);
  
  // Auto-fix all states
  const [isFixingAll, setIsFixingAll] = useState(false);
  const [showFixAllDialog, setShowFixAllDialog] = useState(false);
  const [aggregatedTranslations, setAggregatedTranslations] = useState<{
    fr: Record<string, unknown>;
    en: Record<string, unknown>;
    totalKeys: number;
    issueCount: number;
  } | null>(null);

  // Batch import states (legacy)
  const [batchInput, setBatchInput] = useState("");
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchAnalysisResults, setBatchAnalysisResults] = useState<{
    filesAnalyzed: number;
    totalIssues: number;
    issuesByType: Record<string, number>;
    aggregatedFr: Record<string, unknown>;
    aggregatedEn: Record<string, unknown>;
  } | null>(null);

  // NEW: Auto GitHub scan states
  const [isAutoScanning, setIsAutoScanning] = useState(false);
  const [autoScanProgress, setAutoScanProgress] = useState("");
  const [autoScanError, setAutoScanError] = useState<{
    error: string;
    errorDetails?: string;
    suggestion?: string;
    diagnostics?: Record<string, unknown>;
  } | null>(null);
  const [autoScanResults, setAutoScanResults] = useState<{
    totalFiles: number;
    filesScanned: number;
    filesWithIssues: number;
    totalIssues: number;
    issuesByType: Record<string, number>;
    issues: Array<{
      filePath: string;
      line: number;
      type: string;
      original: string;
      suggestedKey: string;
      suggestedFr: string;
      suggestedEn: string;
      context: string;
    }>;
    aggregatedTranslations: {
      fr: Record<string, unknown>;
      en: Record<string, unknown>;
    };
  } | null>(null);

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

  // Deep merge utility for translation objects
  const deepMerge = (target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> => {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = deepMerge(
          (result[key] as Record<string, unknown>) || {},
          source[key] as Record<string, unknown>
        );
      } else if (source[key] !== undefined && source[key] !== null) {
        result[key] = source[key];
      }
    }
    return result;
  };

  // Aggregate all translations from history and prepare for auto-fix
  const aggregateAllTranslations = async () => {
    setIsFixingAll(true);
    
    try {
      let mergedFr: Record<string, unknown> = {};
      let mergedEn: Record<string, unknown> = {};
      let totalIssues = 0;
      
      // Aggregate from all history records
      for (const record of history) {
        if (record.translations_fr && typeof record.translations_fr === 'object') {
          mergedFr = deepMerge(mergedFr, record.translations_fr);
        }
        if (record.translations_en && typeof record.translations_en === 'object') {
          mergedEn = deepMerge(mergedEn, record.translations_en);
        }
        totalIssues += record.total_issues || 0;
      }
      
      // Count total keys
      const countKeys = (obj: Record<string, unknown>): number => {
        let count = 0;
        for (const value of Object.values(obj)) {
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            count += countKeys(value as Record<string, unknown>);
          } else {
            count++;
          }
        }
        return count;
      };
      
      const totalKeys = countKeys(mergedFr) + countKeys(mergedEn);
      
      setAggregatedTranslations({
        fr: mergedFr,
        en: mergedEn,
        totalKeys,
        issueCount: totalIssues,
      });
      
      setShowFixAllDialog(true);
      toast.success(`${totalKeys} clés de traduction agrégées`);
    } catch (error) {
      console.error("Aggregation error:", error);
      toast.error("Erreur lors de l'agrégation");
    } finally {
      setIsFixingAll(false);
    }
  };

  // Generate full translation file content for download
  const generateFullTranslationFile = (translations: Record<string, unknown>, lang: 'fr' | 'en'): string => {
    const formatObject = (obj: Record<string, unknown>, indent: number = 1): string => {
      const spaces = '  '.repeat(indent);
      const entries = Object.entries(obj);
      
      return entries.map(([key, value]) => {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          return `${spaces}${key}: {\n${formatObject(value as Record<string, unknown>, indent + 1)}\n${spaces}}`;
        } else if (typeof value === 'string') {
          const escapedValue = value.replace(/"/g, '\\"').replace(/\n/g, '\\n');
          return `${spaces}${key}: "${escapedValue}"`;
        } else {
          return `${spaces}${key}: ${JSON.stringify(value)}`;
        }
      }).join(',\n');
    };
    
    return `// ============================================
// TRADUCTIONS À AJOUTER dans src/lib/translations/${lang}.ts
// Fusionnez ces clés dans les sections existantes
// ============================================

// Ajoutez ces clés dans l'objet 'translations':

${formatObject(translations)}

// ============================================
// FIN DES TRADUCTIONS À AJOUTER
// ============================================`;
  };

  // Download translation file
  const downloadTranslationFile = (lang: 'fr' | 'en') => {
    if (!aggregatedTranslations) return;
    
    const translations = lang === 'fr' ? aggregatedTranslations.fr : aggregatedTranslations.en;
    const content = generateFullTranslationFile(translations, lang);
    
    const blob = new Blob([content], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translations_to_add_${lang}.ts`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(`Fichier ${lang}.ts téléchargé`);
  };

  // Copy all translations for a language
  const copyAllTranslations = async (lang: 'fr' | 'en') => {
    if (!aggregatedTranslations) return;
    
    const translations = lang === 'fr' ? aggregatedTranslations.fr : aggregatedTranslations.en;
    const content = generateFullTranslationFile(translations, lang);
    
    await copyToClipboard(content, `all_${lang}`);
  };

  // Bulk scan all files in the project
  const scanAllProject = async () => {
    const allFiles = getAllFiles();
    setIsBulkScanning(true);
    setBulkProgress({ current: 0, total: allFiles.length, currentFile: "" });
    setBulkResults(null);

    const results = {
      totalToasts: 0,
      totalDialogs: 0,
      totalProps: 0,
      totalJsxText: 0,
      totalButtons: 0,
      totalAlerts: 0,
      filesWithIssues: 0,
      filesSummary: [] as { file: string; toasts: number; dialogs: number; total: number }[],
    };

    try {
      // Analyze from history - faster approach using existing scans
      for (const record of history) {
        if (!record.file_path) continue;
        
        const issues = record.issues as DetectedIssue[];
        if (!Array.isArray(issues)) continue;

        const toasts = issues.filter(i => i.type === 'toast').length;
        const dialogs = issues.filter(i => i.type === 'dialog').length;
        const props = issues.filter(i => i.type === 'prop').length;
        const jsxText = issues.filter(i => i.type === 'jsx_text').length;
        const buttons = issues.filter(i => i.type === 'button').length;
        const alerts = issues.filter(i => i.type === 'alert').length;

        results.totalToasts += toasts;
        results.totalDialogs += dialogs;
        results.totalProps += props;
        results.totalJsxText += jsxText;
        results.totalButtons += buttons;
        results.totalAlerts += alerts;

        if (record.total_issues > 0) {
          results.filesWithIssues++;
          results.filesSummary.push({
            file: record.file_path,
            toasts,
            dialogs,
            total: record.total_issues,
          });
        }
      }

      // Sort by total issues descending
      results.filesSummary.sort((a, b) => b.total - a.total);

      setBulkResults(results);
      toast.success(`Analyse terminée: ${results.totalToasts} toasts, ${results.totalDialogs} dialogs trouvés`);
    } catch (error) {
      console.error("Bulk scan error:", error);
      toast.error("Erreur lors du scan global");
    } finally {
      setIsBulkScanning(false);
    }
  };

  // Process batch input - parse multiple files and analyze them
  const processBatchInput = async () => {
    if (!batchInput.trim()) {
      toast.error("Collez du code à analyser");
      return;
    }

    setIsBatchProcessing(true);
    setBatchAnalysisResults(null);

    try {
      // Parse the batch input - supports multiple formats:
      // 1. JSON array: [{"filePath": "...", "code": "..."}]
      // 2. Separated by "=== FILE: path ===" markers
      // 3. Single file content
      
      let filesToProcess: { filePath: string; code: string }[] = [];
      
      // Try JSON format first
      try {
        const parsed = JSON.parse(batchInput);
        if (Array.isArray(parsed)) {
          filesToProcess = parsed.filter(f => f.code && f.filePath);
        }
      } catch {
        // Not JSON, try marker format
        const markerRegex = /===\s*FILE:\s*([^\s=]+)\s*===\n([\s\S]*?)(?====\s*FILE:|$)/gi;
        let match;
        while ((match = markerRegex.exec(batchInput)) !== null) {
          const [, filePath, code] = match;
          if (code.trim()) {
            filesToProcess.push({ filePath: filePath.trim(), code: code.trim() });
          }
        }
        
        // If no markers found, treat as single file
        if (filesToProcess.length === 0) {
          filesToProcess = [{ filePath: "manual_input.tsx", code: batchInput }];
        }
      }

      if (filesToProcess.length === 0) {
        toast.error("Aucun fichier valide trouvé dans l'entrée");
        setIsBatchProcessing(false);
        return;
      }

      toast.info(`Analyse de ${filesToProcess.length} fichier(s) en cours...`);

      // Call the edge function
      const { data, error } = await supabase.functions.invoke("auto-fix-translations", {
        body: { codes: filesToProcess },
      });

      if (error) throw error;

      // Store results
      setBatchAnalysisResults({
        filesAnalyzed: data.filesAnalyzed,
        totalIssues: data.totalIssues,
        issuesByType: data.issuesByType,
        aggregatedFr: data.aggregatedTranslations?.fr || {},
        aggregatedEn: data.aggregatedTranslations?.en || {},
      });

      // Count keys
      const countKeys = (obj: Record<string, unknown>): number => {
        let count = 0;
        for (const value of Object.values(obj)) {
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            count += countKeys(value as Record<string, unknown>);
          } else {
            count++;
          }
        }
        return count;
      };

      const totalKeys = countKeys(data.aggregatedTranslations?.fr || {}) + 
                       countKeys(data.aggregatedTranslations?.en || {});

      // Also update the aggregated translations for the download dialog
      setAggregatedTranslations({
        fr: data.aggregatedTranslations?.fr || {},
        en: data.aggregatedTranslations?.en || {},
        totalKeys,
        issueCount: data.totalIssues,
      });

      toast.success(`✅ ${data.totalIssues} problèmes détectés dans ${data.filesAnalyzed} fichiers`);

    } catch (error) {
      console.error("Batch processing error:", error);
      toast.error("Erreur lors du traitement batch");
    } finally {
      setIsBatchProcessing(false);
    }
  };

  // NEW: Auto scan from GitHub - AUTOMATIC without copy-paste
  const runAutoGitHubScan = async () => {
    setIsAutoScanning(true);
    setAutoScanProgress("Connexion à GitHub...");
    setAutoScanResults(null);
    setAutoScanError(null);

    try {
      toast.info("🔍 Scanner automatique démarré - lecture des fichiers depuis GitHub...");
      setAutoScanProgress("Lecture des fichiers depuis GitHub et analyse IA...");

      const { data, error } = await supabase.functions.invoke("scan-repo-translations", {
        body: { maxFiles: 50 }, // Limit to avoid timeout
      });

      if (error) throw error;

      // Check for error in response
      if (data.error) {
        setAutoScanError({
          error: data.error,
          errorDetails: data.errorDetails,
          suggestion: data.suggestion,
          diagnostics: data.diagnostics,
        });
        toast.error(`GitHub: ${data.error}`);
        return;
      }

      // Check if no files were scanned
      if (data.filesScanned === 0) {
        setAutoScanError({
          error: "Aucun fichier scanné",
          errorDetails: "Le scan GitHub n'a trouvé aucun fichier à analyser.",
          suggestion: "Utilisez le mode manuel (copier-coller) ci-dessous.",
          diagnostics: data.diagnostics,
        });
        toast.warning("Aucun fichier scanné - utilisez le mode manuel");
        return;
      }

      setAutoScanResults({
        totalFiles: data.totalFiles,
        filesScanned: data.filesScanned,
        filesWithIssues: data.filesWithIssues,
        totalIssues: data.totalIssues,
        issuesByType: data.issuesByType || {},
        issues: data.issues || [],
        aggregatedTranslations: data.aggregatedTranslations || { fr: {}, en: {} },
      });

      // Also update the aggregated translations for download
      const countKeys = (obj: Record<string, unknown>): number => {
        let count = 0;
        for (const value of Object.values(obj)) {
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            count += countKeys(value as Record<string, unknown>);
          } else {
            count++;
          }
        }
        return count;
      };

      setAggregatedTranslations({
        fr: data.aggregatedTranslations?.fr || {},
        en: data.aggregatedTranslations?.en || {},
        totalKeys: countKeys(data.aggregatedTranslations?.fr || {}),
        issueCount: data.totalIssues,
      });

      setAutoScanProgress("");
      toast.success(`✅ Scan terminé: ${data.totalIssues} problèmes dans ${data.filesWithIssues} fichiers`);

    } catch (error) {
      console.error("Auto GitHub scan error:", error);
      setAutoScanProgress("");
      setAutoScanError({
        error: error instanceof Error ? error.message : "Erreur inconnue",
        suggestion: "Utilisez le mode manuel (copier-coller) ci-dessous.",
      });
      toast.error(`Erreur: ${error instanceof Error ? error.message : "Erreur de scan"}`);
    } finally {
      setIsAutoScanning(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string, field: string) => {
    console.log("[AutoTranslationScanner] copyToClipboard called:", { field, textLength: text?.length });
    if (!text) {
      console.error("[AutoTranslationScanner] No text to copy");
      toast.error("Aucun texte à copier");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      toast.success("Copié dans le presse-papiers !");
      console.log("[AutoTranslationScanner] Successfully copied to clipboard");
    } catch (error) {
      console.error("[AutoTranslationScanner] Clipboard error:", error);
      // Fallback: create textarea and copy
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
        toast.success("Copié (méthode alternative) !");
      } catch (fallbackError) {
        console.error("[AutoTranslationScanner] Fallback copy failed:", fallbackError);
        toast.error("Erreur de copie - Copiez manuellement");
      }
    }
  };

  // Generate translation code formatted for fr.ts or en.ts
  const generateTranslationCode = (translations: Record<string, unknown>, lang: 'fr' | 'en'): string => {
    console.log("[AutoTranslationScanner] generateTranslationCode called:", { lang, translations });
    
    if (!translations || typeof translations !== 'object') {
      console.warn("[AutoTranslationScanner] Invalid translations object");
      return `// Aucune traduction ${lang === 'fr' ? 'française' : 'anglaise'} à ajouter`;
    }
    
    const keys = Object.keys(translations);
    if (keys.length === 0) {
      console.warn("[AutoTranslationScanner] Empty translations object");
      return `// Aucune traduction ${lang === 'fr' ? 'française' : 'anglaise'} à ajouter`;
    }
    
    const lines: string[] = [];
    lines.push(`// === Ajouter à src/lib/translations/${lang}.ts ===`);
    lines.push(`// Fusionnez ces clés dans les sections existantes ou créez-les si nécessaire\n`);
    
    const formatObject = (obj: Record<string, unknown>, indent: number = 0): string[] => {
      const result: string[] = [];
      const spaces = '  '.repeat(indent);
      
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          result.push(`${spaces}${key}: {`);
          result.push(...formatObject(value as Record<string, unknown>, indent + 1));
          result.push(`${spaces}},`);
        } else if (typeof value === 'string') {
          // Escape quotes in strings
          const escapedValue = value.replace(/"/g, '\\"');
          result.push(`${spaces}${key}: "${escapedValue}",`);
        } else {
          result.push(`${spaces}${key}: ${JSON.stringify(value)},`);
        }
      }
      return result;
    };
    
    lines.push(...formatObject(translations));
    
    const output = lines.join('\n');
    console.log("[AutoTranslationScanner] Generated translation code:", output.substring(0, 200) + "...");
    return output;
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
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="batch" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              🚀 Batch
            </TabsTrigger>
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

          {/* BATCH TAB - AUTOMATIC GitHub Scanner */}
          <TabsContent value="batch" className="space-y-4">
            <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-6 w-6 text-primary" />
                  🚀 Scanner Automatique de Traductions
                </CardTitle>
                <CardDescription>
                  Scanner automatique qui lit DIRECTEMENT les fichiers depuis GitHub - aucun copier-coller nécessaire !
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Info Box */}
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <h4 className="font-semibold text-green-700 dark:text-green-300 mb-2 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    ✨ Scan 100% Automatique
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>✅ Lit directement les fichiers depuis votre repo GitHub</li>
                    <li>✅ Analyse automatique avec IA (Gemini)</li>
                    <li>✅ Détecte: toasts, dialogs, alerts, props, textes JSX</li>
                    <li>✅ Génère les traductions FR et EN automatiquement</li>
                    <li>✅ Téléchargez les fichiers fr.ts et en.ts en un clic</li>
                  </ul>
                </div>

                {/* Main Action Button */}
                <div className="flex flex-col gap-4">
                  <Button 
                    onClick={runAutoGitHubScan} 
                    disabled={isAutoScanning}
                    size="lg"
                    className="w-full bg-primary hover:bg-primary/90 text-lg py-8"
                  >
                    {isAutoScanning ? (
                      <>
                        <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                        {autoScanProgress || "Scan en cours..."}
                      </>
                    ) : (
                      <>
                        <Globe className="mr-3 h-6 w-6" />
                        🔍 Scanner Tout le Projet (GitHub)
                      </>
                    )}
                  </Button>
                  
                  {isAutoScanning && (
                    <div className="text-center text-sm text-muted-foreground">
                      <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                      Lecture des fichiers depuis GitHub et analyse IA... Cela peut prendre 1-2 minutes.
                    </div>
                  )}
                </div>

                {/* Error Display with Manual Mode Alternative */}
                {autoScanError && (
                  <Card className="border-destructive/50 bg-destructive/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        ❌ Erreur de scan GitHub
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-sm">
                        <strong>Erreur:</strong> {autoScanError.error}
                      </div>
                      {autoScanError.errorDetails && (
                        <div className="text-sm text-muted-foreground">
                          <strong>Détails:</strong> {autoScanError.errorDetails}
                        </div>
                      )}
                      
                      {/* GitHub 404 Specific Help */}
                      {autoScanError.error?.includes("404") || autoScanError.error?.includes("no files") || autoScanError.error?.includes("returned no files") ? (
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 space-y-3">
                          <h4 className="font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                            <Settings className="h-4 w-4" />
                            🔧 Comment corriger les credentials GitHub
                          </h4>
                          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                            <li>Allez dans <strong>Settings → Secrets</strong> de ce projet Lovable</li>
                            <li>Mettez à jour <code className="bg-muted px-1 rounded">GITHUB_TOKEN</code> avec un token ayant accès au repo</li>
                            <li>Vérifiez <code className="bg-muted px-1 rounded">GITHUB_OWNER</code> (ex: "votreorganisation")</li>
                            <li>Vérifiez <code className="bg-muted px-1 rounded">GITHUB_REPO</code> (ex: "votre-projet")</li>
                          </ol>
                          <div className="text-xs text-muted-foreground mt-2">
                            Le token doit avoir les permissions <strong>repo (read)</strong> sur le repository cible.
                          </div>
                        </div>
                      ) : null}
                      
                      {autoScanError.diagnostics && (
                        <Collapsible>
                          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                            <ChevronRight className="h-4 w-4" />
                            Voir les diagnostics
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="text-xs font-mono bg-muted rounded p-2 mt-2">
                              <pre>{JSON.stringify(autoScanError.diagnostics, null, 2)}</pre>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                      
                      {/* Alternative: Manual Mode */}
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                        <h4 className="font-semibold text-green-700 dark:text-green-300 mb-3 flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          ✅ Alternative: Mode Manuel (fonctionne toujours)
                        </h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          Collez le code directement ci-dessous pour l'analyser sans GitHub.
                        </p>
                        <div className="space-y-3">
                          <textarea
                            className="w-full h-32 p-3 text-sm font-mono rounded-md border bg-background resize-none"
                            placeholder="Collez ici le code d'un fichier TSX/TS à analyser...&#10;&#10;Exemple:&#10;toast.success('Message hardcodé');&#10;<Button>Cliquez ici</Button>"
                            value={batchInput}
                            onChange={(e) => setBatchInput(e.target.value)}
                          />
                          <Button 
                            onClick={processBatchInput} 
                            disabled={isBatchProcessing || !batchInput.trim()}
                            className="w-full"
                          >
                            {isBatchProcessing ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Analyse en cours...
                              </>
                            ) : (
                              <>
                                <Wand2 className="mr-2 h-4 w-4" />
                                🔍 Analyser ce code
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Auto Scan Results */}
                {autoScanResults && (
                  <Card className="border-green-500/50 bg-green-500/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 text-green-700 dark:text-green-400">
                        <CheckCircle className="h-5 w-5" />
                        ✅ Scan GitHub terminé !
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 bg-blue-500/10 rounded-lg text-center">
                          <div className="text-2xl font-bold text-blue-500">{autoScanResults.filesScanned}</div>
                          <div className="text-xs text-muted-foreground">Fichiers scannés</div>
                        </div>
                        <div className="p-3 bg-orange-500/10 rounded-lg text-center">
                          <div className="text-2xl font-bold text-orange-500">{autoScanResults.filesWithIssues}</div>
                          <div className="text-xs text-muted-foreground">Fichiers avec erreurs</div>
                        </div>
                        <div className="p-3 bg-red-500/10 rounded-lg text-center">
                          <div className="text-2xl font-bold text-red-500">{autoScanResults.totalIssues}</div>
                          <div className="text-xs text-muted-foreground">Problèmes détectés</div>
                        </div>
                        <div className="p-3 bg-green-500/10 rounded-lg text-center">
                          <div className="text-2xl font-bold text-green-500">
                            {autoScanResults.issuesByType?.toast || 0}
                          </div>
                          <div className="text-xs text-muted-foreground">Toasts</div>
                        </div>
                      </div>

                      {/* Issue Type Details */}
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(autoScanResults.issuesByType || {}).map(([type, count]) => (
                          <Badge key={type} variant="outline" className="text-sm">
                            {type}: {count}
                          </Badge>
                        ))}
                      </div>

                      {/* Issues List */}
                      {autoScanResults.issues.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-semibold mb-2">📋 Problèmes détectés ({autoScanResults.issues.length})</h4>
                          <ScrollArea className="h-[200px] border rounded-lg">
                            <div className="p-2 space-y-1">
                              {autoScanResults.issues.slice(0, 50).map((issue, idx) => (
                                <div key={idx} className="flex items-center gap-2 p-2 bg-muted/50 rounded text-xs">
                                  {getTypeBadge(issue.type)}
                                  <span className="font-mono text-muted-foreground truncate max-w-[150px]">
                                    {issue.filePath.split('/').pop()}:{issue.line}
                                  </span>
                                  <span className="flex-1 truncate">"{issue.original}"</span>
                                </div>
                              ))}
                              {autoScanResults.issues.length > 50 && (
                                <div className="text-center text-muted-foreground py-2">
                                  ... et {autoScanResults.issues.length - 50} autres
                                </div>
                              )}
                            </div>
                          </ScrollArea>
                        </div>
                      )}

                      {/* Auto-Add Translations Section */}
                      {autoScanResults.totalIssues > 0 && (
                        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-lg p-4 space-y-3">
                          <h4 className="font-semibold text-green-700 dark:text-green-400 flex items-center gap-2">
                            <Sparkles className="h-5 w-5" />
                            🎯 Ajouter automatiquement les traductions
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {autoScanResults.totalIssues} traductions détectées. Copiez le code ci-dessous et ajoutez-le à vos fichiers de traduction.
                          </p>
                          
                          {/* Preview of translations */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">🇫🇷 Traductions FR</span>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => {
                                    const frCode = generateFullTranslationFile(autoScanResults.aggregatedTranslations.fr, 'fr');
                                    copyToClipboard(frCode, "auto-fr");
                                  }}
                                >
                                  {copiedField === "auto-fr" ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                                  Copier
                                </Button>
                              </div>
                              <div className="bg-muted rounded p-2 max-h-32 overflow-y-auto">
                                <pre className="text-xs font-mono whitespace-pre-wrap">
                                  {JSON.stringify(autoScanResults.aggregatedTranslations.fr, null, 2).substring(0, 500)}
                                  {JSON.stringify(autoScanResults.aggregatedTranslations.fr, null, 2).length > 500 && '...'}
                                </pre>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">🇬🇧 Traductions EN</span>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => {
                                    const enCode = generateFullTranslationFile(autoScanResults.aggregatedTranslations.en, 'en');
                                    copyToClipboard(enCode, "auto-en");
                                  }}
                                >
                                  {copiedField === "auto-en" ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                                  Copier
                                </Button>
                              </div>
                              <div className="bg-muted rounded p-2 max-h-32 overflow-y-auto">
                                <pre className="text-xs font-mono whitespace-pre-wrap">
                                  {JSON.stringify(autoScanResults.aggregatedTranslations.en, null, 2).substring(0, 500)}
                                  {JSON.stringify(autoScanResults.aggregatedTranslations.en, null, 2).length > 500 && '...'}
                                </pre>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Download Buttons */}
                      <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
                        <Button 
                          onClick={() => setShowFixAllDialog(true)}
                          className="bg-green-600 hover:bg-green-700"
                          size="lg"
                        >
                          <FileText className="mr-2 h-5 w-5" />
                          📥 Télécharger Fichiers Complets
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => {
                            const frCode = generateFullTranslationFile(autoScanResults.aggregatedTranslations.fr, 'fr');
                            copyToClipboard(frCode, "auto-fr-full");
                          }}
                        >
                          {copiedField === "auto-fr-full" ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                          Copier fr.ts complet
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => {
                            const enCode = generateFullTranslationFile(autoScanResults.aggregatedTranslations.en, 'en');
                            copyToClipboard(enCode, "auto-en-full");
                          }}
                        >
                          {copiedField === "auto-en-full" ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                          Copier en.ts complet
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Manual Input Section - Always visible */}
                {!autoScanError && (
                  <Card className="border-border bg-muted/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Wand2 className="h-5 w-5 text-primary" />
                        📝 Mode Manuel (copier-coller)
                      </CardTitle>
                      <CardDescription>
                        Alternative si GitHub ne fonctionne pas - collez directement le code à analyser
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <textarea
                          placeholder={`Collez ici le code d'un ou plusieurs fichiers TSX/TS...

Format simple:
toast.success("Message hardcodé");
<Button>Cliquez ici</Button>

Ou format multi-fichiers:
=== FILE: src/pages/Dashboard.tsx ===
// Code du fichier 1...

=== FILE: src/pages/Products.tsx ===
// Code du fichier 2...`}
                          value={batchInput}
                          onChange={(e) => setBatchInput(e.target.value)}
                          className="w-full min-h-[150px] p-4 font-mono text-sm bg-background rounded-lg border border-border resize-y"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={processBatchInput} 
                          disabled={isBatchProcessing || !batchInput.trim()}
                          className="flex-1"
                        >
                          {isBatchProcessing ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyse en cours...</>
                          ) : (
                            <><Wand2 className="mr-2 h-4 w-4" />🔍 Analyser ce code</>
                          )}
                        </Button>
                        {batchInput.trim() && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setBatchInput("")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Batch Analysis Results */}
                {batchAnalysisResults && (
                  <Card className="border-green-500/50 bg-green-500/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 text-green-700 dark:text-green-400">
                        <CheckCircle className="h-5 w-5" />
                        ✅ Analyse manuelle terminée !
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 bg-blue-500/10 rounded-lg text-center">
                          <div className="text-2xl font-bold text-blue-500">{batchAnalysisResults.filesAnalyzed}</div>
                          <div className="text-xs text-muted-foreground">Fichiers analysés</div>
                        </div>
                        <div className="p-3 bg-red-500/10 rounded-lg text-center">
                          <div className="text-2xl font-bold text-red-500">{batchAnalysisResults.totalIssues}</div>
                          <div className="text-xs text-muted-foreground">Problèmes détectés</div>
                        </div>
                        <div className="p-3 bg-green-500/10 rounded-lg text-center">
                          <div className="text-2xl font-bold text-green-500">
                            {batchAnalysisResults.issuesByType?.toast || 0}
                          </div>
                          <div className="text-xs text-muted-foreground">Toasts</div>
                        </div>
                        <div className="p-3 bg-purple-500/10 rounded-lg text-center">
                          <div className="text-2xl font-bold text-purple-500">
                            {batchAnalysisResults.issuesByType?.dialog || 0}
                          </div>
                          <div className="text-xs text-muted-foreground">Dialogs</div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(batchAnalysisResults.issuesByType || {}).map(([type, count]) => (
                          <Badge key={type} variant="outline" className="text-sm">
                            {type}: {count}
                          </Badge>
                        ))}
                      </div>
                      
                      {/* Download/Copy Buttons */}
                      <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
                        <Button 
                          onClick={() => setShowFixAllDialog(true)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          📥 Télécharger les traductions
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => {
                            const frCode = generateFullTranslationFile(batchAnalysisResults.aggregatedFr, 'fr');
                            copyToClipboard(frCode, "batch-fr");
                          }}
                        >
                          {copiedField === "batch-fr" ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                          Copier fr.ts
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => {
                            const enCode = generateFullTranslationFile(batchAnalysisResults.aggregatedEn, 'en');
                            copyToClipboard(enCode, "batch-en");
                          }}
                        >
                          {copiedField === "batch-en" ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                          Copier en.ts
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files" className="space-y-4">
            {/* Bulk Scan Section */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Scanner Global du Projet
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {TOTAL_FILES_COUNT} fichiers enregistrés • Analyse basée sur l'historique des scans
                    </p>
                  </div>
                  <Button 
                    onClick={scanAllProject} 
                    disabled={isBulkScanning}
                    variant="default"
                  >
                    {isBulkScanning ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Scan en cours...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Calculer le Total
                      </>
                    )}
                  </Button>
                </div>

                {/* Bulk Results */}
                {bulkResults && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div className="p-3 bg-red-500/10 rounded-lg text-center">
                        <div className="text-2xl font-bold text-red-500">{bulkResults.totalToasts}</div>
                        <div className="text-xs text-muted-foreground">Toasts</div>
                      </div>
                      <div className="p-3 bg-purple-500/10 rounded-lg text-center">
                        <div className="text-2xl font-bold text-purple-500">{bulkResults.totalDialogs}</div>
                        <div className="text-xs text-muted-foreground">Dialogs</div>
                      </div>
                      <div className="p-3 bg-blue-500/10 rounded-lg text-center">
                        <div className="text-2xl font-bold text-blue-500">{bulkResults.totalButtons}</div>
                        <div className="text-xs text-muted-foreground">Buttons</div>
                      </div>
                      <div className="p-3 bg-yellow-500/10 rounded-lg text-center">
                        <div className="text-2xl font-bold text-yellow-500">{bulkResults.totalProps}</div>
                        <div className="text-xs text-muted-foreground">Props</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">
                        {bulkResults.filesWithIssues} fichier(s) avec problèmes (sur {history.length} scannés)
                      </span>
                      <Badge variant="destructive">
                        Total: {bulkResults.totalToasts + bulkResults.totalDialogs + bulkResults.totalButtons + bulkResults.totalProps + bulkResults.totalJsxText + bulkResults.totalAlerts}
                      </Badge>
                    </div>

                    {bulkResults.filesSummary.length > 0 && (
                      <ScrollArea className="h-[150px] mt-2">
                        <div className="space-y-1">
                          {bulkResults.filesSummary.slice(0, 15).map((f, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs">
                              <span className="truncate flex-1">{f.file}</span>
                              <div className="flex gap-2 ml-2">
                                {f.toasts > 0 && <Badge variant="outline" className="bg-red-500/10 text-red-500">{f.toasts} toasts</Badge>}
                                {f.dialogs > 0 && <Badge variant="outline" className="bg-purple-500/10 text-purple-500">{f.dialogs} dialogs</Badge>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Fix All Button - Main Action */}
            <Card className="border-green-500/30 bg-green-500/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2 text-green-700 dark:text-green-400">
                      <Wand2 className="h-5 w-5" />
                      🚀 Corriger Toutes les Traductions
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Agrège toutes les traductions détectées et génère les fichiers complets à télécharger
                    </p>
                  </div>
                  <Button 
                    onClick={aggregateAllTranslations} 
                    disabled={isFixingAll || history.length === 0}
                    size="lg"
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isFixingAll ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Agrégation...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-5 w-5" />
                        Générer les Traductions ({history.length} scans)
                      </>
                    )}
                  </Button>
                </div>
                {history.length === 0 && (
                  <p className="mt-2 text-sm text-amber-600">
                    ⚠️ Scannez d'abord quelques fichiers pour générer des traductions
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
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
                  <Card className="border-green-500/30 bg-green-500/5">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Wand2 className="h-5 w-5 text-green-500" />
                          Code Corrigé (Prêt à copier)
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
                            onClick={() => copyToClipboard(result.correctedCode, "dialog-fixed-code")}
                          >
                            {copiedField === "dialog-fixed-code" ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
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

                {/* Translations to add - Enhanced with formatted code */}
                {(Object.keys(result.translationsFr).length > 0 || Object.keys(result.translationsEn).length > 0) && (
                  <Card className="border-purple-500/30 bg-purple-500/5">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Languages className="h-5 w-5 text-purple-500" />
                          Traductions à Ajouter aux Fichiers
                        </CardTitle>
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            variant="default"
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => {
                              const frCode = generateTranslationCode(result.translationsFr, 'fr');
                              copyToClipboard(frCode, "fr-translations");
                            }}
                          >
                            {copiedField === "fr-translations" ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                            Copier pour fr.ts
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => {
                              const enCode = generateTranslationCode(result.translationsEn, 'en');
                              copyToClipboard(enCode, "en-translations");
                            }}
                          >
                            {copiedField === "en-translations" ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                            Copier pour en.ts
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4">
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          <strong>Instructions:</strong> Copiez le code et ajoutez-le dans la section appropriée du fichier de traduction. 
                          Fusionnez les clés avec les sections existantes si elles existent déjà.
                        </p>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium mb-2 text-blue-600">🇫🇷 src/lib/translations/fr.ts</h4>
                          <ScrollArea className="h-[200px]">
                            <pre className="text-xs font-mono bg-blue-500/10 p-3 rounded-lg whitespace-pre-wrap">
                              {generateTranslationCode(result.translationsFr, 'fr')}
                            </pre>
                          </ScrollArea>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium mb-2 text-red-600">🇬🇧 src/lib/translations/en.ts</h4>
                          <ScrollArea className="h-[200px]">
                            <pre className="text-xs font-mono bg-red-500/10 p-3 rounded-lg whitespace-pre-wrap">
                              {generateTranslationCode(result.translationsEn, 'en')}
                            </pre>
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

      {/* Fix All Dialog */}
      <Dialog open={showFixAllDialog} onOpenChange={setShowFixAllDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-6 w-6 text-green-500" />
              🎉 Traductions Agrégées - Prêtes à Télécharger
            </DialogTitle>
            <DialogDescription>
              {aggregatedTranslations && (
                <span>
                  {aggregatedTranslations.totalKeys} clés de traduction générées à partir de {aggregatedTranslations.issueCount} problèmes détectés
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {aggregatedTranslations && (
            <div className="space-y-6">
              {/* Download Actions */}
              <div className="flex flex-wrap gap-3 p-4 bg-muted/50 rounded-lg">
                <Button 
                  onClick={() => downloadTranslationFile('fr')}
                  className="bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  <FileText className="mr-2 h-5 w-5" />
                  📥 Télécharger fr.ts
                </Button>
                <Button 
                  onClick={() => downloadTranslationFile('en')}
                  className="bg-red-600 hover:bg-red-700"
                  size="lg"
                >
                  <FileText className="mr-2 h-5 w-5" />
                  📥 Télécharger en.ts
                </Button>
                <div className="flex-1" />
                <Button 
                  onClick={() => copyAllTranslations('fr')}
                  variant="outline"
                >
                  {copiedField === "all_fr" ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                  Copier FR
                </Button>
                <Button 
                  onClick={() => copyAllTranslations('en')}
                  variant="outline"
                >
                  {copiedField === "all_en" ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                  Copier EN
                </Button>
              </div>

              {/* Instructions */}
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2">📋 Instructions</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Téléchargez les fichiers de traduction</li>
                  <li>Ouvrez <code className="bg-muted px-1 rounded">src/lib/translations/fr.ts</code> et <code className="bg-muted px-1 rounded">en.ts</code></li>
                  <li>Fusionnez les nouvelles clés dans les sections appropriées de chaque fichier</li>
                  <li>Sauvegardez et vérifiez que l'application compile correctement</li>
                </ol>
              </div>

              {/* Preview */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    🇫🇷 Traductions Françaises
                    <Badge variant="secondary">{Object.keys(aggregatedTranslations.fr).length} sections</Badge>
                  </h4>
                  <ScrollArea className="h-[300px]">
                    <pre className="text-xs font-mono bg-blue-500/10 p-3 rounded-lg whitespace-pre-wrap">
                      {generateFullTranslationFile(aggregatedTranslations.fr, 'fr')}
                    </pre>
                  </ScrollArea>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    🇬🇧 Traductions Anglaises
                    <Badge variant="secondary">{Object.keys(aggregatedTranslations.en).length} sections</Badge>
                  </h4>
                  <ScrollArea className="h-[300px]">
                    <pre className="text-xs font-mono bg-red-500/10 p-3 rounded-lg whitespace-pre-wrap">
                      {generateFullTranslationFile(aggregatedTranslations.en, 'en')}
                    </pre>
                  </ScrollArea>
                </div>
              </div>

              {/* Close */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowFixAllDialog(false)}>
                  Fermer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
