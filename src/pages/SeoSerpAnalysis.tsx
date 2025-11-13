import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ArrowLeft, Search, TrendingUp, AlertTriangle, CheckCircle, Loader2, BarChart3 } from 'lucide-react';
import { GoogleSearchPreview } from '@/components/seo/GoogleSearchPreview';
import { SeoConfidenceBadge } from '@/components/seo/SeoConfidenceBadge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

interface Product {
  id: string;
  title: string;
  seo_title: string | null;
  seo_description: string | null;
  tags: string | null;
  body_html: string | null;
  optimization_count: number;
  seo_synced_to_shopify: boolean;
  store_id: string;
}

interface SerpInsight {
  commonKeywords?: string[];
  avgTitleLength?: number;
  avgDescriptionLength?: number;
  topFeatures?: string[];
  recommendations?: string[];
}

export default function SeoSerpAnalysis() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { selectedStore } = useStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [serpInsights, setSerpInsights] = useState<SerpInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [seoScore, setSeoScore] = useState(0);
  const [storeDomain, setStoreDomain] = useState<string>('example.com');

  useEffect(() => {
    if (productId) {
      loadProductData();
    }
  }, [productId]);

  // Auto-analyze SERP when product is loaded
  useEffect(() => {
    if (product && !serpInsights && !analyzing) {
      analyzeSerpCompetitors();
    }
  }, [product]);

  // Fetch store domain
  useEffect(() => {
    const fetchStoreDomain = async () => {
      if (!selectedStore?.id) return;
      
      const { data, error } = await supabase
        .from('shopify_connections')
        .select('public_domain, store_url, access_token')
        .eq('id', selectedStore.id)
        .single();
      
      if (data && !error) {
        // If we have a public_domain, use it
        if (data.public_domain) {
          setStoreDomain(data.public_domain);
        } else if (data.access_token && data.store_url) {
          // Try to fetch the domain from Shopify API
          try {
            const response = await fetch(`https://${data.store_url}/admin/api/2025-10/shop.json`, {
              headers: {
                'X-Shopify-Access-Token': data.access_token,
                'Content-Type': 'application/json'
              }
            });
            
            if (response.ok) {
              const shopData = await response.json();
              const shopifyDomain = shopData.shop?.domain || data.store_url.replace(/^https?:\/\//, '');
              setStoreDomain(shopifyDomain);
              
              // Update the public_domain in the database for future use
              if (shopData.shop?.domain) {
                await supabase
                  .from('shopify_connections')
                  .update({ public_domain: shopData.shop.domain })
                  .eq('id', selectedStore.id);
              }
            } else {
              setStoreDomain(data.store_url.replace(/^https?:\/\//, ''));
            }
          } catch (err) {
            console.error('Error fetching Shopify domain:', err);
            setStoreDomain(data.store_url.replace(/^https?:\/\//, ''));
          }
        } else {
          setStoreDomain(data.store_url.replace(/^https?:\/\//, ''));
        }
      }
    };
    
    fetchStoreDomain();
  }, [selectedStore?.id]);

  const loadProductData = async () => {
    try {
      setLoading(true);
      
      const { data: productData, error } = await supabase
        .from('shopify_products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) throw error;
      
      setProduct(productData);
      calculateSeoScore(productData);
    } catch (error: any) {
      console.error('Error loading product:', error);
      toast.error('Erreur lors du chargement du produit');
    } finally {
      setLoading(false);
    }
  };

  const calculateSeoScore = (prod: Product) => {
    let score = 0;
    
    // Title score (35%)
    if (prod.seo_title) {
      const titleLength = prod.seo_title.length;
      if (titleLength >= 50 && titleLength <= 60) score += 35;
      else if (titleLength >= 40 && titleLength <= 70) score += 25;
      else score += 15;
    }
    
    // Description score (35%)
    if (prod.seo_description) {
      const descLength = prod.seo_description.length;
      if (descLength >= 140 && descLength <= 160) score += 35;
      else if (descLength >= 120 && descLength <= 180) score += 25;
      else score += 15;
    }
    
    // Tags score (15%)
    if (prod.tags) {
      const tagCount = prod.tags.split(',').length;
      if (tagCount >= 3 && tagCount <= 10) score += 15;
      else if (tagCount > 0) score += 8;
    }
    
    // Content (15%)
    if (prod.body_html && prod.body_html.length > 200) score += 15;
    else if (prod.body_html) score += 8;
    
    setSeoScore(Math.round(score));
  };

  const analyzeSerpCompetitors = async () => {
    if (!product) return;
    
    try {
      setAnalyzing(true);
      
      const { data, error } = await supabase.functions.invoke('analyze-serp-competitors', {
        body: {
          keyword: product.title,
          analysisType: 'product',
          maxResults: 10
        }
      });

      if (error) throw error;
      
      setSerpInsights(data.insights);
      toast.success('Analyse SERP complétée avec succès');
    } catch (error: any) {
      console.error('Error analyzing SERP:', error);
      toast.error('Erreur lors de l\'analyse SERP');
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Produit non trouvé</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/seo?tab=products')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Analyse SEO & SERP</h1>
            <p className="text-muted-foreground">{product.title}</p>
          </div>
        </div>
        <Button onClick={analyzeSerpCompetitors} disabled={analyzing}>
          {analyzing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyse en cours...
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Analyser SERP
            </>
          )}
        </Button>
      </div>

      {/* SEO Score Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Score SEO Global
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Score actuel</span>
                <span className="text-2xl font-bold">{seoScore}/100</span>
              </div>
              <Progress value={seoScore} className="h-3" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {product.seo_title ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                )}
                <span className="text-sm font-medium">Titre SEO</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {product.seo_title ? `${product.seo_title.length} caractères` : 'Non défini'}
              </p>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {product.seo_description ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                )}
                <span className="text-sm font-medium">Meta Description</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {product.seo_description ? `${product.seo_description.length} caractères` : 'Non définie'}
              </p>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {product.optimization_count > 0 ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                )}
                <span className="text-sm font-medium">Optimisations IA</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {product.optimization_count} fois optimisé
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="preview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="preview">Aperçu Google</TabsTrigger>
          <TabsTrigger value="serp">Analyse SERP</TabsTrigger>
          <TabsTrigger value="recommendations">Recommandations</TabsTrigger>
        </TabsList>

        {/* Google Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Aperçu dans les résultats Google</CardTitle>
              <CardDescription>
                Visualisez comment votre produit apparaîtra dans les résultats de recherche
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {product.seo_title && product.seo_description ? (
                <>
                  <GoogleSearchPreview
                    title={product.seo_title}
                    description={product.seo_description}
                    url={`https://${storeDomain}/products/${product.title.toLowerCase().replace(/\s+/g, '-')}`}
                  />
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Confiance SEO</span>
                    <SeoConfidenceBadge 
                      seoTitle={product.seo_title}
                      seoDescription={product.seo_description}
                    />
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun contenu SEO disponible pour l'aperçu</p>
                  <p className="text-sm mt-2">Optimisez ce produit pour voir l'aperçu Google</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SERP Analysis Tab */}
        <TabsContent value="serp" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analyse des concurrents SERP</CardTitle>
              <CardDescription>
                Insights basés sur l'analyse des résultats de recherche pour des mots-clés similaires
              </CardDescription>
            </CardHeader>
            <CardContent>
              {serpInsights ? (
                <div className="space-y-6">
                  {serpInsights.commonKeywords && serpInsights.commonKeywords.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Mots-clés fréquents chez les concurrents
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {serpInsights.commonKeywords.map((keyword, idx) => (
                          <Badge key={idx} variant="secondary">{keyword}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {serpInsights.topFeatures && serpInsights.topFeatures.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold">Caractéristiques mises en avant</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        {serpInsights.topFeatures.map((feature, idx) => (
                          <li key={idx}>{feature}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {serpInsights.avgTitleLength && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Longueur moyenne titre</p>
                        <p className="text-2xl font-bold">{serpInsights.avgTitleLength} car.</p>
                      </div>
                      {serpInsights.avgDescriptionLength && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Longueur moyenne description</p>
                          <p className="text-2xl font-bold">{serpInsights.avgDescriptionLength} car.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune analyse SERP disponible</p>
                  <p className="text-sm mt-2">Cliquez sur "Analyser SERP" pour lancer l'analyse</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recommandations d'optimisation</CardTitle>
              <CardDescription>
                Actions suggérées pour améliorer votre référencement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {seoScore < 80 && (
                  <div className="flex items-start gap-3 p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-medium">Score SEO insuffisant</p>
                      <p className="text-sm text-muted-foreground">
                        Votre score est en dessous de 80%. Optimisez votre contenu SEO pour améliorer votre visibilité.
                      </p>
                    </div>
                  </div>
                )}

                {!product.seo_title && (
                  <div className="flex items-start gap-3 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                    <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-medium">Titre SEO manquant</p>
                      <p className="text-sm text-muted-foreground">
                        Ajoutez un titre SEO optimisé entre 50-60 caractères incluant vos mots-clés principaux.
                      </p>
                    </div>
                  </div>
                )}

                {!product.seo_description && (
                  <div className="flex items-start gap-3 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                    <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-medium">Meta description manquante</p>
                      <p className="text-sm text-muted-foreground">
                        Ajoutez une meta description entre 140-160 caractères pour améliorer le taux de clic.
                      </p>
                    </div>
                  </div>
                )}

                {serpInsights?.recommendations && serpInsights.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">Basé sur l'analyse SERP</h4>
                    {serpInsights.recommendations.map((rec, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        <CheckCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                        <p className="text-sm">{rec}</p>
                      </div>
                    ))}
                  </div>
                )}

                {seoScore >= 80 && product.seo_title && product.seo_description && (
                  <div className="flex items-start gap-3 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-medium">Excellent travail !</p>
                      <p className="text-sm text-muted-foreground">
                        Votre produit est bien optimisé. Continuez à surveiller les performances et ajustez selon les tendances SERP.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
