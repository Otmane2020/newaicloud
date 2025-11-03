import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { calculateSeoConfidence } from '@/lib/seoQuality';
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
  Brain,
  Target,
  Settings as SettingsIcon,
  FileCode
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

// Types for quality analysis
interface QualityAnalysis {
  score: number;
  issues: string[];
  optimal: boolean;
}

// Analyze SEO Title Quality
const analyzeTitleQuality = (title: string | null, productTitle: string): QualityAnalysis => {
  if (!title) return { score: 0, issues: ['Titre SEO manquant'], optimal: false };
  
  const length = title.length;
  const issues: string[] = [];
  let score = 100;
  
  if (length < 30) { score -= 30; issues.push('Trop court (< 30 caractères)'); }
  if (length > 70) { score -= 20; issues.push('Trop long (> 70 caractères)'); }
  if (length < 50 || length > 60) score -= 10;
  
  const containsKeyword = productTitle && title.toLowerCase().includes(productTitle.toLowerCase().substring(0, 20));
  if (!containsKeyword) { score -= 15; issues.push('Ne contient pas le mot-clé principal'); }
  
  return { 
    score: Math.max(0, score), 
    issues, 
    optimal: length >= 50 && length <= 60 && containsKeyword 
  };
};

// Analyze Meta Description Quality
const analyzeDescriptionQuality = (desc: string | null): QualityAnalysis => {
  if (!desc) return { score: 0, issues: ['Description manquante'], optimal: false };
  
  const length = desc.length;
  const issues: string[] = [];
  let score = 100;
  
  if (length < 70) { score -= 40; issues.push('Trop courte (< 70 caractères)'); }
  if (length > 200) { score -= 30; issues.push('Trop longue (> 200 caractères)'); }
  if (length < 120 || length > 160) score -= 15;
  
  const hasCallToAction = /découvrez|achetez|commandez|profitez|obtenez|explorez|trouvez/i.test(desc);
  if (!hasCallToAction) { score -= 10; issues.push('Manque d\'appel à l\'action'); }
  
  return { 
    score: Math.max(0, score), 
    issues, 
    optimal: length >= 120 && length <= 160 && hasCallToAction 
  };
};

// Analyze ALT Text Quality
const analyzeAltTextQuality = (alt: string | null): QualityAnalysis => {
  if (!alt) return { score: 0, issues: ['ALT text manquant'], optimal: false };
  
  const length = alt.length;
  const issues: string[] = [];
  let score = 100;
  
  if (length < 10) { score -= 50; issues.push('Trop court (< 10 caractères)'); }
  if (length > 125) { score -= 20; issues.push('Trop long (> 125 caractères)'); }
  
  if (/\.(jpg|png|jpeg|webp|gif)$/i.test(alt)) {
    score -= 40;
    issues.push('Ressemble à un nom de fichier');
  }
  
  const isGeneric = /^(image|photo|picture|img)$/i.test(alt.trim());
  if (isGeneric) {
    score -= 30;
    issues.push('Trop générique');
  }
  
  return { 
    score: Math.max(0, score), 
    issues, 
    optimal: length >= 50 && length <= 125 && !isGeneric 
  };
};

// Score badge helper
const getScoreBadge = (score: number) => {
  if (score >= 90) return { label: 'Excellent', variant: 'default' as const, color: 'text-green-600' };
  if (score >= 70) return { label: 'Bon', variant: 'secondary' as const, color: 'text-blue-600' };
  if (score >= 40) return { label: 'À améliorer', variant: 'outline' as const, color: 'text-orange-600' };
  return { label: 'Critique', variant: 'destructive' as const, color: 'text-red-600' };
};

// Score progress component
const ScoreProgress = ({ score }: { score: number }) => {
  const getColor = (score: number) => {
    if (score >= 90) return 'bg-green-600';
    if (score >= 70) return 'bg-blue-600';
    if (score >= 40) return 'bg-orange-600';
    return 'bg-red-600';
  };
  
  return (
    <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
      <div 
        className={`h-full transition-all ${getColor(score)}`}
        style={{ width: `${score}%` }}
      />
    </div>
  );
};

