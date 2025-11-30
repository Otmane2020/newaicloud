import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Search, AlertTriangle, CheckCircle, Copy, Wand2, FileCode, Languages, Sparkles,
  FolderOpen, ChevronRight, Download, RefreshCw, Play, Loader2, AlertCircle, Bell, MessageSquare, Flag
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const FILE_REGISTRY: Record<string, string[]> = {
  'components/admin': ['AdminSmartSearch.tsx', 'AdminToolbox.tsx', 'EmailInbox.tsx', 'VideoAdsStudio.tsx'],
  'components/seo': ['SEODashboard.tsx', 'ProductSeoTab.tsx', 'CollectionSeoTab.tsx', 'HomePageSeoAudit.tsx'],
  'components/blog': ['BlogWizard.tsx', 'BlogOpportunities.tsx', 'BlogCampaignMonitoring.tsx'],
  'components/dashboard': ['DashboardHeader.tsx', 'DashboardStats.tsx', 'QuickActions.tsx'],
  'components/integration': ['ShopifyConnectionWizard.tsx', 'GoogleMerchantIntegration.tsx'],
  'components/pricing': ['PricingCard.tsx', 'PricingComparison.tsx', 'SubscriptionStatus.tsx'],
  'components/landing': ['LandingGenerator.tsx', 'LandingPreview.tsx'],
  'components/ui': ['toast.tsx', 'alert.tsx', 'dialog.tsx', 'alert-dialog.tsx'],
  'hooks': ['use-toast.ts', 'useNotifications.ts'],
  'pages': ['Dashboard.tsx', 'Products.tsx', 'Collections.tsx', 'Auth.tsx', 'Pricing.tsx', 'SuperAdmin.tsx']
};

interface DetectedIssue {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium';
  text: string;
  line: number;
  context: string;
  suggestedKey: string;
  suggestedTranslation: { fr: string; en: string };
  fix: string;
  detectedLanguage?: 'fr' | 'en' | 'mixed' | 'unknown';
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
  const [selectedTab, setSelectedTab] = useState('scanner');
  const [manualCode, setManualCode] = useState('');
  const [manualResult, setManualResult] = useState<FileAnalysisResult | null>(null);

