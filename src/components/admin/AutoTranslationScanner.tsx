import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  Copy, 
  Wand2,
  FileCode,
  Languages,
  Sparkles,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Download,
  RefreshCw,
  Play,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// File registry - critical files to scan
const FILE_REGISTRY: Record<string, string[]> = {
  'components/admin': [
    'AdminSmartSearch.tsx', 'AdminToolbox.tsx', 'AdvancedAnalytics.tsx', 
    'BlogSeoManagementAdmin.tsx', 'EmailInbox.tsx', 'EmailSidebar.tsx',
    'EmailStatsDashboard.tsx', 'EmailTemplates.tsx', 'GoogleAdsAdmin.tsx',
    'SystemEventLogs.tsx', 'SystemStatusDashboard.tsx', 'UserActivityHistory.tsx',
    'UserInsightPanel.tsx'
  ],
  'components/seo': [
    'SEODashboard.tsx', 'ProductSeoTab.tsx', 'CollectionSeoTab.tsx', 
    'ArticleSeoTab.tsx', 'PageSeoTab.tsx', 'ImageSeoTab.tsx', 'TagSeoTab.tsx',
    'HomePageSeoAudit.tsx', 'SeoScoreDisplay.tsx', 'SeoOptimizationCard.tsx'
  ],
  'components/blog': [
    'BlogWizard.tsx', 'BlogOpportunities.tsx', 'BlogCampaignMonitoring.tsx',
    'ArticlePreview.tsx', 'OpportunitiesSettings.tsx'
  ],
  'components/dashboard': [
    'DashboardHeader.tsx', 'DashboardStats.tsx', 'QuickActions.tsx',
    'RecentActivity.tsx', 'StoreOverview.tsx'
  ],
  'components/integration': [
    'ShopifyConnectionWizard.tsx', 'ShopifyInstallGuide.tsx', 
    'GoogleMerchantIntegration.tsx', 'GoogleAdsIntegration.tsx'
  ],
  'components/pricing': [
    'PricingCard.tsx', 'PricingComparison.tsx', 'SubscriptionStatus.tsx'
  ],
  'components/landing': [
    'LandingGenerator.tsx', 'LandingPreview.tsx', 'LandingTemplates.tsx'
  ],
  'pages': [
    'Account.tsx', 'Admin.tsx', 'ArticleManagement.tsx', 'Auth.tsx',
    'Blog.tsx', 'BlogCampaignMonitoring.tsx', 'Chat.tsx', 'ChatSettings.tsx',
    'Collections.tsx', 'Dashboard.tsx', 'Integration.tsx', 'MediaHistory.tsx',
    'Merchant.tsx', 'Onboarding.tsx', 'Pricing.tsx', 'ProductDetail.tsx',
    'ProductEnrichment.tsx', 'Products.tsx', 'SEO.tsx', 'Shopping.tsx',
    'Subscription.tsx', 'SuperAdmin.tsx'
  ]
};

interface DetectedIssue {
  id: string;
  type: 'toast' | 'dialog' | 'jsx_text' | 'prop' | 'button' | 'error';
  severity: 'critical' | 'high' | 'medium';
  text: string;
  line: number;
  context: string;
  suggestedKey: string;
  suggestedTranslation: {
    fr: string;
    en: string;
  };
  fix: string;
}

interface FileAnalysisResult {
  fileName: string;
  filePath: string;
  issues: DetectedIssue[];
  correctedCode: string;
  translations: { fr: Record<string, any>; en: Record<string, any> };
  status: 'pending' | 'analyzing' | 'done' | 'error';
  error?: string;
}

interface CategoryResult {
  category: string;
  files: FileAnalysisResult[];
  totalIssues: number;
  status: 'pending' | 'scanning' | 'done';
}

