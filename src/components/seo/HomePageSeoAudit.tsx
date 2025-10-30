import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Sparkles,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Code,
  Share2,
  Loader2
} from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface SeoElements {
  title: string;
  metaDescription: string;
  h1: string;
  h2s: string[];
  altsCount: number;
  totalImages: number;
  canonical: string;
  hasSchema: boolean;
  hasOpenGraph: boolean;
  hasTwitterCard: boolean;
  httpsEnabled: boolean;
  contentLength: number;
  internalLinks: number;
  externalLinks: number;
}

interface ScoreBreakdown {
  structure: number;
  content: number;
  technical: number;
  bonus: number;
}

interface AuditResult {
  score: number;
  breakdown: ScoreBreakdown;
  issues: string[];
  elements: SeoElements;
  recommendations: string[];
  analyzedUrl: string;
  analyzedAt: string;
}

export function HomePageSeoAudit() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

  const analyzeHomepage = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('audit-homepage-seo');

      if (error) throw error;

      setResult(data);
      toast({
        title: t('seo.audit.success'),
        description: t('seo.audit.analysisComplete'),
      });
    } catch (error: any) {
      console.error('Error analyzing homepage:', error);
      toast({
        title: t('seo.audit.error'),
        description: error.message || t('seo.audit.analysisError'),
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-950';
    if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-950';
    return 'bg-red-100 dark:bg-red-950';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return t('seo.audit.excellent');
    if (score >= 60) return t('seo.audit.good');
    if (score >= 40) return t('seo.audit.average');
    return t('seo.audit.poor');
  };

  const getPriorityIcon = (index: number) => {
    if (index === 0) return <AlertCircle className="w-4 h-4 text-red-500" />;
    if (index < 3) return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    return <AlertCircle className="w-4 h-4 text-blue-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <Card className="bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-purple-950 dark:via-pink-950 dark:to-orange-950 border-2 border-purple-200 dark:border-purple-800">
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <Search className="w-6 h-6 text-purple-600" />
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {t('seo.audit.title')}
                </CardTitle>
              </div>
              <CardDescription className="text-base">
                {t('seo.audit.description')}
              </CardDescription>
              <div className="flex flex-wrap gap-3 pt-2">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-purple-600" />
                  <span className="font-medium">{t('seo.audit.feature1')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="font-medium">{t('seo.audit.feature2')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Sparkles className="w-4 h-4 text-pink-600" />
                  <span className="font-medium">{t('seo.audit.feature3')}</span>
                </div>
              </div>
            </div>
            <Button
              size="lg"
              onClick={analyzeHomepage}
              disabled={isAnalyzing}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 gap-2 shadow-lg"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t('seo.audit.analyzing')}
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  {t('seo.audit.analyzeButton')}
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Score Global */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                {t('seo.audit.globalScore')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className={`flex-shrink-0 w-32 h-32 rounded-full ${getScoreBgColor(result.score)} flex flex-col items-center justify-center`}>
                  <div className={`text-5xl font-bold ${getScoreColor(result.score)}`}>
                    {result.score}
                  </div>
                  <div className="text-sm text-muted-foreground">/100</div>
                </div>
                <div className="flex-1 space-y-4 w-full">
                  <div>
                    <Badge className={getScoreBgColor(result.score)}>
                      {getScoreLabel(result.score)}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>{t('seo.audit.structure')}</span>
                      <span className="font-medium">{result.breakdown.structure}/30</span>
                    </div>
                    <Progress value={(result.breakdown.structure / 30) * 100} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>{t('seo.audit.content')}</span>
                      <span className="font-medium">{result.breakdown.content}/30</span>
                    </div>
                    <Progress value={(result.breakdown.content / 30) * 100} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>{t('seo.audit.technical')}</span>
                      <span className="font-medium">{result.breakdown.technical}/25</span>
                    </div>
                    <Progress value={(result.breakdown.technical / 25) * 100} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>{t('seo.audit.bonus')}</span>
                      <span className="font-medium">{result.breakdown.bonus}/15</span>
                    </div>
                    <Progress value={(result.breakdown.bonus / 15) * 100} className="h-2" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {t('seo.audit.detailedAnalysis')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  {result.elements.title ? <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-500 mt-0.5" />}
                  <div className="flex-1">
                    <div className="font-medium">{t('seo.audit.titleTag')}</div>
                    <div className="text-sm text-muted-foreground">
                      {result.elements.title ? `"${result.elements.title}" (${result.elements.title.length} ${t('seo.audit.characters')})` : t('seo.audit.absent')}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  {result.elements.metaDescription ? <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-500 mt-0.5" />}
                  <div className="flex-1">
                    <div className="font-medium">{t('seo.audit.metaDescription')}</div>
                    <div className="text-sm text-muted-foreground">
                      {result.elements.metaDescription ? `${result.elements.metaDescription.length} ${t('seo.audit.characters')}` : t('seo.audit.absent')}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  {result.elements.h1 ? <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-500 mt-0.5" />}
                  <div className="flex-1">
                    <div className="font-medium">{t('seo.audit.h1Tag')}</div>
                    <div className="text-sm text-muted-foreground">
                      {result.elements.h1 ? `"${result.elements.h1}"` : t('seo.audit.absent')}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  {result.elements.h2s.length > 0 ? <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-500 mt-0.5" />}
                  <div className="flex-1">
                    <div className="font-medium">{t('seo.audit.h2Tags')}</div>
                    <div className="text-sm text-muted-foreground">
                      {result.elements.h2s.length} {t('seo.audit.found')}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <ImageIcon className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium">{t('seo.audit.imageAlts')}</div>
                    <div className="text-sm text-muted-foreground">
                      {result.elements.altsCount}/{result.elements.totalImages} {t('seo.audit.imagesWithAlt')}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  {result.elements.canonical ? <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-500 mt-0.5" />}
                  <div className="flex-1">
                    <div className="font-medium">{t('seo.audit.canonical')}</div>
                    <div className="text-sm text-muted-foreground">
                      {result.elements.canonical ? t('seo.audit.present') : t('seo.audit.absent')}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  {result.elements.hasSchema ? <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-500 mt-0.5" />}
                  <div className="flex-1">
                    <div className="font-medium">{t('seo.audit.schemaOrg')}</div>
                    <div className="text-sm text-muted-foreground">
                      {result.elements.hasSchema ? t('seo.audit.detected') : t('seo.audit.absent')}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  {result.elements.hasOpenGraph ? <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-500 mt-0.5" />}
                  <div className="flex-1">
                    <div className="font-medium">{t('seo.audit.openGraph')}</div>
                    <div className="text-sm text-muted-foreground">
                      {result.elements.hasOpenGraph ? t('seo.audit.present') : t('seo.audit.absent')}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  {result.elements.hasTwitterCard ? <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-500 mt-0.5" />}
                  <div className="flex-1">
                    <div className="font-medium">{t('seo.audit.twitterCard')}</div>
                    <div className="text-sm text-muted-foreground">
                      {result.elements.hasTwitterCard ? t('seo.audit.present') : t('seo.audit.absent')}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <LinkIcon className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium">{t('seo.audit.internalLinks')}</div>
                    <div className="text-sm text-muted-foreground">
                      {result.elements.internalLinks} {t('seo.audit.found')}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Code className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium">{t('seo.audit.contentLength')}</div>
                    <div className="text-sm text-muted-foreground">
                      {result.elements.contentLength} {t('seo.audit.characters')}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  {result.elements.httpsEnabled ? <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-500 mt-0.5" />}
                  <div className="flex-1">
                    <div className="font-medium">HTTPS</div>
                    <div className="text-sm text-muted-foreground">
                      {result.elements.httpsEnabled ? t('seo.audit.enabled') : t('seo.audit.disabled')}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Recommendations */}
          {result.recommendations && result.recommendations.length > 0 && (
            <Card className="border-purple-200 dark:border-purple-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  {t('seo.audit.aiRecommendations')}
                </CardTitle>
                <CardDescription>
                  {t('seo.audit.aiRecommendationsDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {result.recommendations.map((recommendation, index) => (
                    <Alert key={index}>
                      <div className="flex items-start gap-3">
                        {getPriorityIcon(index)}
                        <AlertDescription className="flex-1">
                          {recommendation}
                        </AlertDescription>
                      </div>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Analysis Info */}
          <div className="text-xs text-muted-foreground text-center">
            {t('seo.audit.analyzedOn')} {new Date(result.analyzedAt).toLocaleString()} • {result.analyzedUrl}
          </div>
        </div>
      )}
    </div>
  );
}
