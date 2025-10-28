import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Target,
  CheckCircle2,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Tags,
  Globe
} from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  target?: string | number;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
  description?: string;
}

function KPICard({ title, value, target, trend, icon, description }: KPICardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {target && (
          <p className="text-xs text-muted-foreground mt-1">
            Objectif: {target}
          </p>
        )}
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            {trend === 'up' && <TrendingUp className="w-4 h-4 text-green-600" />}
            {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-600" />}
            <span className={`text-xs ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {description}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SeoKPIs() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['seo-kpis', user?.id],
    queryFn: async () => {
      // Récupérer les produits avec leurs optimisations
      const { data: products, error: productsError } = await supabase
        .from('shopify_products')
        .select('id, seo_title, seo_description, tags, optimization_count')
        .eq('seller_id', user?.id);

      if (productsError) throw productsError;

      const totalProducts = products?.length || 0;
      const optimizedProducts = products?.filter(p => p.seo_title && p.seo_description).length || 0;
      const productsWithTags = products?.filter(p => p.tags).length || 0;

      // Récupérer les images avec alt text
      const { data: images, error: imagesError } = await supabase
        .from('product_images')
        .select('alt_text, product_id')
        .in('product_id', products?.map(p => p.id) || []);

      if (imagesError) throw imagesError;

      const totalImages = images?.length || 0;
      const imagesWithAlt = images?.filter(img => img.alt_text).length || 0;

      // Récupérer les pages Shopify
      const { data: pages, error: pagesError } = await supabase
        .from('shopify_pages')
        .select('id, seo_title, seo_description, optimized')
        .eq('user_id', user?.id);

      if (pagesError) throw pagesError;

      const totalPages = pages?.length || 0;
      const optimizedPages = pages?.filter(p => p.optimized).length || 0;

      // Calculer le score SEO global (0-100)
      const seoScore = totalProducts > 0 
        ? Math.round(
            ((optimizedProducts / totalProducts) * 40) +
            ((imagesWithAlt / Math.max(totalImages, 1)) * 30) +
            ((productsWithTags / totalProducts) * 20) +
            ((optimizedPages / Math.max(totalPages, 1)) * 10)
          )
        : 0;

      return {
        totalProducts,
        optimizedProducts,
        productsWithTags,
        totalImages,
        imagesWithAlt,
        totalPages,
        optimizedPages,
        seoScore,
        optimizationRate: totalProducts > 0 ? Math.round((optimizedProducts / totalProducts) * 100) : 0,
        altTextRate: totalImages > 0 ? Math.round((imagesWithAlt / totalImages) * 100) : 0,
        tagsRate: totalProducts > 0 ? Math.round((productsWithTags / totalProducts) * 100) : 0,
        pagesRate: totalPages > 0 ? Math.round((optimizedPages / totalPages) * 100) : 0,
      };
    },
    enabled: !!user?.id
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">KPIs & Performance SEO</h2>
        <p className="text-muted-foreground">
          Suivez vos indicateurs de performance et l'audit de votre optimisation SEO
        </p>
      </div>

      {/* Score SEO Global */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Score SEO Global
          </CardTitle>
          <CardDescription>
            Évaluation globale de votre optimisation SEO
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-5xl font-bold text-primary">{stats?.seoScore}</span>
                <span className="text-2xl text-muted-foreground">/100</span>
              </div>
              <Progress value={stats?.seoScore || 0} className="h-3" />
            </div>
            <div className="text-right">
              <Badge 
                variant={
                  (stats?.seoScore || 0) >= 80 ? 'success' : 
                  (stats?.seoScore || 0) >= 50 ? 'default' : 
                  'destructive'
                }
                className="text-lg px-3 py-1"
              >
                {(stats?.seoScore || 0) >= 80 ? 'Excellent' : 
                 (stats?.seoScore || 0) >= 50 ? 'Bon' : 
                 'À améliorer'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="audit">Audit détaillé</TabsTrigger>
          <TabsTrigger value="recommendations">Recommandations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Taux d'optimisation"
              value={`${stats?.optimizationRate}%`}
              target="100%"
              trend={stats?.optimizationRate === 100 ? 'neutral' : stats?.optimizationRate! > 70 ? 'up' : 'down'}
              icon={<CheckCircle2 className="w-4 h-4 text-green-600" />}
              description={`${stats?.optimizedProducts}/${stats?.totalProducts} produits`}
            />
            
            <KPICard
              title="Textes alternatifs"
              value={`${stats?.altTextRate}%`}
              target="100%"
              trend={stats?.altTextRate === 100 ? 'neutral' : stats?.altTextRate! > 70 ? 'up' : 'down'}
              icon={<ImageIcon className="w-4 h-4 text-blue-600" />}
              description={`${stats?.imagesWithAlt}/${stats?.totalImages} images`}
            />
            
            <KPICard
              title="Taux de tags"
              value={`${stats?.tagsRate}%`}
              target="100%"
              trend={stats?.tagsRate === 100 ? 'neutral' : stats?.tagsRate! > 70 ? 'up' : 'down'}
              icon={<Tags className="w-4 h-4 text-purple-600" />}
              description={`${stats?.productsWithTags}/${stats?.totalProducts} produits`}
            />
            
            <KPICard
              title="Pages optimisées"
              value={`${stats?.pagesRate}%`}
              target="100%"
              trend={stats?.pagesRate === 100 ? 'neutral' : stats?.pagesRate! > 70 ? 'up' : 'down'}
              icon={<Globe className="w-4 h-4 text-orange-600" />}
              description={`${stats?.optimizedPages}/${stats?.totalPages} pages`}
            />
          </div>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit SEO détaillé</CardTitle>
              <CardDescription>
                Analyse approfondie de votre optimisation SEO
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-semibold">Titres et descriptions</p>
                      <p className="text-sm text-muted-foreground">
                        Méta-données essentielles pour le référencement
                      </p>
                    </div>
                  </div>
                  <Badge variant={stats?.optimizationRate === 100 ? 'success' : 'default'}>
                    {stats?.optimizationRate}%
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <ImageIcon className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-semibold">Textes alternatifs images</p>
                      <p className="text-sm text-muted-foreground">
                        Accessibilité et SEO des images
                      </p>
                    </div>
                  </div>
                  <Badge variant={stats?.altTextRate === 100 ? 'success' : 'default'}>
                    {stats?.altTextRate}%
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Tags className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="font-semibold">Tags et catégorisation</p>
                      <p className="text-sm text-muted-foreground">
                        Organisation et navigation du catalogue
                      </p>
                    </div>
                  </div>
                  <Badge variant={stats?.tagsRate === 100 ? 'success' : 'default'}>
                    {stats?.tagsRate}%
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-orange-600" />
                    <div>
                      <p className="font-semibold">Pages Shopify</p>
                      <p className="text-sm text-muted-foreground">
                        Optimisation des pages de contenu
                      </p>
                    </div>
                  </div>
                  <Badge variant={stats?.pagesRate === 100 ? 'success' : 'default'}>
                    {stats?.pagesRate}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recommandations prioritaires</CardTitle>
              <CardDescription>
                Actions à prendre pour améliorer votre SEO
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {stats && stats.optimizationRate < 100 && (
                <div className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-orange-900 dark:text-orange-100">
                      Optimiser les produits restants
                    </p>
                    <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                      {stats.totalProducts - stats.optimizedProducts} produits n'ont pas encore de titres et descriptions SEO optimisés
                    </p>
                  </div>
                </div>
              )}

              {stats && stats.altTextRate < 100 && (
                <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-900 dark:text-blue-100">
                      Ajouter des textes alternatifs
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      {stats.totalImages - stats.imagesWithAlt} images nécessitent des textes alternatifs pour l'accessibilité et le SEO
                    </p>
                  </div>
                </div>
              )}

              {stats && stats.tagsRate < 100 && (
                <div className="flex items-start gap-3 p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-purple-900 dark:text-purple-100">
                      Compléter les tags produits
                    </p>
                    <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                      {stats.totalProducts - stats.productsWithTags} produits manquent de tags pour améliorer la navigation
                    </p>
                  </div>
                </div>
              )}

              {stats && stats.seoScore === 100 && (
                <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-900 dark:text-green-100">
                      Excellent travail ! 🎉
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      Votre optimisation SEO est complète. Continuez à maintenir ce niveau d'excellence.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