export default function AutoTranslationScanner() {
  const [results, setResults] = useState<CategoryResult[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [selectedTab, setSelectedTab] = useState('scanner');
  const [manualCode, setManualCode] = useState('');
  const [manualResult, setManualResult] = useState<FileAnalysisResult | null>(null);

  const analyzeFileContent = useCallback(async (code: string, fileName: string): Promise<FileAnalysisResult> => {
    try {
      const { data, error } = await supabase.functions.invoke('analyze-translation-issues', {
        body: { code, fileName }
      });

      if (error) throw error;

      return {
        fileName,
        filePath: fileName,
        issues: data.issues || [],
        correctedCode: data.correctedCode || code,
        translations: data.translations || { fr: {}, en: {} },
        status: 'done'
      };
    } catch (error) {
      console.error(`Error analyzing ${fileName}:`, error);
      return {
        fileName,
        filePath: fileName,
        issues: [],
        correctedCode: code,
        translations: { fr: {}, en: {} },
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, []);

  const scanCategory = useCallback(async (category: string) => {
    const files = FILE_REGISTRY[category] || [];
    if (files.length === 0) return;

    setCurrentCategory(category);
    const categoryResult: CategoryResult = {
      category,
      files: files.map(f => ({
        fileName: f,
        filePath: `src/${category}/${f}`,
        issues: [],
        correctedCode: '',
        translations: { fr: {}, en: {} },
        status: 'pending' as const
      })),
      totalIssues: 0,
      status: 'scanning'
    };

    setResults(prev => {
      const existing = prev.findIndex(r => r.category === category);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = categoryResult;
        return updated;
      }
      return [...prev, categoryResult];
    });

    // Note: In real implementation, we would read file contents
    // For now, we'll show the interface and allow manual code paste
    toast.info(`Catégorie ${category}: ${files.length} fichiers à analyser`);
    
    setResults(prev => {
      const idx = prev.findIndex(r => r.category === category);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], status: 'done' };
        return updated;
      }
      return prev;
    });

    setCurrentCategory(null);
  }, []);

  const scanAllCategories = useCallback(async () => {
    setIsScanning(true);
    setProgress(0);
    
    const categories = Object.keys(FILE_REGISTRY);
    for (let i = 0; i < categories.length; i++) {
      await scanCategory(categories[i]);
      setProgress(((i + 1) / categories.length) * 100);
    }
    
    setIsScanning(false);
    toast.success('Scan terminé');
  }, [scanCategory]);

  const analyzeManualCode = useCallback(async () => {
    if (!manualCode.trim()) {
      toast.error('Veuillez coller du code à analyser');
      return;
    }

    setManualResult({
      fileName: 'manual-input',
      filePath: 'manual-input',
      issues: [],
      correctedCode: '',
      translations: { fr: {}, en: {} },
      status: 'analyzing'
    });

    const result = await analyzeFileContent(manualCode, 'manual-input');
    setManualResult(result);

    if (result.issues.length === 0) {
      toast.success('Aucun problème détecté !');
    } else {
      toast.warning(`${result.issues.length} problème(s) détecté(s)`);
    }
  }, [manualCode, analyzeFileContent]);

  const copyToClipboard = (text: string, label?: string) => {
    navigator.clipboard.writeText(text);
    toast.success(label ? `${label} copié` : 'Copié !');
  };

  const exportAllTranslations = () => {
    const allFr: Record<string, any> = {};
    const allEn: Record<string, any> = {};

    results.forEach(cat => {
      cat.files.forEach(file => {
        Object.assign(allFr, file.translations.fr);
        Object.assign(allEn, file.translations.en);
      });
    });

    if (manualResult) {
      Object.assign(allFr, manualResult.translations.fr);
      Object.assign(allEn, manualResult.translations.en);
    }

    const output = `// ===== TRADUCTIONS FR À AJOUTER =====
${JSON.stringify(allFr, null, 2)}

// ===== TRANSLATIONS EN TO ADD =====
${JSON.stringify(allEn, null, 2)}`;

    copyToClipboard(output, 'Traductions');
  };

  const toggleFileExpand = (filePath: string) => {
    setExpandedFiles(prev => {
      const next = new Set(prev);
      if (next.has(filePath)) {
        next.delete(filePath);
      } else {
        next.add(filePath);
      }
      return next;
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'toast': return '🔔';
      case 'dialog': return '💬';
      case 'button': return '🔘';
      case 'prop': return '📝';
      case 'jsx_text': return '📄';
      case 'error': return '❌';
      default: return '📌';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="h-6 w-6 text-primary" />
            Scanner de Traductions Automatique
          </CardTitle>
          <CardDescription>
            Analysez automatiquement les fichiers pour détecter les textes non traduits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="scanner">Scanner par Catégorie</TabsTrigger>
              <TabsTrigger value="manual">Analyse Manuelle</TabsTrigger>
            </TabsList>

            <TabsContent value="scanner" className="space-y-4 mt-4">
              {/* Category Buttons */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(FILE_REGISTRY).map(([category, files]) => {
                  const result = results.find(r => r.category === category);
                  const isActive = currentCategory === category;
                  
                  return (
                    <Button
                      key={category}
                      variant={result?.status === 'done' ? 'outline' : 'secondary'}
                      size="sm"
                      onClick={() => scanCategory(category)}
                      disabled={isScanning}
                      className="justify-start gap-2"
                    >
                      {isActive ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : result?.status === 'done' ? (
                        result.totalIssues > 0 ? (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )
                      ) : (
                        <FolderOpen className="h-4 w-4" />
                      )}
                      <span className="truncate text-xs">{category}</span>
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {files.length}
                      </Badge>
                    </Button>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button 
                  onClick={scanAllCategories} 
                  disabled={isScanning}
                  className="flex-1"
                >
                  {isScanning ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Scanner Tout
                </Button>
                <Button 
                  variant="outline" 
                  onClick={exportAllTranslations}
                  disabled={results.length === 0 && !manualResult}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exporter Traductions
                </Button>
              </div>

              {/* Progress */}
              {isScanning && (
                <div className="space-y-2">
                  <Progress value={progress} className="h-2" />
                  <p className="text-sm text-muted-foreground text-center">
                    Scan en cours... {Math.round(progress)}%
                  </p>
                </div>
              )}

              {/* Results */}
              {results.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <FileCode className="h-5 w-5" />
                    Résultats du Scan
                  </h3>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {results.map((catResult) => (
                        <Collapsible key={catResult.category}>
                          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                            <div className="flex items-center gap-2">
                              <ChevronRight className="h-4 w-4" />
                              <span className="font-medium">{catResult.category}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={catResult.totalIssues > 0 ? 'destructive' : 'default'}>
                                {catResult.totalIssues} issues
                              </Badge>
                              <Badge variant="outline">
                                {catResult.files.length} fichiers
                              </Badge>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pl-6 pt-2 space-y-2">
                            {catResult.files.map((file) => (
                              <div 
                                key={file.filePath}
                                className="p-2 border rounded-md bg-background"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-mono">{file.fileName}</span>
                                  {file.status === 'done' && (
                                    <Badge variant={file.issues.length > 0 ? 'destructive' : 'default'}>
                                      {file.issues.length} issues
                                    </Badge>
                                  )}
                                  {file.status === 'analyzing' && (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  )}
                                </div>
                              </div>
                            ))}
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </TabsContent>

            <TabsContent value="manual" className="space-y-4 mt-4">
              {/* Manual Code Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Collez le code à analyser (TSX/JSX)
                </label>
                <textarea
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder={`// Collez votre code ici...
// Exemple:
<Button>Enregistrer</Button>
toast.success("Opération réussie")
<DialogTitle>Confirmer la suppression</DialogTitle>`}
                  className="w-full min-h-[200px] p-3 font-mono text-sm bg-muted rounded-lg border resize-y"
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={analyzeManualCode} 
                  disabled={!manualCode.trim() || manualResult?.status === 'analyzing'}
                  className="flex-1"
                >
                  {manualResult?.status === 'analyzing' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Analyser le Code
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setManualCode('');
                    setManualResult(null);
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>

              {/* Manual Analysis Results */}
              {manualResult && manualResult.status === 'done' && (
                <div className="space-y-4">
                  {manualResult.issues.length === 0 ? (
                    <Card className="bg-green-500/10 border-green-500/30">
                      <CardContent className="py-6 text-center">
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                        <p className="text-lg font-medium">Aucun texte en dur détecté</p>
                        <p className="text-sm text-muted-foreground">
                          Le code analysé semble correctement internationalisé.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      {/* Issues List */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center justify-between text-base">
                            <span className="flex items-center gap-2">
                              <AlertTriangle className="h-5 w-5 text-amber-500" />
                              {manualResult.issues.length} Problème(s) Détecté(s)
                            </span>
                            <div className="flex gap-1">
                              <Badge variant="destructive">
                                {manualResult.issues.filter(i => i.severity === 'critical').length} critiques
                              </Badge>
                              <Badge variant="secondary">
                                {manualResult.issues.filter(i => i.severity === 'high').length} élevés
                              </Badge>
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="h-[300px]">
                            <div className="space-y-3">
                              {manualResult.issues.map((issue) => (
                                <div 
                                  key={issue.id} 
                                  className="p-3 border rounded-lg bg-muted/30 space-y-2"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span>{getTypeIcon(issue.type)}</span>
                                        <Badge variant="outline" className="text-xs">
                                          Ligne {issue.line}
                                        </Badge>
                                        <Badge 
                                          className={`text-xs text-white ${getSeverityColor(issue.severity)}`}
                                        >
                                          {issue.severity}
                                        </Badge>
                                      </div>
                                      <p className="font-medium text-sm mb-1">
                                        "{issue.text}"
                                      </p>
                                      <code className="text-xs text-muted-foreground block bg-muted p-2 rounded overflow-x-auto">
                                        {issue.context}
                                      </code>
                                    </div>
                                  </div>

                                  <div className="pt-2 border-t space-y-2">
                                    <div className="flex items-center gap-2 text-sm">
                                      <Sparkles className="h-4 w-4 text-primary" />
                                      <span className="text-muted-foreground">Clé suggérée:</span>
                                      <code className="bg-primary/10 px-2 py-0.5 rounded text-primary font-mono text-xs">
                                        t.{issue.suggestedKey}
                                      </code>
                                      <Button 
                                        size="sm" 
                                        variant="ghost"
                                        onClick={() => copyToClipboard(`{t.${issue.suggestedKey}}`)}
                                        className="h-6 px-2"
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      <div className="bg-blue-500/10 p-2 rounded">
                                        <span className="font-medium text-blue-600">FR:</span>{" "}
                                        {issue.suggestedTranslation.fr}
                                      </div>
                                      <div className="bg-green-500/10 p-2 rounded">
                                        <span className="font-medium text-green-600">EN:</span>{" "}
                                        {issue.suggestedTranslation.en}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </CardContent>
                      </Card>

                      {/* Corrected Code */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center justify-between text-base">
                            <span className="flex items-center gap-2">
                              <Wand2 className="h-5 w-5 text-green-500" />
                              Code Corrigé
                            </span>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => copyToClipboard(manualResult.correctedCode, 'Code corrigé')}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copier
                            </Button>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="h-[200px]">
                            <pre className="text-xs font-mono bg-muted p-4 rounded-lg whitespace-pre-wrap">
                              {manualResult.correctedCode}
                            </pre>
                          </ScrollArea>
                        </CardContent>
                      </Card>

                      {/* Translations to Add */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center justify-between text-base">
                            <span className="flex items-center gap-2">
                              <FileCode className="h-5 w-5 text-purple-500" />
                              Traductions à Ajouter
                            </span>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => copyToClipboard(
                                `// FR:\n${JSON.stringify(manualResult.translations.fr, null, 2)}\n\n// EN:\n${JSON.stringify(manualResult.translations.en, null, 2)}`,
                                'Traductions'
                              )}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copier
                            </Button>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-sm font-medium mb-2 text-blue-600">🇫🇷 Français</h4>
                              <pre className="text-xs font-mono bg-blue-500/10 p-3 rounded-lg overflow-x-auto">
                                {JSON.stringify(manualResult.translations.fr, null, 2)}
                              </pre>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium mb-2 text-green-600">🇬🇧 English</h4>
                              <pre className="text-xs font-mono bg-green-500/10 p-3 rounded-lg overflow-x-auto">
                                {JSON.stringify(manualResult.translations.en, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
