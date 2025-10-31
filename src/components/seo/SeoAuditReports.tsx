import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Home, 
  ShoppingBag, 
  Folder, 
  FileText, 
  Globe,
  CheckCircle2,
  AlertCircle,
  XCircle,
  TrendingUp,
  Clock,
  Sparkles,
  BarChart3,
  Image as ImageIcon,
  Link as LinkIcon,
  Search,
  Zap,
  Loader2,
  Download,
  Brain
} from 'lucide-react';
import { SeoAuditAI } from './SeoAuditAI';

interface ScoreItem {
  label: string;
  score: number;
  maxScore: number;
  status: 'success' | 'warning' | 'error';
}

interface AuditSection {
  title: string;
  items: {
    label: string;
    value: string;
    status: 'success' | 'warning' | 'error';
    icon: React.ReactNode;
  }[];
}

export function SeoAuditReports() {
  const [searchParams] = useSearchParams();
  const [activeReport, setActiveReport] = useState('ai-analysis');
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [auditResults, setAuditResults] = useState<any>(null);
  const [latestReport, setLatestReport] = useState<any>(null);

  useEffect(() => {
    // Load latest audit report on mount
    loadLatestReport();
    
    // Check if we should auto-start audit from dashboard
    const autoStart = searchParams.get('autoStart');
    if (autoStart === 'true' && !latestReport) {
      startAudit();
    }
  }, [searchParams]);

  const loadLatestReport = async () => {
    try {
      const { data, error } = await supabase
        .from('seo_audit_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setLatestReport(data);
        setHasData(true);
        setAuditResults(data.audit_results);
      }
    } catch (error) {
      console.error('Error loading latest report:', error);
    }
  };

  const loadingSteps = [
    'Analyzing your homepage structure...',
    'Checking meta tags and SEO elements...',
    'Scanning all products...',
    'Reviewing collections...',
    'Analyzing blog articles...',
    'Generating recommendations...',
    'Finalizing your SEO audit...',
  ];

  const startAudit = async () => {
    setIsLoading(true);
    setLoadingStep(0);

    // Simulate loading steps with animation
    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev >= loadingSteps.length - 1) {
          clearInterval(stepInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 1500);

    try {
      const { data, error } = await supabase.functions.invoke('generate-seo-audit');

      if (error) throw error;

      clearInterval(stepInterval);
      setAuditResults(data);
      setHasData(true);
      
      // Reload the latest report from database
      await loadLatestReport();
      
      toast.success('Audit SEO complété avec succès!', {
        description: `Score global: ${data.globalScore}/100`,
      });
    } catch (error: any) {
      console.error('Error generating audit:', error);
      clearInterval(stepInterval);
      toast.error(error.message || 'Erreur lors de l\'audit SEO');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Vous devez être connecté pour exporter le rapport');
        return;
      }

      const response = await supabase.functions.invoke('export-seo-audit-pdf', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) throw response.error;

      // The response is HTML content
      const htmlBlob = new Blob([response.data], { type: 'text/html' });
      const htmlUrl = URL.createObjectURL(htmlBlob);
      
      // Open in new window
      const printWindow = window.open(htmlUrl, '_blank');
      
      if (printWindow) {
        // Auto-trigger print dialog after content loads
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 500);
        };
        
        toast.success('Rapport généré', {
          description: "Le rapport s'ouvre dans une nouvelle fenêtre. Vous pouvez l'imprimer ou l'enregistrer en PDF.",
        });
      } else {
        toast.error('Veuillez autoriser les pop-ups pour exporter le rapport');
      }
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error("Impossible d'exporter le rapport PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusIcon = (status: 'success' | 'warning' | 'error') => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'bg-green-100 dark:bg-green-950';
    if (percentage >= 60) return 'bg-yellow-100 dark:bg-yellow-950';
    return 'bg-red-100 dark:bg-red-950';
  };

  // Use real data from latestReport instead of mock data
  const homepageData = latestReport?.audit_results?.homepage || {
    globalScore: 0,
    scores: [],
    technical: [],
    content: [],
    recommendations: [],
  };

  const productData = latestReport?.audit_results?.products || {
    globalScore: 0,
    scores: [],
    elements: [],
    aiQuality: { score: 0, humanEdit: 0 },
  };

  const collectionData = latestReport?.audit_results?.collections || {
    globalScore: 0,
    scores: [],
    elements: [],
  };

  const blogData = latestReport?.audit_results?.blog || {
    globalScore: 0,
    scores: [],
    elements: [],
  };

  // Safe access to AI analysis data
  const aiAnalysis = latestReport?.audit_results?.aiAnalysis || {
    actionsByCategory: {
      homepage: [],
      products: [],
      collections: [],
      blog: [],
      images: []
    }
  };

  const globalData = {
    ...(latestReport?.audit_results?.global || {}),
    stats: latestReport?.audit_results?.global?.stats || {
      pagesAnalyzed: 0,
      averageScore: 82,
      titleOptimized: 89,
      metaMissing: 12,
      altGenerated: 78,
      h1Coherent: 94,
      scoreAbove80: 67,
    },
    evolution: latestReport?.audit_results?.global?.evolution || [
      { month: 'Janvier', score: 72 },
      { month: 'Février', score: 76 },
      { month: 'Mars', score: 82 },
    ],
  };

  const renderScoreCard = (data: { globalScore: number; scores: ScoreItem[] }) => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Score SEO Global
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className={`flex-shrink-0 w-32 h-32 rounded-full ${getScoreBgColor(data.globalScore, 100)} flex flex-col items-center justify-center`}>
            <div className={`text-5xl font-bold ${getScoreColor(data.globalScore, 100)}`}>
              {data.globalScore}
            </div>
            <div className="text-sm text-muted-foreground">/100</div>
          </div>
          <div className="flex-1 space-y-4 w-full">
            {data.scores.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{item.label}</span>
                  <span className="font-medium">{item.score}/{item.maxScore}</span>
                </div>
                <Progress value={(item.score / item.maxScore) * 100} className="h-2" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderAuditSection = (title: string, items: any[]) => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="mt-0.5">{getStatusIcon(item.status)}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {item.icon}
                  <span className="font-medium text-sm">{item.label}</span>
                </div>
                <p className="text-sm text-muted-foreground">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-2xl">
          <CardContent className="pt-12 pb-12">
            <div className="flex flex-col items-center justify-center space-y-8">
              {/* Animated Logo/Icon */}
              <div className="relative">
                <div className="absolute inset-0 animate-ping">
                  <BarChart3 className="w-24 h-24 text-blue-500 opacity-20" />
                </div>
                <BarChart3 className="w-24 h-24 text-blue-600 animate-pulse" />
              </div>

              {/* Main Title */}
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent animate-fade-in">
                  We're making your SEO Audit
                </h2>
                <p className="text-muted-foreground animate-fade-in">
                  Analyzing your entire Shopify store...
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full space-y-2">
                <Progress value={(loadingStep / loadingSteps.length) * 100} className="h-2" />
                <p className="text-sm text-center text-muted-foreground animate-fade-in">
                  {loadingSteps[loadingStep]}
                </p>
              </div>

              {/* Loading Steps */}
              <div className="w-full space-y-2 max-h-64 overflow-y-auto">
                {loadingSteps.slice(0, loadingStep + 1).map((step, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-sm animate-fade-in"
                  >
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className={index === loadingStep ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Empty state
  if (!hasData) {
    return (
      <div className="space-y-6">
        <Card className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950 dark:via-indigo-950 dark:to-purple-950 border-2 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
              <BarChart3 className="w-8 h-8 text-blue-600" />
              Rapports SEO Automatiques
            </CardTitle>
            <CardDescription className="text-base">
              Analyse complète de votre site Shopify : pages d'accueil, produits, collections et articles
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16 space-y-6">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-950 dark:to-purple-950 flex items-center justify-center">
              <BarChart3 className="w-16 h-16 text-blue-600" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold">No audit data yet</h3>
              <p className="text-muted-foreground max-w-md">
                Start your first SEO audit to get detailed insights about your store's performance
              </p>
            </div>
            <Button
              size="lg"
              onClick={startAudit}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Start SEO Audit
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <Card className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950 dark:via-indigo-950 dark:to-purple-950 border-2 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                <BarChart3 className="w-8 h-8 text-blue-600" />
                Rapports SEO Automatiques
              </CardTitle>
              <CardDescription className="text-base mt-2">
                Analyse complète de votre site Shopify : pages d'accueil, produits, collections et articles
              </CardDescription>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={startAudit}
                disabled={isLoading}
                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Refresh Audit
                  </>
                )}
              </Button>
              
              {latestReport && (
                <Button
                  onClick={handleExportPDF}
                  disabled={isExporting}
                  variant="outline"
                  className="gap-2"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Export...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Exporter en PDF
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs value={activeReport} onValueChange={setActiveReport} className="space-y-6">
        <TabsList className="grid grid-cols-3 md:grid-cols-6 gap-2 h-auto p-2">
          <TabsTrigger value="ai-analysis" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            <span className="hidden sm:inline">Analyse IA</span>
            <span className="sm:hidden">IA</span>
          </TabsTrigger>
          <TabsTrigger value="homepage" className="flex items-center gap-2">
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Page d'accueil</span>
            <span className="sm:hidden">Home</span>
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline">Produits</span>
            <span className="sm:hidden">Produits</span>
          </TabsTrigger>
          <TabsTrigger value="collections" className="flex items-center gap-2">
            <Folder className="w-4 h-4" />
            <span className="hidden sm:inline">Collections</span>
            <span className="sm:hidden">Collections</span>
          </TabsTrigger>
          <TabsTrigger value="blog" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Blog</span>
            <span className="sm:hidden">Blog</span>
          </TabsTrigger>
          <TabsTrigger value="global" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">Vue globale</span>
            <span className="sm:hidden">Global</span>
          </TabsTrigger>
        </TabsList>

        {/* AI Analysis Tab */}
        <TabsContent value="ai-analysis" className="space-y-6">
          {latestReport?.audit_results?.aiAnalysis ? (
            <SeoAuditAI 
              analysis={latestReport.audit_results.aiAnalysis}
              storeName={latestReport.audit_results.storeName || 'Votre boutique'}
            />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Brain className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Aucune analyse IA disponible</h3>
                <p className="text-muted-foreground mb-4">Lancez un nouvel audit pour obtenir une analyse détaillée</p>
                <Button onClick={startAudit} disabled={isLoading}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Démarrer l'analyse
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Homepage Report */}
        <TabsContent value="homepage" className="space-y-6">
          {renderScoreCard(homepageData)}
          {renderAuditSection('🔍 Analyse Technique', homepageData.technical)}
          {renderAuditSection('💡 Contenu & Sémantique', homepageData.content)}
          
          {/* Automated Actions */}
          {latestReport?.audit_results?.aiAnalysis?.actionsByCategory?.homepage && (
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-600" />
                  Actions Automatisées NewAI
                </CardTitle>
                <CardDescription>Actions rapides optimisées par l'IA</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {aiAnalysis.actionsByCategory.homepage.map((action: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{action.title}</span>
                          <Badge variant={action.impact === 'Élevé' ? 'destructive' : 'secondary'} className="text-xs">
                            {action.impact}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{action.count} éléments à optimiser</p>
                      </div>
                      <Button size="sm" className="gap-2">
                        <Zap className="w-4 h-4" />
                        Optimiser
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Recommandations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {homepageData.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5" />
                    <span className="text-sm">{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Report */}
        <TabsContent value="products" className="space-y-6">
          {renderScoreCard(productData)}
          {renderAuditSection('🛍️ Éléments SEO Produit', productData.elements)}
          
          {/* Automated Actions */}
          {latestReport?.audit_results?.aiAnalysis?.actionsByCategory?.products && (
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-600" />
                  Actions Automatisées NewAI
                </CardTitle>
                <CardDescription>Actions rapides optimisées par l'IA</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {aiAnalysis.actionsByCategory.products.map((action: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{action.title}</span>
                          <Badge variant={action.impact === 'Élevé' ? 'destructive' : 'secondary'} className="text-xs">
                            {action.impact}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{action.count} éléments à optimiser</p>
                      </div>
                      <Button size="sm" className="gap-2">
                        <Zap className="w-4 h-4" />
                        Optimiser
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Collections Report */}
        <TabsContent value="collections" className="space-y-6">
          {renderScoreCard(collectionData)}
          {renderAuditSection('🧩 Analyse Collection', collectionData.elements)}
          
          {/* Automated Actions */}
          {latestReport?.audit_results?.aiAnalysis?.actionsByCategory?.collections && (
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-600" />
                  Actions Automatisées NewAI
                </CardTitle>
                <CardDescription>Actions rapides optimisées par l'IA</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {aiAnalysis.actionsByCategory.collections.map((action: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{action.title}</span>
                          <Badge variant={action.impact === 'Élevé' ? 'destructive' : 'secondary'} className="text-xs">
                            {action.impact}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{action.count} éléments à optimiser</p>
                      </div>
                      <Button size="sm" className="gap-2">
                        <Zap className="w-4 h-4" />
                        Optimiser
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Blog Report */}
        <TabsContent value="blog" className="space-y-6">
          {renderScoreCard(blogData)}
          {renderAuditSection('📝 Analyse Article', blogData.elements)}
          
          {/* Automated Actions */}
          {latestReport?.audit_results?.aiAnalysis?.actionsByCategory?.blog && (
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-600" />
                  Actions Automatisées NewAI
                </CardTitle>
                <CardDescription>Actions rapides optimisées par l'IA</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {aiAnalysis.actionsByCategory.blog.map((action: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{action.title}</span>
                          <Badge variant={action.impact === 'Élevé' ? 'destructive' : 'secondary'} className="text-xs">
                            {action.impact}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{action.count} éléments à optimiser</p>
                      </div>
                      <Button size="sm" className="gap-2">
                        <Zap className="w-4 h-4" />
                        Optimiser
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Global Report */}
        <TabsContent value="global" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>📈 Vue d'ensemble du site</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold">{globalData.stats.pagesAnalyzed}</div>
                  <div className="text-sm text-muted-foreground">Pages analysées</div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold">{globalData.stats.averageScore}</div>
                  <div className="text-sm text-muted-foreground">Score moyen</div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold text-green-600">{globalData.stats.titleOptimized}%</div>
                  <div className="text-sm text-muted-foreground">Titles optimisés</div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold text-red-600">{globalData.stats.metaMissing}%</div>
                  <div className="text-sm text-muted-foreground">Meta manquantes</div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold text-blue-600">{globalData.stats.altGenerated}%</div>
                  <div className="text-sm text-muted-foreground">Alt générés IA</div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold text-purple-600">{globalData.stats.scoreAbove80}%</div>
                  <div className="text-sm text-muted-foreground">Score &gt; 80</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Images ALT Actions */}
          {latestReport?.audit_results?.aiAnalysis?.actionsByCategory?.images && (
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Optimisation Images ALT
                </CardTitle>
                <CardDescription>Actions automatisées pour les images</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {aiAnalysis.actionsByCategory.images.map((action: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{action.title}</span>
                          <Badge variant={action.impact === 'Élevé' ? 'destructive' : 'secondary'} className="text-xs">
                            {action.impact}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{action.count} images à optimiser</p>
                      </div>
                      <Button size="sm" className="gap-2">
                        <Zap className="w-4 h-4" />
                        Optimiser
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Évolution mensuelle
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {globalData.evolution.map((month, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm">{month.month}</span>
                    <div className="flex items-center gap-3 flex-1 ml-4">
                      <Progress value={month.score} className="h-2 flex-1" />
                      <span className="text-sm font-medium w-12">{month.score}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
