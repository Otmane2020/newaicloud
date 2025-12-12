import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/lib/language';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/contexts/StoreContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { calculateTagsScore } from '@/lib/seoQuality';
import {
  ShoppingBag,
  Package,
  Tags,
  Image,
  ArrowRight,
  Sparkles,
  TrendingUp
} from 'lucide-react';

interface LightStats {
  productsScore: number;
  productsTotal: number;
  productsOptimized: number;
  collectionsScore: number;
  collectionsTotal: number;
  collectionsOptimized: number;
  tagsScore: number;
  tagsTotal: number;
  tagsOptimized: number;
  altScore: number;
  altTotal: number;
  altOptimized: number;
}

async function fetchDashboardData(userId: string, storeId: string) {
  // Fetch products and collections in parallel for better performance
  const [productsResult, collectionsResult] = await Promise.all([
    supabase
      .from('shopify_products')
      .select('id, seo_title, seo_description, tags, optimization_count, enrichment_status')
      .eq('seller_id', userId)
      .eq('store_id', storeId),
    supabase
      .from('shopify_collections')
      .select('id, seo_title, seo_description, optimization_count')
      .eq('user_id', userId)
      .eq('store_id', storeId)
  ]);

  const products = productsResult.data || [];
  const collections = collectionsResult.data || [];

  if (productsResult.error) {
    console.error('Error fetching products:', productsResult.error);
  }
  if (collectionsResult.error) {
    console.error('Error fetching collections:', collectionsResult.error);
  }

  // Fetch images only if we have products
  const productIds = products.map(p => p.id);
  let images: { id: string; alt_text: string | null; optimization_count: number | null }[] = [];
  
  if (productIds.length > 0) {
    // Batch fetch in chunks of 100 - parallel
    const chunkSize = 100;
    const chunks: string[][] = [];
    for (let i = 0; i < productIds.length; i += chunkSize) {
      chunks.push(productIds.slice(i, i + chunkSize));
    }
    
    const imageResults = await Promise.all(
      chunks.map(chunk =>
        supabase
          .from('product_images')
          .select('id, alt_text, optimization_count')
          .in('product_id', chunk)
      )
    );
    
    imageResults.forEach(result => {
      if (result.error) {
        console.error('Error fetching images:', result.error);
      } else if (result.data) {
        images = [...images, ...result.data];
      }
    });
  }

  return { products, collections, images };
}

