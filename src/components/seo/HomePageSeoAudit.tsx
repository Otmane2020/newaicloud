import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Upload,
  ExternalLink,
  Store,
  Target
} from 'lucide-react';
import { SeoConfidenceBadge } from './SeoConfidenceBadge';
import { SeoTasksList } from './SeoTasksList';
import { Link } from 'lucide-react';

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
  const navigate = useNavigate();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [hasConnection, setHasConnection] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    checkShopifyConnection();
    loadLastAudit();
  }, []);

  const loadLastAudit = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if there's a saved audit in homepage_seo table
      const { data: homepageData, error } = await supabase
        .from('homepage_seo')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error loading last audit:', error);
        return;
      }

      if (homepageData && homepageData.last_audit) {
        // Load the saved audit - cast JSONB to AuditResult
        setResult(homepageData.last_audit as unknown as AuditResult);
        setSeoTitle(homepageData.seo_title || '');
        setSeoDescription(homepageData.seo_description || '');
        toast({
          title: 'Audit chargé',
          description: 'Dernier audit chargé automatiquement',
        });
      }
    } catch (error) {
      console.error('Error loading audit:', error);
    }
  };

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
      
      // Save audit to homepage_seo table
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('homepage_seo')
          .upsert({
            user_id: user.id,
            last_audit: data,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });
      }

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

  const importCurrentSeo = async () => {
    if (!hasConnection) {
      sonnerToast.error('Veuillez connecter votre boutique Shopify');
      return;
    }

    setImporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get active store
      const { data: store, error: storeError } = await supabase
        .from('shopify_connections')
        .select('store_url, access_token')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (storeError || !store) {
        throw new Error('No active Shopify store found');
      }

      // Fetch homepage HTML to extract current meta tags
      const response = await fetch(`https://${store.store_url}`, {
        headers: {
          'Accept': 'text/html',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch homepage');
      }

      const html = await response.text();

      // Extract title
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      const currentTitle = titleMatch ? titleMatch[1].trim() : '';

      // Extract meta description
      const metaMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
      const currentDescription = metaMatch ? metaMatch[1].trim() : '';

      if (currentTitle) setSeoTitle(currentTitle);
      if (currentDescription) setSeoDescription(currentDescription);

      sonnerToast.success('SEO actuel importé avec succès', {
        description: `Titre: ${currentTitle.substring(0, 50)}...`,
      });
    } catch (error: any) {
      console.error('Error importing current SEO:', error);
      sonnerToast.error(error.message || 'Erreur lors de l\'import du SEO');
    } finally {
      setImporting(false);
    }
  };

  const syncToShopify = async () => {
    if (!seoTitle || !seoDescription) {
      sonnerToast.error('Veuillez remplir tous les champs');
      return;
    }

    if (!hasConnection) {
      sonnerToast.error('Veuillez connecter votre boutique Shopify');
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

      // Verify the sync was successful by fetching from Shopify
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: store } = await supabase
          .from('shopify_connections')
          .select('store_url, access_token')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (store) {
          // Wait a bit for Shopify to update
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Fetch homepage to verify
          const verifyResponse = await fetch(`https://${store.store_url}`, {
            headers: { 'Accept': 'text/html' },
          });

          if (verifyResponse.ok) {
            const html = await verifyResponse.text();
            const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
            const currentTitle = titleMatch ? titleMatch[1].trim() : '';

            if (currentTitle === seoTitle) {
              sonnerToast.success('✅ Synchronisation vérifiée sur Shopify', {
                description: 'Les changements sont bien visibles sur votre boutique',
              });
            } else {
              sonnerToast.warning('⚠️ Synchronisation effectuée', {
                description: 'Les metafields sont créés mais peuvent prendre quelques minutes pour apparaître',
              });
            }
          }
        }
      }

      // Save to database
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        await supabase
          .from('homepage_seo')
          .upsert({
            user_id: currentUser.id,
            seo_title: seoTitle,
            seo_description: seoDescription,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });
      }

    } catch (error: any) {
      console.error('Error syncing to Shopify:', error);
      
      if (error.message?.includes('Permission denied')) {
        sonnerToast.error('Permission refusée', {
          description: 'Vérifiez que votre token Shopify a les permissions nécessaires',
          duration: 8000
        });
      } else {
        sonnerToast.error(error.message || 'Erreur lors de la synchronisation');
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
                <div className="space-y-4">
                  {result.recommendations.map((recommendation, index) => {
                    // Detect recommendation type for action buttons
                    const isImageAltRecommendation = recommendation.toLowerCase().includes('alt') || 
                      recommendation.toLowerCase().includes('image');
                    const isMetadataRecommendation = recommendation.toLowerCase().includes('métadonnées') || 
                      recommendation.toLowerCase().includes('boutique') ||
                      recommendation.toLowerCase().includes('nom commercial');
                    const isH1Recommendation = recommendation.toLowerCase().includes('h1') ||
                      recommendation.toLowerCase().includes('titre principal');
                    const missingAlts = result.elements.totalImages - result.elements.altsCount;
                    
                    return (
                      <Alert key={index} className="p-4">
                        <div className="flex items-start gap-3">
                          {getPriorityIcon(index)}
                          <div className="flex-1 space-y-3">
                            <AlertDescription>
                              {recommendation}
                            </AlertDescription>
                            
                            {/* Action Buttons */}
                            <div className="flex gap-2 flex-wrap">
                              {isImageAltRecommendation && missingAlts > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => navigate('/seo?tab=alt&filter=needs-alt')}
                                  className="gap-2"
                                >
                                  <ImageIcon className="w-4 h-4" />
                                  Corriger {missingAlts} images
                                </Button>
                              )}
                              
                              {isMetadataRecommendation && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => navigate('/integration?tab=metadata')}
                                  className="gap-2"
                                >
                                  <Store className="w-4 h-4" />
                                  Métadonnées boutique
                                </Button>
                              )}
                              
                              {isH1Recommendation && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  asChild
                                >
                                  <a 
                                    href={`https://admin.shopify.com`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="gap-2"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                    Éditeur Shopify
                                  </a>
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </Alert>
                    );
                  })}
                </div>
                
                {/* Quick Actions Summary */}
                <div className="mt-6 p-4 bg-muted/50 rounded-lg space-y-2">
                  <div className="font-medium flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Actions Rapides
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {result.elements.totalImages - result.elements.altsCount > 0 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate('/seo?tab=alt&filter=needs-alt')}
                        className="justify-start gap-2"
                      >
                        <ImageIcon className="w-4 h-4" />
                        {result.elements.totalImages - result.elements.altsCount} images à optimiser
                      </Button>
                    )}
                    
                    {result.elements.internalLinks > 0 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate('/blog?tab=netlinking')}
                        className="justify-start gap-2"
                      >
                        <Link className="w-4 h-4" />
                        Optimiser {result.elements.internalLinks} liens internes
                      </Button>
                    )}
                    
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate('/integration')}
                      className="justify-start gap-2"
                    >
                      <Store className="w-4 h-4" />
                      Configurer métadonnées
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* SEO Tasks To-Do List */}
          <SeoTasksList />

          {/* SEO Optimization Section */}
          {hasConnection && (
            <Card className="border-orange-200 dark:border-orange-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-orange-600" />
                  SEO Optimization
                </CardTitle>
                <CardDescription>
                  Import current SEO, optimize with AI, and sync to Shopify
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Import your current homepage SEO, then optimize it with AI before syncing
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="seo-title">SEO Title</Label>
                    <Input
                      id="seo-title"
                      value={seoTitle}
                      onChange={(e) => setSeoTitle(e.target.value)}
                      placeholder="Import or generate SEO title..."
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
                      placeholder="Import or generate SEO description..."
                      maxLength={160}
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground">
                      {seoDescription.length}/160 characters
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={importCurrentSeo}
                      disabled={importing}
                      variant="outline"
                      className="flex-1 min-w-[180px]"
                    >
                      {importing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Importation...
                        </>
                      ) : (
                        <>
                          <Target className="w-4 h-4 mr-2" />
                          Importer SEO actuel
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={generateSeoWithAI}
                      disabled={generating}
                      variant="outline"
                      className="flex-1 min-w-[180px]"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Génération...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Optimiser avec IA
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={syncToShopify}
                      disabled={syncing || !seoTitle || !seoDescription}
                      className="flex-1 min-w-[180px] bg-orange-600 hover:bg-orange-700"
                    >
                      {syncing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Synchronisation...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Sync to Shopify
                        </>
                      )}
                    </Button>
                  </div>
                 </div>
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