export function SeoAuditReports() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeReport, setActiveReport] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [auditResults, setAuditResults] = useState<any>(null);
  const [latestReport, setLatestReport] = useState<any>(null);

  useEffect(() => {
    // Load latest audit report on mount
    loadLatestReport();
  }, []);

  useEffect(() => {
    // Check if we should auto-start audit from dashboard
    const autoStart = searchParams.get('autoStart');
    if (autoStart === 'true') {
      // Remove the autoStart param to avoid re-triggering
      searchParams.delete('autoStart');
      window.history.replaceState({}, '', `${window.location.pathname}?${searchParams.toString()}`);
      startAudit();
    }
  }, [searchParams]);

  // Query for Overview tab data
  const { data: overviewData, isLoading: overviewLoading } = useQuery({
    queryKey: ['seo-overview', user?.id],
    queryFn: async () => {
      const { data: products, error: productsError } = await supabase
        .from('shopify_products')
        .select('id, title, seo_title, seo_description, description, tags, seo_synced_to_shopify')
        .eq('seller_id', user?.id);

      if (productsError) throw productsError;

      const productIds = products?.map(p => p.id) || [];

      const { data: images, error: imagesError } = await supabase
        .from('product_images')
        .select('id, alt_text, src')
        .in('product_id', productIds);

      if (imagesError) throw imagesError;

      const { data: homepage } = await supabase
        .from('shopify_pages')
        .select('*')
        .eq('user_id', user?.id)
        .or('handle.eq.index,handle.eq.home,handle.eq.homepage')
        .maybeSingle();

      const titleAnalyses = products?.map(p => analyzeTitleQuality(p.seo_title, p.title)) || [];
      const confidenceScores = products?.map(p => calculateSeoConfidence(p.seo_title, p.seo_description)) || [];
      
      const avgTitleScore = titleAnalyses.length > 0
        ? Math.round(
            (titleAnalyses.reduce((sum, a) => sum + a.score, 0) * 0.6 / titleAnalyses.length) +
            (confidenceScores.reduce((sum, c) => sum + c, 0) * 0.4 / confidenceScores.length)
          )
        : 0;
      const titleIssuesCount = titleAnalyses.filter(a => a.issues.length > 0).length;

      const descAnalyses = products?.map(p => analyzeDescriptionQuality(p.seo_description)) || [];
      
      const avgDescScore = descAnalyses.length > 0
        ? Math.round(
            (descAnalyses.reduce((sum, a) => sum + a.score, 0) * 0.6 / descAnalyses.length) +
            (confidenceScores.reduce((sum, c) => sum + c, 0) * 0.4 / confidenceScores.length)
          )
        : 0;
      const descIssuesCount = descAnalyses.filter(a => a.issues.length > 0).length;

      const altAnalyses = images?.map(img => analyzeAltTextQuality(img.alt_text)) || [];
      const avgAltScore = altAnalyses.length > 0
        ? Math.round(altAnalyses.reduce((sum, a) => sum + a.score, 0) / altAnalyses.length)
        : 0;
      const altIssuesCount = altAnalyses.filter(a => a.issues.length > 0).length;

      const homepageScore = homepage
        ? (homepage.seo_title ? 33 : 0) + 
          (homepage.seo_description ? 33 : 0) + 
          (homepage.optimized ? 34 : 0)
        : 0;

      const productsWithDesc = products?.filter(p => p.description && p.description.length >= 100).length || 0;
      const productsWithTags = products?.filter(p => p.tags && p.tags.length > 0).length || 0;
      const contentScore = products && products.length > 0
        ? Math.round(((productsWithDesc / products.length) * 60) + ((productsWithTags / products.length) * 40))
        : 0;

      const syncedProducts = products?.filter(p => p.seo_synced_to_shopify).length || 0;
      const imagesWithAlt = images?.filter(img => img.alt_text).length || 0;
      const technicalScore = products && products.length > 0 && images && images.length > 0
        ? Math.round(((syncedProducts / products.length) * 50) + ((imagesWithAlt / images.length) * 50))
        : 0;

      const globalScore = Math.round(
        (avgTitleScore * 0.2 + avgDescScore * 0.2 + avgAltScore * 0.15 + 
         homepageScore * 0.15 + contentScore * 0.15 + technicalScore * 0.15)
      );

      return {
        globalScore,
        categories: {
          titleQuality: { score: avgTitleScore, issuesCount: titleIssuesCount, total: products?.length || 0 },
          descQuality: { score: avgDescScore, issuesCount: descIssuesCount, total: products?.length || 0 },
          altQuality: { score: avgAltScore, issuesCount: altIssuesCount, total: images?.length || 0 },
          homepageSeo: { score: homepageScore, hasHomepage: !!homepage },
          contentQuality: { score: contentScore, withDesc: productsWithDesc, withTags: productsWithTags, total: products?.length || 0 },
          technicalSeo: { score: technicalScore, synced: syncedProducts, imagesWithAlt, totalImages: images?.length || 0 }
        },
        details: {
          titleAnalyses,
          descAnalyses,
          altAnalyses,
          products: products || [],
          images: images || [],
          homepage
        }
      };
    },
    enabled: !!user?.id && activeReport === 'overview'
  });

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
    if (percentage >= 80) return 'text-[#22c55e]';
    if (percentage >= 60) return 'text-[#FF8000]';
    return 'text-[#FF3333]';
  };

  const getScoreBgColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'bg-[#22c55e]/10 border-[#22c55e]/30';
    if (percentage >= 60) return 'bg-[#FF8000]/10 border-[#FF8000]/30';
    return 'bg-[#FF3333]/10 border-[#FF3333]/30';
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
        <TabsList className="grid grid-cols-3 md:grid-cols-7 gap-2 h-auto p-2">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            <span className="hidden sm:inline">Vue d'ensemble</span>
            <span className="sm:hidden">Vue</span>
          </TabsTrigger>
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

        {/* Overview Tab - Complete KPIs Dashboard */}
        <TabsContent value="overview" className="space-y-4 sm:space-y-6">
          {overviewLoading ? (
            <div className="space-y-6">
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-muted rounded w-1/4"></div>
                <div className="h-32 bg-muted rounded"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-24 bg-muted rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          ) : overviewData ? (
            <>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold mb-2">Audit SEO Professionnel</h2>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Analyse détaillée de votre optimisation SEO selon les standards Yoast
                </p>
              </div>

              {/* Global Score */}
              <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    Score SEO Global
                  </CardTitle>
                  <CardDescription>
                    Évaluation globale basée sur 6 catégories d'audit
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                    <div className="flex-1 w-full">
                      <div className="flex items-baseline gap-2 mb-3 justify-center sm:justify-start">
                        <span className="text-4xl sm:text-6xl font-bold text-primary">{overviewData.globalScore}</span>
                        <span className="text-2xl sm:text-3xl text-muted-foreground">/100</span>
                      </div>
                      <ScoreProgress score={overviewData.globalScore} />
                    </div>
                    <div className="text-center sm:text-right">
                      <Badge variant={getScoreBadge(overviewData.globalScore).variant} className="text-base sm:text-lg px-3 sm:px-4 py-1.5 sm:py-2">
                        {getScoreBadge(overviewData.globalScore).label}
                      </Badge>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                        {overviewData.globalScore >= 90 ? 'Excellent travail !' :
                         overviewData.globalScore >= 70 ? 'Bon niveau SEO' :
                         overviewData.globalScore >= 40 ? 'Améliorations nécessaires' :
                         'Optimisation urgente requise'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Audit - 6 Categories */}
              <Card>
                <CardHeader>
                  <CardTitle>Audit détaillé par catégorie</CardTitle>
                  <CardDescription>
                    Analyse approfondie de chaque aspect SEO
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 sm:space-y-3">
                  {/* SEO Title Quality */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors gap-3">
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 w-full">
                      <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm sm:text-base font-semibold">Qualité des titres SEO</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {overviewData.categories.titleQuality.issuesCount} problèmes / {overviewData.categories.titleQuality.total}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                      <div className="w-20 sm:w-32">
                        <ScoreProgress score={overviewData.categories.titleQuality.score} />
                      </div>
                      <div className="text-right min-w-[60px] sm:min-w-[80px]">
                        <span className={`text-xl sm:text-2xl font-bold ${getScoreBadge(overviewData.categories.titleQuality.score).color}`}>
                          {overviewData.categories.titleQuality.score}
                        </span>
                        <span className="text-xs sm:text-sm text-muted-foreground">/100</span>
                      </div>
                      <Badge variant={getScoreBadge(overviewData.categories.titleQuality.score).variant} className="text-xs sm:text-sm">
                        {getScoreBadge(overviewData.categories.titleQuality.score).label}
                      </Badge>
                    </div>
                  </div>

                  {/* Meta Description Quality */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors gap-3">
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 w-full">
                      <FileCode className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm sm:text-base font-semibold">Qualité des meta descriptions</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {overviewData.categories.descQuality.issuesCount} descriptions problématiques sur {overviewData.categories.descQuality.total}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                      <div className="w-20 sm:w-32">
                        <ScoreProgress score={overviewData.categories.descQuality.score} />
                      </div>
                      <div className="text-right min-w-[60px] sm:min-w-[80px]">
                        <span className={`text-xl sm:text-2xl font-bold ${getScoreBadge(overviewData.categories.descQuality.score).color}`}>
                          {overviewData.categories.descQuality.score}
                        </span>
                        <span className="text-xs sm:text-sm text-muted-foreground">/100</span>
                      </div>
                      <Badge variant={getScoreBadge(overviewData.categories.descQuality.score).variant} className="text-xs sm:text-sm">
                        {getScoreBadge(overviewData.categories.descQuality.score).label}
                      </Badge>
                    </div>
                  </div>

                  {/* Image ALT Quality */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors gap-3">
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 w-full">
                      <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm sm:text-base font-semibold">Qualité des ALT texts images</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {overviewData.categories.altQuality.issuesCount} images avec problèmes sur {overviewData.categories.altQuality.total}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                      <div className="w-20 sm:w-32">
                        <ScoreProgress score={overviewData.categories.altQuality.score} />
                      </div>
                      <div className="text-right min-w-[60px] sm:min-w-[80px]">
                        <span className={`text-xl sm:text-2xl font-bold ${getScoreBadge(overviewData.categories.altQuality.score).color}`}>
                          {overviewData.categories.altQuality.score}
                        </span>
                        <span className="text-xs sm:text-sm text-muted-foreground">/100</span>
                      </div>
                      <Badge variant={getScoreBadge(overviewData.categories.altQuality.score).variant} className="text-xs sm:text-sm">
                        {getScoreBadge(overviewData.categories.altQuality.score).label}
                      </Badge>
                    </div>
                  </div>

                  {/* Homepage SEO */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors gap-3">
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 w-full">
                      <Home className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm sm:text-base font-semibold">SEO de la page d'accueil</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {overviewData.categories.homepageSeo.hasHomepage ? 'Page importée' : 'Page non importée'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                      <div className="w-20 sm:w-32">
                        <ScoreProgress score={overviewData.categories.homepageSeo.score} />
                      </div>
                      <div className="text-right min-w-[60px] sm:min-w-[80px]">
                        <span className={`text-xl sm:text-2xl font-bold ${getScoreBadge(overviewData.categories.homepageSeo.score).color}`}>
                          {overviewData.categories.homepageSeo.score}
                        </span>
                        <span className="text-xs sm:text-sm text-muted-foreground">/100</span>
                      </div>
                      <Badge variant={getScoreBadge(overviewData.categories.homepageSeo.score).variant} className="text-xs sm:text-sm">
                        {getScoreBadge(overviewData.categories.homepageSeo.score).label}
                      </Badge>
                    </div>
                  </div>

                  {/* Content Quality */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors gap-3">
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 w-full">
                      <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm sm:text-base font-semibold">Qualité du contenu</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Descriptions: {overviewData.categories.contentQuality.withDesc}/{overviewData.categories.contentQuality.total} • 
                          Tags: {overviewData.categories.contentQuality.withTags}/{overviewData.categories.contentQuality.total}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                      <div className="w-20 sm:w-32">
                        <ScoreProgress score={overviewData.categories.contentQuality.score} />
                      </div>
                      <div className="text-right min-w-[60px] sm:min-w-[80px]">
                        <span className={`text-xl sm:text-2xl font-bold ${getScoreBadge(overviewData.categories.contentQuality.score).color}`}>
                          {overviewData.categories.contentQuality.score}
                        </span>
                        <span className="text-xs sm:text-sm text-muted-foreground">/100</span>
                      </div>
                      <Badge variant={getScoreBadge(overviewData.categories.contentQuality.score).variant} className="text-xs sm:text-sm">
                        {getScoreBadge(overviewData.categories.contentQuality.score).label}
                      </Badge>
                    </div>
                  </div>

                  {/* Technical SEO */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors gap-3">
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 w-full">
                      <SettingsIcon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm sm:text-base font-semibold">SEO technique</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Synchronisation Shopify et optimisations techniques
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                      <div className="w-20 sm:w-32">
                        <ScoreProgress score={overviewData.categories.technicalSeo.score} />
                      </div>
                      <div className="text-right min-w-[60px] sm:min-w-[80px]">
                        <span className={`text-xl sm:text-2xl font-bold ${getScoreBadge(overviewData.categories.technicalSeo.score).color}`}>
                          {overviewData.categories.technicalSeo.score}
                        </span>
                        <span className="text-xs sm:text-sm text-muted-foreground">/100</span>
                      </div>
                      <Badge variant={getScoreBadge(overviewData.categories.technicalSeo.score).variant} className="text-xs sm:text-sm">
                        {getScoreBadge(overviewData.categories.technicalSeo.score).label}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Priority Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Recommandations prioritaires
                  </CardTitle>
                  <CardDescription>
                    Actions à prendre pour améliorer votre SEO
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(() => {
                    const urgentIssues: string[] = [];
                    const importantIssues: string[] = [];
                    const improvementIssues: string[] = [];

                    if (overviewData.categories.homepageSeo.score === 0) {
                      urgentIssues.push('Page d\'accueil SEO manquante ou non optimisée (impact élevé)');
                    }
                    if (overviewData.categories.altQuality.score < 40) {
                      urgentIssues.push(`${overviewData.categories.altQuality.issuesCount} images avec ALT text critique`);
                    }
                    if (overviewData.categories.titleQuality.score < 40) {
                      importantIssues.push(`${overviewData.categories.titleQuality.issuesCount} produits avec titres SEO problématiques`);
                    }
                    if (overviewData.categories.descQuality.score < 40) {
                      importantIssues.push(`${overviewData.categories.descQuality.issuesCount} produits avec descriptions SEO problématiques`);
                    }
                    if (overviewData.categories.contentQuality.score < 70) {
                      importantIssues.push(`Qualité du contenu à améliorer (descriptions, tags)`);
                    }
                    if (overviewData.categories.titleQuality.score >= 40 && overviewData.categories.titleQuality.score < 90) {
                      improvementIssues.push(`Optimiser ${overviewData.categories.titleQuality.issuesCount} titres SEO`);
                    }
                    if (overviewData.categories.descQuality.score >= 40 && overviewData.categories.descQuality.score < 90) {
                      improvementIssues.push(`Améliorer ${overviewData.categories.descQuality.issuesCount} descriptions SEO`);
                    }
                    if (overviewData.categories.altQuality.score >= 40 && overviewData.categories.altQuality.score < 90) {
                      improvementIssues.push(`Enrichir ${overviewData.categories.altQuality.issuesCount} ALT texts`);
                    }

                    return (
                      <>
                        {urgentIssues.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 mb-2">
                              <XCircle className="w-5 h-5 text-red-600" />
                              <h3 className="font-semibold text-red-600">URGENT</h3>
                            </div>
                            {urgentIssues.map((issue, idx) => (
                              <div key={idx} className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
                                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-900 dark:text-red-100">{issue}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {importantIssues.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertCircle className="w-5 h-5 text-orange-600" />
                              <h3 className="font-semibold text-orange-600">IMPORTANT</h3>
                            </div>
                            {importantIssues.map((issue, idx) => (
                              <div key={idx} className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-900">
                                <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-orange-900 dark:text-orange-100">{issue}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {improvementIssues.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle2 className="w-5 h-5 text-blue-600" />
                              <h3 className="font-semibold text-blue-600">AMÉLIORATION</h3>
                            </div>
                            {improvementIssues.map((issue, idx) => (
                              <div key={idx} className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                                <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-blue-900 dark:text-blue-100">{issue}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {urgentIssues.length === 0 && importantIssues.length === 0 && improvementIssues.length === 0 && (
                          <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-semibold text-green-900 dark:text-green-100">
                                Excellent travail ! 🎉
                              </p>
                              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                                Votre optimisation SEO est au top. Continuez à maintenir ce niveau d'excellence.
                              </p>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Detailed Issues Accordion */}
              <Card>
                <CardHeader>
                  <CardTitle>Détails des problèmes détectés</CardTitle>
                  <CardDescription>
                    Cliquez pour voir les problèmes spécifiques par catégorie
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="titles">
                      <AccordionTrigger>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          <span>Problèmes de titres SEO ({overviewData.categories.titleQuality.issuesCount})</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pt-2">
                          {overviewData.details.titleAnalyses
                            .map((analysis: any, idx: number) => ({ analysis, product: overviewData.details.products[idx] }))
                            .filter(({ analysis }: any) => analysis.issues.length > 0)
                            .slice(0, 10)
                            .map(({ analysis, product }: any, idx: number) => (
                              <div key={idx} className="p-3 bg-muted rounded-lg">
                                <p className="font-medium text-sm">{product.title}</p>
                                <div className="mt-1 space-y-1">
                                  {analysis.issues.map((issue: string, i: number) => (
                                    <p key={i} className="text-xs text-red-600 dark:text-red-400">• {issue}</p>
                                  ))}
                                </div>
                                {product.seo_title && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Titre actuel: "{product.seo_title}" ({product.seo_title.length} car.)
                                  </p>
                                )}
                              </div>
                            ))}
                          {overviewData.categories.titleQuality.issuesCount > 10 && (
                            <p className="text-sm text-muted-foreground text-center pt-2">
                              ... et {overviewData.categories.titleQuality.issuesCount - 10} autres problèmes
                            </p>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="descriptions">
                      <AccordionTrigger>
                        <div className="flex items-center gap-2">
                          <FileCode className="w-4 h-4" />
                          <span>Problèmes de meta descriptions ({overviewData.categories.descQuality.issuesCount})</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pt-2">
                          {overviewData.details.descAnalyses
                            .map((analysis: any, idx: number) => ({ analysis, product: overviewData.details.products[idx] }))
                            .filter(({ analysis }: any) => analysis.issues.length > 0)
                            .slice(0, 10)
                            .map(({ analysis, product }: any, idx: number) => (
                              <div key={idx} className="p-3 bg-muted rounded-lg">
                                <p className="font-medium text-sm">{product.title}</p>
                                <div className="mt-1 space-y-1">
                                  {analysis.issues.map((issue: string, i: number) => (
                                    <p key={i} className="text-xs text-red-600 dark:text-red-400">• {issue}</p>
                                  ))}
                                </div>
                                {product.seo_description && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Description actuelle: "{product.seo_description.substring(0, 100)}..." ({product.seo_description.length} car.)
                                  </p>
                                )}
                              </div>
                            ))}
                          {overviewData.categories.descQuality.issuesCount > 10 && (
                            <p className="text-sm text-muted-foreground text-center pt-2">
                              ... et {overviewData.categories.descQuality.issuesCount - 10} autres problèmes
                            </p>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="alt">
                      <AccordionTrigger>
                        <div className="flex items-center gap-2">
                          <ImageIcon className="w-4 h-4" />
                          <span>Problèmes d'ALT texts ({overviewData.categories.altQuality.issuesCount})</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pt-2">
                          {overviewData.details.altAnalyses
                            .map((analysis: any, idx: number) => ({ analysis, image: overviewData.details.images[idx] }))
                            .filter(({ analysis }: any) => analysis.issues.length > 0)
                            .slice(0, 10)
                            .map(({ analysis, image }: any, idx: number) => (
                              <div key={idx} className="p-3 bg-muted rounded-lg">
                                <div className="flex items-start gap-3">
                                  <img src={image.src} alt="" className="w-16 h-16 object-cover rounded" />
                                  <div className="flex-1">
                                    <div className="space-y-1">
                                      {analysis.issues.map((issue: string, i: number) => (
                                        <p key={i} className="text-xs text-red-600 dark:text-red-400">• {issue}</p>
                                      ))}
                                    </div>
                                    {image.alt_text && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        ALT actuel: "{image.alt_text}"
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          {overviewData.categories.altQuality.issuesCount > 10 && (
                            <p className="text-sm text-muted-foreground text-center pt-2">
                              ... et {overviewData.categories.altQuality.issuesCount - 10} autres problèmes
                            </p>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Target className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Aucune donnée disponible</h3>
                <p className="text-muted-foreground">Importez vos produits pour voir l'analyse détaillée</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

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