  const analyzeFileContent = useCallback(async (code: string, fileName: string): Promise<FileAnalysisResult> => {
    try {
      const { data, error } = await supabase.functions.invoke('analyze-translation-issues', { body: { code, fileName } });
      if (error) throw error;
      return { fileName, filePath: fileName, issues: data.issues || [], correctedCode: data.correctedCode || code, translations: data.translations || { fr: {}, en: {} }, status: 'done' };
    } catch (error) {
      return { fileName, filePath: fileName, issues: [], correctedCode: code, translations: { fr: {}, en: {} }, status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, []);

  const scanCategory = useCallback(async (category: string) => {
    const files = FILE_REGISTRY[category] || [];
    if (files.length === 0) return;
    setCurrentCategory(category);
    const categoryResult: CategoryResult = { category, files: files.map(f => ({ fileName: f, filePath: `src/${category}/${f}`, issues: [], correctedCode: '', translations: { fr: {}, en: {} }, status: 'pending' as const })), totalIssues: 0, status: 'scanning' };
    setResults(prev => { const existing = prev.findIndex(r => r.category === category); if (existing >= 0) { const updated = [...prev]; updated[existing] = categoryResult; return updated; } return [...prev, categoryResult]; });
    toast.info(`Catégorie ${category}: ${files.length} fichiers à analyser`);
    setResults(prev => { const idx = prev.findIndex(r => r.category === category); if (idx >= 0) { const updated = [...prev]; updated[idx] = { ...updated[idx], status: 'done' }; return updated; } return prev; });
    setCurrentCategory(null);
  }, []);

  const scanAllCategories = useCallback(async () => {
    setIsScanning(true); setProgress(0);
    const categories = Object.keys(FILE_REGISTRY);
    for (let i = 0; i < categories.length; i++) { await scanCategory(categories[i]); setProgress(((i + 1) / categories.length) * 100); }
    setIsScanning(false); toast.success('Scan terminé');
  }, [scanCategory]);

  const analyzeManualCode = useCallback(async () => {
    if (!manualCode.trim()) { toast.error('Veuillez coller du code à analyser'); return; }
    setManualResult({ fileName: 'manual-input', filePath: 'manual-input', issues: [], correctedCode: '', translations: { fr: {}, en: {} }, status: 'analyzing' });
    const result = await analyzeFileContent(manualCode, 'manual-input');
    setManualResult(result);
    if (result.issues.length === 0) toast.success('Aucun problème détecté !');
    else toast.warning(`${result.issues.length} problème(s) détecté(s)`);
  }, [manualCode, analyzeFileContent]);

  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); toast.success('Copié !'); };

  const getLanguageBadge = (lang?: string) => {
    switch (lang) {
      case 'fr': return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">🇫🇷 FR</Badge>;
      case 'en': return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">🇬🇧 EN</Badge>;
      case 'mixed': return <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30">🔀 Mixed</Badge>;
      default: return <Badge variant="outline" className="bg-muted">❓</Badge>;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) { case 'critical': return 'bg-destructive text-destructive-foreground'; case 'high': return 'bg-orange-500 text-white'; case 'medium': return 'bg-yellow-500 text-black'; default: return 'bg-muted'; }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Languages className="h-6 w-6 text-primary" />Scanner de Traductions Automatique</CardTitle>
          <CardDescription>Analysez les fichiers pour détecter les textes non traduits et les langues mixtes (FR/EN)</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="scanner">Scanner par Catégorie</TabsTrigger>
              <TabsTrigger value="manual">Analyse Manuelle</TabsTrigger>
            </TabsList>

            <TabsContent value="scanner" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(FILE_REGISTRY).map(([category, files]) => {
                  const result = results.find(r => r.category === category);
                  return (
                    <Button key={category} variant={result?.status === 'done' ? 'outline' : 'secondary'} size="sm" onClick={() => scanCategory(category)} disabled={isScanning} className="justify-start gap-2">
                      {currentCategory === category ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderOpen className="h-4 w-4" />}
                      <span className="truncate text-xs">{category}</span>
                      <Badge variant="secondary" className="ml-auto text-xs">{files.length}</Badge>
                    </Button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Button onClick={scanAllCategories} disabled={isScanning} className="flex-1">
                  {isScanning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}Scanner Tout
                </Button>
                <Button variant="outline" onClick={() => copyToClipboard(JSON.stringify(results, null, 2))} disabled={results.length === 0}><Download className="h-4 w-4 mr-2" />Exporter</Button>
              </div>
              {isScanning && <div className="space-y-2"><Progress value={progress} className="h-2" /><p className="text-sm text-muted-foreground text-center">Scan en cours... {Math.round(progress)}%</p></div>}
            </TabsContent>

            <TabsContent value="manual" className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Collez le code à analyser (TSX/JSX)</label>
                <textarea value={manualCode} onChange={(e) => setManualCode(e.target.value)} placeholder={`// Exemple:\n<Button>Enregistrer</Button>\ntoast.success("Opération réussie")`} className="w-full min-h-[200px] p-3 font-mono text-sm bg-muted rounded-lg border resize-y" />
              </div>
              <div className="flex gap-2">
                <Button onClick={analyzeManualCode} disabled={!manualCode.trim() || manualResult?.status === 'analyzing'} className="flex-1">
                  {manualResult?.status === 'analyzing' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}Analyser le Code
                </Button>
                <Button variant="outline" onClick={() => { setManualCode(''); setManualResult(null); }}><RefreshCw className="h-4 w-4 mr-2" />Reset</Button>
              </div>

              {manualResult && manualResult.status === 'done' && (
                <div className="space-y-4">
                  {manualResult.issues.length === 0 ? (
                    <Card className="bg-green-500/10 border-green-500/30"><CardContent className="py-6 text-center"><CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" /><p className="text-lg font-medium">Aucun texte en dur détecté</p></CardContent></Card>
                  ) : (
                    <>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center justify-between text-base">
                            <span className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" />{manualResult.issues.length} Problème(s) Détecté(s)</span>
                            <div className="flex gap-1 flex-wrap">
                              <Badge variant="destructive">{manualResult.issues.filter(i => i.severity === 'critical').length} critiques</Badge>
                              <Badge className="bg-orange-500 text-white">{manualResult.issues.filter(i => i.severity === 'high').length} élevés</Badge>
                            </div>
                          </CardTitle>
                          <div className="flex gap-2 mt-2 flex-wrap">
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-600">🇫🇷 {manualResult.issues.filter(i => i.detectedLanguage === 'fr').length} FR</Badge>
                            <Badge variant="outline" className="bg-green-500/10 text-green-600">🇬🇧 {manualResult.issues.filter(i => i.detectedLanguage === 'en').length} EN</Badge>
                            <Badge variant="outline" className="bg-purple-500/10 text-purple-600">🔀 {manualResult.issues.filter(i => i.detectedLanguage === 'mixed').length} Mixed</Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="h-[300px]">
                            <div className="space-y-3">
                              {manualResult.issues.map((issue) => (
                                <div key={issue.id} className="p-3 border rounded-lg bg-muted/30 space-y-2">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <Badge variant="outline" className="text-xs">{issue.type}</Badge>
                                    <Badge variant="outline" className="text-xs">Ligne {issue.line}</Badge>
                                    <Badge className={`text-xs ${getSeverityColor(issue.severity)}`}>{issue.severity}</Badge>
                                    {getLanguageBadge(issue.detectedLanguage)}
                                  </div>
                                  <p className="font-medium text-sm">"{issue.text}"</p>
                                  <code className="text-xs text-muted-foreground block bg-muted p-2 rounded overflow-x-auto">{issue.context}</code>
                                  <div className="pt-2 border-t space-y-2">
                                    <div className="flex items-center gap-2 text-sm flex-wrap">
                                      <Sparkles className="h-4 w-4 text-primary" /><span className="text-muted-foreground">Clé suggérée:</span>
                                      <code className="bg-primary/10 px-2 py-0.5 rounded text-primary font-mono text-xs">t.{issue.suggestedKey}</code>
                                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(`{t.${issue.suggestedKey}}`)} className="h-6 px-2"><Copy className="h-3 w-3" /></Button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      <div className="bg-blue-500/10 p-2 rounded"><span className="font-medium text-blue-600">🇫🇷 FR:</span> {issue.suggestedTranslation.fr}</div>
                                      <div className="bg-green-500/10 p-2 rounded"><span className="font-medium text-green-600">🇬🇧 EN:</span> {issue.suggestedTranslation.en}</div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center justify-between text-base">
                            <span className="flex items-center gap-2"><Wand2 className="h-5 w-5 text-green-500" />Code Corrigé</span>
                            <Button size="sm" variant="outline" onClick={() => copyToClipboard(manualResult.correctedCode)}><Copy className="h-4 w-4 mr-2" />Copier</Button>
                          </CardTitle>
                        </CardHeader>
                        <CardContent><ScrollArea className="h-[200px]"><pre className="text-xs font-mono bg-muted p-4 rounded-lg whitespace-pre-wrap">{manualResult.correctedCode}</pre></ScrollArea></CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center justify-between text-base">
                            <span className="flex items-center gap-2"><FileCode className="h-5 w-5 text-purple-500" />Traductions à Ajouter</span>
                            <Button size="sm" variant="outline" onClick={() => copyToClipboard(`// FR:\n${JSON.stringify(manualResult.translations.fr, null, 2)}\n\n// EN:\n${JSON.stringify(manualResult.translations.en, null, 2)}`)}><Copy className="h-4 w-4 mr-2" />Copier</Button>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            <div><h4 className="text-sm font-medium mb-2 text-blue-600">🇫🇷 Français</h4><pre className="text-xs font-mono bg-blue-500/10 p-3 rounded-lg overflow-x-auto">{JSON.stringify(manualResult.translations.fr, null, 2)}</pre></div>
                            <div><h4 className="text-sm font-medium mb-2 text-green-600">🇬🇧 English</h4><pre className="text-xs font-mono bg-green-500/10 p-3 rounded-lg overflow-x-auto">{JSON.stringify(manualResult.translations.en, null, 2)}</pre></div>
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
