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
  Target,
  Download
} from 'lucide-react';
import { SeoConfidenceBadge } from './SeoConfidenceBadge';
import { SeoTasksList } from './SeoTasksList';
import { Link } from 'lucide-react';
import { useTranslation } from '@/lib/language';
import { useStore } from '@/contexts/StoreContext';

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
  const { t, tf } = useTranslation();
  const { selectedStore } = useStore();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [hasConnection, setHasConnection] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importingImages, setImportingImages] = useState(false);
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      if (selectedStore?.id) {
        const connectionExists = await checkShopifyConnection();
        await loadLastAudit();
        // Auto-import data if connection exists
        if (connectionExists) {
          await autoImportData();
        }
      } else {
        setResult(null);
        setSeoTitle('');
        setSeoDescription('');
      }
    };

    const timeoutId = setTimeout(loadData, 200);
    return () => clearTimeout(timeoutId);
  }, [selectedStore?.id]);

  const loadLastAudit = async () => {
    if (!selectedStore?.id) {
      setResult(null);
      setSeoTitle('');
      setSeoDescription('');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if there's a saved audit in homepage_seo table (filtered by store_id)
      const { data: homepageData, error } = await supabase
        .from('homepage_seo')
        .select('*')
        .eq('user_id', user.id)
        .eq('store_id', selectedStore.id)
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
          title: t.homepageAudit.toasts.auditLoaded,
          description: t.homepageAudit.toasts.auditLoadedDesc,
        });
      }
    } catch (error) {
      console.error('Error loading audit:', error);
    }
  };

  const checkShopifyConnection = async (): Promise<boolean> => {
    if (!selectedStore?.id) {
      setHasConnection(false);
      return false;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setHasConnection(false);
        return false;
      }

      const { data, error } = await supabase
        .from('shopify_connections')
        .select('id')
        .eq('user_id', user.id)
        .eq('id', selectedStore.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      const hasConn = !!data;
      setHasConnection(hasConn);
      return hasConn;
    } catch (error) {
      console.error('Error checking connection:', error);
      setHasConnection(false);
      return false;
    }
  };

  const analyzeHomepage = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('audit-homepage-seo');

      if (error) throw error;

      setResult(data);
      
      // Save audit to homepage_seo table with store_id
      const { data: { user } } = await supabase.auth.getUser();
      if (user && selectedStore?.id) {
        await supabase
          .from('homepage_seo')
          .upsert({
            user_id: user.id,
            store_id: selectedStore.id,
            last_audit: data,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,store_id'
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

  const autoImportData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !selectedStore?.id) return;

      // Check if data already exists
      const { data: existingData } = await supabase
        .from('homepage_seo')
        .select('seo_title, seo_description')
        .eq('user_id', user.id)
        .eq('store_id', selectedStore.id)
        .maybeSingle();

      // Only auto-import if data doesn't exist
      if (!existingData?.seo_title || !existingData?.seo_description) {
        // Silently import current SEO
        const { data: store } = await supabase
          .from('shopify_connections')
          .select('store_url')
          .eq('user_id', user.id)
          .eq('id', selectedStore.id)
          .single();

        if (store) {
          const response = await fetch(`https://${store.store_url}`, {
            headers: { 'Accept': 'text/html' },
          });

          if (response.ok) {
            const html = await response.text();
            const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
            const metaMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
            
            const importedTitle = titleMatch ? titleMatch[1].trim() : '';
            const importedDescription = metaMatch ? metaMatch[1].trim() : '';
            
            // Update local state
            if (importedTitle) setSeoTitle(importedTitle);
            if (importedDescription) setSeoDescription(importedDescription);
            
            // Save to database
            if (importedTitle || importedDescription) {
              await supabase
                .from('homepage_seo')
                .upsert({
                  user_id: user.id,
                  store_id: selectedStore.id,
                  seo_title: importedTitle || existingData?.seo_title,
                  seo_description: importedDescription || existingData?.seo_description,
                  updated_at: new Date().toISOString()
                }, {
                  onConflict: 'user_id,store_id'
                });
            }
          }
        }

        // Silently import homepage images
        await supabase.functions.invoke('import-content-images', {
          body: { 
            storeId: selectedStore.id,
            types: ['homepage']
          }
        });
      } else {
        // Data exists, just update local state
        if (existingData.seo_title) setSeoTitle(existingData.seo_title);
        if (existingData.seo_description) setSeoDescription(existingData.seo_description);
      }
    } catch (error) {
      console.error('Auto-import error:', error);
    }
  };

  const generateSeoWithAI = async () => {
    if (!hasConnection) {
      sonnerToast.error(t.homepageAudit.toasts.connectShopify);
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

        // Automatically save to database
        const { data: { user } } = await supabase.auth.getUser();
        if (user && selectedStore?.id) {
          await supabase
            .from('homepage_seo')
            .upsert({
              user_id: user.id,
              store_id: selectedStore.id,
              seo_title: data.seo_title,
              seo_description: data.seo_description,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,store_id'
            });
        }

        // Automatically sync to Shopify
        const syncResult = await supabase.functions.invoke('sync-homepage-seo', {
          body: { 
            seoTitle: data.seo_title,
            seoDescription: data.seo_description,
            storeId: selectedStore.id
          }
        });

        if (syncResult.error) throw syncResult.error;

        sonnerToast.success('SEO optimisé et synchronisé', {
          description: 'Titre et description générés, sauvegardés et synchronisés avec Shopify'
        });
      }
    } catch (error: any) {
      console.error('Error generating SEO:', error);
      sonnerToast.error(error.message || t.homepageAudit.toasts.generatingError);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateSeoElement = async (elementType: 'title' | 'metaDescription' | 'h1') => {
    if (!result) return;
    
    setGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Préparer le contexte de la page
      const pageContext = {
        url: result.analyzedUrl,
        existingTitle: result.elements.title,
        existingDescription: result.elements.metaDescription,
        existingH1: result.elements.h1,
        h2s: result.elements.h2s,
        contentLength: result.elements.contentLength
      };

      const { data, error } = await supabase.functions.invoke('generate-homepage-seo-element', {
        body: { 
          elementType,
          pageContext
        }
      });

      if (error) throw error;
      if (!data?.generatedText) throw new Error('No text generated');

      const generatedText = data.generatedText;

      // Afficher le résultat dans un toast avec possibilité de copier
      const elementName = elementType === 'title' ? 'Titre SEO' : 
                         elementType === 'metaDescription' ? 'Meta Description' : 'H1';
      
      sonnerToast.success(`${elementName} généré avec succès !`, {
        description: generatedText.length > 100 ? generatedText.substring(0, 100) + '...' : generatedText,
        duration: 10000,
        action: {
          label: 'Copier',
          onClick: () => {
            navigator.clipboard.writeText(generatedText);
            sonnerToast.success('Copié dans le presse-papiers !');
          }
        }
      });

      // Si la meta/titre est vide, le remplir automatiquement
      if (elementType === 'title' && !seoTitle) {
        setSeoTitle(generatedText);
      } else if (elementType === 'metaDescription' && !seoDescription) {
        setSeoDescription(generatedText);
      }

    } catch (error: any) {
      console.error('Error generating SEO element:', error);
      sonnerToast.error('Erreur lors de la génération avec l\'IA');
    } finally {
      setGenerating(false);
    }
  };

  const importCurrentSeo = async () => {
    if (!hasConnection) {
      sonnerToast.error(t.homepageAudit.toasts.connectShopify);
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

      sonnerToast.success(t.homepageAudit.toasts.currentSeoImported, {
        description: `${t.homepageAudit.elements.seoTitle}: ${currentTitle.substring(0, 50)}...`,
      });
    } catch (error: any) {
      console.error('Error importing current SEO:', error);
      sonnerToast.error(error.message || t.homepageAudit.toasts.importError);
    } finally {
      setImporting(false);
    }
  };

  const handleImportContentImages = async () => {
    if (!hasConnection) {
      sonnerToast.error(t.homepageAudit.toasts.connectShopify);
      return;
    }

    setImportingImages(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get active store
      const { data: store, error: storeError } = await supabase
        .from('shopify_connections')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (storeError || !store) {
        throw new Error('No active Shopify store found');
      }

      const { data, error } = await supabase.functions.invoke('import-content-images', {
        body: { 
          storeId: store.id,
          types: ['homepage']
        }
      });

      if (error) throw error;

      const stats = data?.breakdown || {};
      const totalImages = data?.totalImported || 0;

      sonnerToast.success('Images homepage importées', {
        description: (
          <div className="space-y-1 text-sm">
            <p>✅ {totalImages} images importées</p>
            {stats.homepage && <p>🏠 Homepage: {stats.homepage} images</p>}
            {data?.filtered?.total > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                ({data.filtered.excluded} images filtrées : {data.filtered.reasons?.join(', ')})
              </p>
            )}
          </div>
        ),
        duration: 8000
      });

      // Re-analyze to update score
      await analyzeHomepage();
    } catch (error: any) {
      console.error('Error importing images:', error);
      sonnerToast.error(error.message || 'Erreur lors de l\'importation des images');
    } finally {
      setImportingImages(false);
    }
  };

  const syncToShopify = async () => {
    if (!seoTitle || !seoDescription) {
      sonnerToast.error(t.homepageAudit.toasts.fillAllFields);
      return;
    }

    if (!hasConnection) {
      sonnerToast.error(t.homepageAudit.toasts.connectShopify);
      return;
    }

    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-homepage-seo', {
        body: { 
          seoTitle,
          seoDescription,
          storeId: selectedStore.id
        }
      });

      if (error) throw error;

      // Verify the sync was successful by fetching from Shopify
      const { data: { user } } = await supabase.auth.getUser();
      if (user && selectedStore?.id) {
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
              sonnerToast.success(t.homepageAudit.toasts.syncVerified, {
                description: t.homepageAudit.toasts.syncVerifiedDesc,
              });
            } else {
              sonnerToast.warning(t.homepageAudit.toasts.syncWarning, {
                description: t.homepageAudit.toasts.syncWarningDesc,
              });
            }
          }
        }

        // Save to database with store_id
        await supabase
          .from('homepage_seo')
          .upsert({
            user_id: user.id,
            store_id: selectedStore.id,
            seo_title: seoTitle,
            seo_description: seoDescription,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,store_id'
          });
      }

    } catch (error: any) {
      console.error('Error syncing to Shopify:', error);
      
      if (error.message?.includes('Permission denied')) {
        sonnerToast.error(t.homepageAudit.toasts.permissionDenied, {
          description: t.homepageAudit.toasts.permissionDeniedDesc,
          duration: 8000
        });
      } else {
        sonnerToast.error(error.message || t.homepageAudit.toasts.syncError);
      }
    } finally {
      setSyncing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-[#22c55e]';
    if (score >= 60) return 'text-[#FF8000]';
    return 'text-[#FF3333]';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-[#22c55e]/10 border-[#22c55e]/30';
    if (score >= 60) return 'bg-[#FF8000]/10 border-[#FF8000]/30';
    return 'bg-[#FF3333]/10 border-[#FF3333]/30';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return t.homepageAudit.scoreLabels.excellent;
    if (score >= 60) return t.homepageAudit.scoreLabels.good;
    if (score >= 40) return t.homepageAudit.scoreLabels.average;
    return t.homepageAudit.scoreLabels.needsImprovement;
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
                <Search className="w-6 h-6 text-primary" />
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
                  {t.homepageAudit.title}
                </CardTitle>
              </div>
              <CardDescription className="text-base">
                {t.homepageAudit.subtitle}
              </CardDescription>
              <div className="flex flex-wrap gap-3 pt-2">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="font-medium">{t.homepageAudit.features.completeAnalysis}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="font-medium">{t.homepageAudit.features.scoreBreakdown}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Sparkles className="w-4 h-4 text-accent" />
                  <span className="font-medium">{t.homepageAudit.features.aiOptimization}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Upload className="w-4 h-4 text-secondary" />
                  <span className="font-medium">{t.homepageAudit.features.shopifySync}</span>
                </div>
              </div>
            </div>
            <Button
              size="lg"
              onClick={analyzeHomepage}
              disabled={isAnalyzing}
              className="bg-gradient-to-r from-primary via-primary to-primary/80 hover:from-primary/90 hover:via-primary hover:to-primary gap-2 shadow-lg hover:shadow-primary/50 text-primary-foreground font-semibold transition-all duration-300"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t.homepageAudit.buttons.analyzing}
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  {t.homepageAudit.buttons.analyzeHomepage}
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
                {t.homepageAudit.sections.overallScore}
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
                      <span>{t.homepageAudit.sections.structure}</span>
                      <span className="font-medium">{result.breakdown.structure}/30</span>
                    </div>
                    <Progress value={Math.round((result.breakdown.structure / 30) * 1000) / 10} className="h-2" showPercentage={false} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>{t.homepageAudit.sections.content}</span>
                      <span className="font-medium">{result.breakdown.content}/30</span>
                    </div>
                    <Progress value={Math.round((result.breakdown.content / 30) * 1000) / 10} className="h-2" showPercentage={false} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>{t.homepageAudit.sections.technical}</span>
                      <span className="font-medium">{result.breakdown.technical}/25</span>
                    </div>
                    <Progress value={Math.round((result.breakdown.technical / 25) * 1000) / 10} className="h-2" showPercentage={false} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>{t.homepageAudit.sections.bonus}</span>
                      <span className="font-medium">{result.breakdown.bonus}/15</span>
                    </div>
                    <Progress value={Math.round((result.breakdown.bonus / 15) * 1000) / 10} className="h-2" showPercentage={false} />
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
                {t.homepageAudit.sections.detailedAnalysis}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  {result.elements.title ? <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-500 mt-0.5" />}
                  <div className="flex-1">
                    <div className="font-medium">{t.homepageAudit.elements.titleTag}</div>
                    <div className="text-sm text-muted-foreground">
                      {result.elements.title ? `"${result.elements.title}" (${result.elements.title.length} ${t.homepageAudit.elements.characters})` : t.homepageAudit.elements.missing}
                    </div>
                    {!result.elements.title && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="mt-2 gap-2"
                        onClick={() => handleGenerateSeoElement('title')}
                        disabled={generating}
                      >
                        <Sparkles className="w-3 h-3" />
                        Générer avec l'IA
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  {result.elements.metaDescription ? <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-500 mt-0.5" />}
                  <div className="flex-1">
                    <div className="font-medium">{t.homepageAudit.elements.metaDescription}</div>
                    <div className="text-sm text-muted-foreground">
                      {result.elements.metaDescription ? `${result.elements.metaDescription.length} ${t.homepageAudit.elements.characters}` : t.homepageAudit.elements.missing}
                    </div>
                    {!result.elements.metaDescription && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="mt-2 gap-2"
                        onClick={() => handleGenerateSeoElement('metaDescription')}
                        disabled={generating}
                      >
                        <Sparkles className="w-3 h-3" />
                        Générer avec l'IA
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  {result.elements.h1 ? <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-500 mt-0.5" />}
                  <div className="flex-1">
                    <div className="font-medium">{t.homepageAudit.elements.h1Tag}</div>
                    <div className="text-sm text-muted-foreground">
                      {result.elements.h1 ? `"${result.elements.h1}"` : t.homepageAudit.elements.missing}
                    </div>
                    {!result.elements.h1 && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="mt-2 gap-2"
                        onClick={() => handleGenerateSeoElement('h1')}
                        disabled={generating}
                      >
                        <Sparkles className="w-3 h-3" />
                        Générer avec l'IA
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  {result.elements.h2s.length > 0 ? <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-500 mt-0.5" />}
                  <div className="flex-1">
                    <div className="font-medium">{t.homepageAudit.elements.h2Tags}</div>
                    <div className="text-sm text-muted-foreground">
                      {result.elements.h2s.length} {t.homepageAudit.elements.found}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <ImageIcon className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium">{t.homepageAudit.elements.imageAltTexts}</div>
                    <div className="text-sm text-muted-foreground">
                      {result.elements.altsCount}/{result.elements.totalImages} {t.homepageAudit.elements.imagesWithAlt}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  {result.elements.canonical ? <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-500 mt-0.5" />}
                  <div className="flex-1">
                    <div className="font-medium">{t.homepageAudit.elements.canonicalTag}</div>
                    <div className="text-sm text-muted-foreground">
                      {result.elements.canonical ? t.homepageAudit.elements.present : t.homepageAudit.elements.missing}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  {result.elements.hasSchema ? <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-500 mt-0.5" />}
                  <div className="flex-1">
                    <div className="font-medium">{t.homepageAudit.elements.schemaMarkup}</div>
                    <div className="text-sm text-muted-foreground">
                      {result.elements.hasSchema ? t.homepageAudit.elements.detected : t.homepageAudit.elements.missing}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  {result.elements.hasOpenGraph ? <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-500 mt-0.5" />}
                  <div className="flex-1">
                    <div className="font-medium">{t.homepageAudit.elements.openGraphTags}</div>
                    <div className="text-sm text-muted-foreground">
                      {result.elements.hasOpenGraph ? t.homepageAudit.elements.present : t.homepageAudit.elements.missing}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  {result.elements.hasTwitterCard ? <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-500 mt-0.5" />}
                  <div className="flex-1">
                    <div className="font-medium">{t.homepageAudit.elements.twitterCard}</div>
                    <div className="text-sm text-muted-foreground">
                      {result.elements.hasTwitterCard ? t.homepageAudit.elements.present : t.homepageAudit.elements.missing}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <LinkIcon className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium">{t.homepageAudit.elements.internalLinks}</div>
                    <div className="text-sm text-muted-foreground">
                      {result.elements.internalLinks} {t.homepageAudit.elements.found}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Code className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium">{t.homepageAudit.elements.contentLength}</div>
                    <div className="text-sm text-muted-foreground">
                      {result.elements.contentLength} {t.homepageAudit.elements.characters}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  {result.elements.httpsEnabled ? <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-500 mt-0.5" />}
                  <div className="flex-1">
                    <div className="font-medium">{t.homepageAudit.elements.https}</div>
                    <div className="text-sm text-muted-foreground">
                      {result.elements.httpsEnabled ? t.homepageAudit.elements.enabled : t.homepageAudit.elements.disabled}
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
                  {t.homepageAudit.sections.aiRecommendations}
                </CardTitle>
                <CardDescription>
                  {t.homepageAudit.sections.personalizedSuggestions}
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
                                  {tf('homepageAudit.elements.fixImages', { count: missingAlts })}
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
                                  {t.homepageAudit.elements.storeMetadata}
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
                                    {t.homepageAudit.elements.shopifyEditor}
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
                    {t.homepageAudit.sections.quickActions}
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
                        {tf('homepageAudit.elements.imagesToOptimize', { count: result.elements.totalImages - result.elements.altsCount })}
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
                        {tf('homepageAudit.elements.optimizeLinks', { count: result.elements.internalLinks })}
                      </Button>
                    )}
                    
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate('/integration')}
                      className="justify-start gap-2"
                    >
                      <Store className="w-4 h-4" />
                      {t.homepageAudit.elements.configureMetadata}
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
                  {t.homepageAudit.sections.seoOptimization}
                </CardTitle>
                <CardDescription>
                  {t.homepageAudit.sections.importOptimizeSync}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {t.homepageAudit.sections.importBeforeOptimize}
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-sm">
                      Les données sont automatiquement synchronisées depuis Shopify au chargement de la page
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label htmlFor="seo-title">{t.homepageAudit.elements.seoTitle}</Label>
                    <Input
                      id="seo-title"
                      value={seoTitle}
                      onChange={(e) => setSeoTitle(e.target.value)}
                      placeholder={`${t.homepageAudit.elements.importOrGenerate} ${t.homepageAudit.elements.seoTitle.toLowerCase()}...`}
                      maxLength={60}
                    />
                    <p className="text-xs text-muted-foreground">
                      {seoTitle.length}/60 {t.homepageAudit.elements.characters}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="seo-description">{t.homepageAudit.elements.seoDescription}</Label>
                    <Textarea
                      id="seo-description"
                      value={seoDescription}
                      onChange={(e) => setSeoDescription(e.target.value)}
                      placeholder={`${t.homepageAudit.elements.importOrGenerate} ${t.homepageAudit.elements.seoDescription.toLowerCase()}...`}
                      maxLength={160}
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground">
                      {seoDescription.length}/160 {t.homepageAudit.elements.characters}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={generateSeoWithAI}
                      disabled={generating}
                      className="flex-1 min-w-[180px] bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Génération et synchronisation...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Optimiser avec l'IA et synchroniser
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={syncToShopify}
                      disabled={syncing || !seoTitle || !seoDescription}
                      variant="outline"
                      className="flex-1 min-w-[180px]"
                    >
                      {syncing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {t.homepageAudit.buttons.syncing}
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Synchroniser manuellement
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    L'optimisation IA génère automatiquement le titre et la description, puis les sauvegarde et les synchronise avec Shopify
                  </p>
                 </div>
              </CardContent>
            </Card>
          )}

          {/* Analysis Info */}
          <div className="text-xs text-muted-foreground text-center">
            {t.homepageAudit.elements.analyzedOn} {new Date(result.analyzedAt).toLocaleString()} • {result.analyzedUrl}
          </div>
        </div>
      )}
    </div>
  );
}