export default function DashboardLight() {
  const { user } = useAuth();
  const { language } = useTranslation();
  const navigate = useNavigate();
  const [stats, setStats] = useState<LightStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { selectedStore } = useStore();

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id || !selectedStore?.id) {
        setStats(null);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const { products, collections, images } = await fetchDashboardData(user.id, selectedStore.id);

        // Calculate scores
        const productsArr = Array.isArray(products) ? products : [];
        const collectionsArr = Array.isArray(collections) ? collections : [];
        const imagesArr = Array.isArray(images) ? images : [];

        // Use enrichment_status === 'enriched' as the criteria (same as SeoOptimization.tsx)
        const productsTotal = productsArr.length;
        const productsOptimized = productsArr.filter((p: any) => 
          p.enrichment_status === 'enriched'
        ).length;
        const productsScore = productsTotal > 0 
          ? Math.round((productsOptimized / productsTotal) * 100) 
          : 0;

        const collectionsTotal = collectionsArr.length;
        const collectionsOptimized = collectionsArr.filter((c: any) => 
          c.optimization_count && c.optimization_count > 0
        ).length;
        const collectionsScore = collectionsTotal > 0 
          ? Math.round((collectionsOptimized / collectionsTotal) * 100) 
          : 0;

        // Tags: match TagOptimization.tsx logic - optimization_count > 0 AND has tags AND tagsScore >= 8
        const tagsTotal = productsArr.length;
        const tagsOptimized = productsArr.filter((p: any) => {
          const hasTags = p.tags && String(p.tags || '').trim().length > 0;
          const tagScore = calculateTagsScore(p.tags);
          return p.optimization_count && p.optimization_count > 0 && hasTags && tagScore >= 8;
        }).length;
        const tagsScore = tagsTotal > 0 
          ? Math.round((tagsOptimized / tagsTotal) * 100) 
          : 0;

        // Alt images: use optimization_count > 0 as the criteria
        const altTotal = imagesArr.length;
        const altOptimized = imagesArr.filter((i: any) => 
          i.optimization_count && i.optimization_count > 0
        ).length;
        const altScore = altTotal > 0 
          ? Math.round((altOptimized / altTotal) * 100) 
          : 0;

        setStats({
          productsScore,
          productsTotal,
          productsOptimized,
          collectionsScore,
          collectionsTotal,
          collectionsOptimized,
          tagsScore,
          tagsTotal,
          tagsOptimized,
          altScore,
          altTotal,
          altOptimized
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user?.id, selectedStore?.id]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const cards = [
    {
      title: language === 'fr' ? 'SEO Produits' : 'Product SEO',
      description: language === 'fr' ? 'Optimisation des titres et descriptions' : 'Title and description optimization',
      icon: ShoppingBag,
      score: stats?.productsScore || 0,
      total: stats?.productsTotal || 0,
      optimized: stats?.productsOptimized || 0,
      path: '/seo?tab=products',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      title: language === 'fr' ? 'SEO Collections' : 'Collection SEO',
      description: language === 'fr' ? 'Optimisation des collections' : 'Collection optimization',
      icon: Package,
      score: stats?.collectionsScore || 0,
      total: stats?.collectionsTotal || 0,
      optimized: stats?.collectionsOptimized || 0,
      path: '/seo?tab=collections',
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      title: language === 'fr' ? 'Tags Produits' : 'Product Tags',
      description: language === 'fr' ? 'Génération automatique de tags' : 'Automatic tag generation',
      icon: Tags,
      score: stats?.tagsScore || 0,
      total: stats?.tagsTotal || 0,
      optimized: stats?.tagsOptimized || 0,
      path: '/seo?tab=tags',
      gradient: 'from-orange-500 to-red-500'
    },
    {
      title: language === 'fr' ? 'Alt Images' : 'Image Alt Text',
      description: language === 'fr' ? 'Texte alternatif des images' : 'Image alternative text',
      icon: Image,
      score: stats?.altScore || 0,
      total: stats?.altTotal || 0,
      optimized: stats?.altOptimized || 0,
      path: '/seo?tab=alt',
      gradient: 'from-green-500 to-emerald-500'
    }
  ];

  // Calculate overall score - only if we have actual data
  const hasData = stats && (stats.productsTotal > 0 || stats.collectionsTotal > 0 || stats.tagsTotal > 0 || stats.altTotal > 0);
  const overallScore = hasData 
    ? Math.round((stats.productsScore + stats.collectionsScore + stats.tagsScore + stats.altScore) / 4)
    : 0;

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          {language === 'fr' ? 'Tableau de Bord SEO' : 'SEO Dashboard'}
        </h1>
        <p className="text-muted-foreground">
          {language === 'fr' 
            ? 'Optimisez le référencement de votre boutique Shopify'
            : 'Optimize your Shopify store SEO'}
        </p>
      </div>

      {/* Overall Score Card */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`text-5xl font-bold ${getScoreColor(overallScore)}`}>
                {loading ? <Skeleton className="w-20 h-14" /> : `${overallScore}%`}
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  {language === 'fr' ? 'Score SEO Global' : 'Overall SEO Score'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {language === 'fr' 
                    ? 'Basé sur 4 catégories principales'
                    : 'Based on 4 main categories'}
                </p>
              </div>
            </div>
            <TrendingUp className={`h-10 w-10 ${getScoreColor(overallScore)}`} />
          </div>
        </CardContent>
      </Card>

      {/* Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map((card) => (
          <Card 
            key={card.path}
            className="hover:shadow-lg transition-all duration-300 cursor-pointer group"
            onClick={() => navigate(card.path)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg bg-gradient-to-r ${card.gradient} text-white`}>
                  <card.icon className="h-5 w-5" />
                </div>
                <div className={`text-2xl font-bold ${getScoreColor(card.score)}`}>
                  {loading ? <Skeleton className="w-12 h-8" /> : `${card.score}%`}
                </div>
              </div>
              <CardTitle className="text-lg mt-2">{card.title}</CardTitle>
              <CardDescription>{card.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-2 w-full" />
              ) : (
                <div className="space-y-2">
                  <Progress 
                    value={card.score} 
                    className="h-2"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>
                      {language === 'fr' 
                        ? `${card.optimized} / ${card.total} optimisés`
                        : `${card.optimized} / ${card.total} optimized`}
                    </span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Action */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">
                {language === 'fr' ? 'Commencer l\'optimisation' : 'Start Optimization'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {language === 'fr'
                  ? 'Améliorez votre score SEO en quelques clics'
                  : 'Improve your SEO score in just a few clicks'}
              </p>
            </div>
            <Button 
              onClick={() => navigate('/seo?tab=collections')}
              className="bg-gradient-to-r from-primary to-primary/80"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {language === 'fr' ? 'Optimiser maintenant' : 'Optimize Now'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
