import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
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
  Loader2,
  Upload
} from 'lucide-react';
import { SeoConfidenceBadge } from './SeoConfidenceBadge';

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
  const [hasConnection, setHasConnection] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    checkShopifyConnection();
  }, []);

  const checkShopifyConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('shopify_connections')
        .select('id')
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      setHasConnection(!!data);
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  };

  const analyzeHomepage = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('audit-homepage-seo');

      if (error) throw error;

      setResult(data);
      toast({
        title: 'Success',
        description: 'Analysis completed successfully',
      });
    } catch (error: any) {
      console.error('Error analyzing homepage:', error);
      toast({
        title: 'Error',
        description: error.message || 'Error analyzing homepage',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateSeoWithAI = async () => {
    if (!hasConnection) {
      sonnerToast.error('Please connect your Shopify store first');
      return;
    }

    setGenerating(true);
    try {
      // Use analysis results if available to generate more relevant SEO
      const { data, error } = await supabase.functions.invoke('generate-page-seo', {
        body: { 
          pageId: 'homepage',
          isHomepage: true,
          analysisData: result // Pass analysis data for context
        }
      });

      if (error) throw error;

      if (data.seo_title && data.seo_description) {
        setSeoTitle(data.seo_title);
        setSeoDescription(data.seo_description);
        sonnerToast.success('SEO content generated successfully');
      }
    } catch (error: any) {
      console.error('Error generating SEO:', error);
      sonnerToast.error(error.message || 'Error generating SEO content');
    } finally {
      setGenerating(false);
    }
  };

  const syncToShopify = async () => {
    if (!seoTitle || !seoDescription) {
      sonnerToast.error('Please fill in all fields');
      return;
    }

    if (!hasConnection) {
      sonnerToast.error('Please connect your Shopify store first');
      return;
    }

    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-homepage-seo', {
        body: { 
          seoTitle,
          seoDescription
        }
      });

      if (error) throw error;

      sonnerToast.success('Successfully synced to Shopify');
    } catch (error: any) {
      console.error('Error syncing to Shopify:', error);
      
      if (error.message?.includes('Permission denied')) {
        sonnerToast.error('Permission denied', {
          description: 'Make sure your Shopify token has the required permissions',
          duration: 8000
        });
      } else {
        sonnerToast.error(error.message || 'Error syncing to Shopify');
      }
    } finally {
      setSyncing(false);
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
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Average';
    return 'Needs Improvement';
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
                  SEO Audit & Optimization
                </CardTitle>
              </div>
              <CardDescription className="text-base">
                Analyze your homepage SEO, generate optimized meta tags, and sync to Shopify
              </CardDescription>
              <div className="flex flex-wrap gap-3 pt-2">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-purple-600" />
                  <span className="font-medium">Complete analysis</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="font-medium">Score breakdown</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Sparkles className="w-4 h-4 text-pink-600" />
                  <span className="font-medium">AI optimization</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Upload className="w-4 h-4 text-orange-600" />
                  <span className="font-medium">Shopify sync</span>
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
                  Analyzing...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Analyze Homepage
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
                Overall Score
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
                      <span>Structure</span>
                      <span className="font-medium">{result.breakdown.structure}/30</span>
                    </div>
                    <Progress value={(result.breakdown.structure / 30) * 100} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Content</span>
                      <span className="font-medium">{result.breakdown.content}/30</span>
                    </div>
                    <Progress value={(result.breakdown.content / 30) * 100} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Technical</span>
                      <span className="font-medium">{result.breakdown.technical}/25</span>
                    </div>
                    <Progress value={(result.breakdown.technical / 25) * 100} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Bonus</span>
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
                Detailed Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  {result.elements.title ? <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-500 mt-0.5" />}
                  <div className="flex-1">
                    <div className="font-medium">Title Tag</div>
                    <div className="text-sm text-muted-foreground">
                      {result.elements.title ? `"${result.elements.title}" (${result.elements.title.length} characters)` : 'Missing'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  {result.elements.metaDescription ? <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-500 mt-0.5" />}
                  <div className="flex-1">
                    <div className="font-medium">Meta Description</div>
                    <div className="text-sm text-muted-foreground">
                      {result.elements.metaDescription ? `${result.elements.metaDescription.length} characters` : 'Missing'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  {result.elements.h1 ? <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-500 mt-0.5" />}
                  <div className="flex-1">
                    <div className="font-medium">H1 Tag</div>
                    <div className="text-sm text-muted-foreground">
                      {result.elements.h1 ? `"${result.elements.h1}"` : 'Missing'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  {result.elements.h2s.length > 0 ? <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-500 mt-0.5" />}
                  <div className="flex-1">
                    <div className="font-medium">H2 Tags</div>
                    <div className="text-sm text-muted-foreground">
                      {result.elements.h2s.length} found
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <ImageIcon className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium">Image Alt Texts</div>
                    <div className="text-sm text-muted-foreground">
                      {result.elements.altsCount}/{result.elements.totalImages} images with alt text
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  {result.elements.canonical ? <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-500 mt-0.5" />}
                  <div className="flex-1">
                    <div className="font-medium">Canonical Tag</div>
                    <div className="text-sm text-muted-foreground">
                      {result.elements.canonical ? 'Present' : 'Missing'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  {result.elements.hasSchema ? <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-500 mt-0.5" />}
                  <div className="flex-1">
                    <div className="font-medium">Schema.org Markup</div>
                    <div className="text-sm text-muted-foreground">
                      {result.elements.hasSchema ? 'Detected' : 'Missing'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  {result.elements.hasOpenGraph ? <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-500 mt-0.5" />}
                  <div className="flex-1">
                    <div className="font-medium">Open Graph Tags</div>
                    <div className="text-sm text-muted-foreground">
                      {result.elements.hasOpenGraph ? 'Present' : 'Missing'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  {result.elements.hasTwitterCard ? <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-500 mt-0.5" />}
                  <div className="flex-1">
                    <div className="font-medium">Twitter Card</div>
                    <div className="text-sm text-muted-foreground">
                      {result.elements.hasTwitterCard ? 'Present' : 'Missing'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <LinkIcon className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium">Internal Links</div>
                    <div className="text-sm text-muted-foreground">
                      {result.elements.internalLinks} found
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Code className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium">Content Length</div>
                    <div className="text-sm text-muted-foreground">
                      {result.elements.contentLength} characters
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  {result.elements.httpsEnabled ? <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-500 mt-0.5" />}
                  <div className="flex-1">
                    <div className="font-medium">HTTPS</div>
                    <div className="text-sm text-muted-foreground">
                      {result.elements.httpsEnabled ? 'Enabled' : 'Disabled'}
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
                  AI Recommendations
                </CardTitle>
                <CardDescription>
                  Personalized suggestions to improve your SEO score
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

          {/* SEO Optimization Section */}
          {hasConnection && (
            <Card className="border-orange-200 dark:border-orange-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-orange-600" />
                  SEO Optimization
                </CardTitle>
                <CardDescription>
                  Generate and sync optimized SEO title and description based on your analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    The AI will generate SEO content based on your homepage analysis results
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="seo-title">SEO Title</Label>
                    <Input
                      id="seo-title"
                      value={seoTitle}
                      onChange={(e) => setSeoTitle(e.target.value)}
                      placeholder="Click 'Generate with AI' to create optimized title..."
                      maxLength={60}
                    />
                    <p className="text-xs text-muted-foreground">
                      {seoTitle.length}/60 characters
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="seo-description">SEO Description</Label>
                    <Textarea
                      id="seo-description"
                      value={seoDescription}
                      onChange={(e) => setSeoDescription(e.target.value)}
                      placeholder="Click 'Generate with AI' to create optimized description..."
                      rows={4}
                      maxLength={160}
                    />
                    <p className="text-xs text-muted-foreground">
                      {seoDescription.length}/160 characters
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={generateSeoWithAI}
                    disabled={generating}
                    variant="outline"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {generating ? 'Generating...' : 'Generate with AI'}
                  </Button>

                  <Button
                    onClick={syncToShopify}
                    disabled={syncing || !seoTitle || !seoDescription}
                    className="bg-gradient-to-r from-orange-600 to-pink-600 hover:from-orange-700 hover:to-pink-700"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {syncing ? 'Syncing...' : 'Sync to Shopify'}
                  </Button>
                </div>

                {/* Preview */}
                {(seoTitle || seoDescription) && (
                  <div className="mt-6 p-4 border rounded-lg space-y-3 bg-muted/50">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">
                        Search Result Preview
                      </p>
                      <SeoConfidenceBadge 
                        seoTitle={seoTitle} 
                        seoDescription={seoDescription}
                      />
                    </div>
                    {seoTitle && (
                      <h3 className="text-lg font-semibold text-primary">
                        {seoTitle}
                      </h3>
                    )}
                    {seoDescription && (
                      <p className="text-sm text-muted-foreground">
                        {seoDescription}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Analysis Info */}
          <div className="text-xs text-muted-foreground text-center">
            Analyzed on {new Date(result.analyzedAt).toLocaleString()} • {result.analyzedUrl}
          </div>
        </div>
      )}
    </div>
  );
}
