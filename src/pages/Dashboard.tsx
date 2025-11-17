import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTrialLimits } from '@/hooks/useTrialLimits';
import { UpgradeDialog } from '@/components/UpgradeDialog';
import {
  calculateProductsSeoScore,
  calculateCollectionsSeoScore,
  calculatePagesSeoScore,
  calculateArticlesSeoScore,
  calculateImagesSeoScore,
  calculateTagsSeoScore,
  calculateHomepageSeoScore,
  calculateDetailedSeoScore,
  calculateArticleSeoScore,
  calculateTagsScore,
  calculateAltTextScore
} from '@/lib/seoQuality';
import { formatCurrency } from '@/lib/utils';
import { SeoScoreGauge } from '@/components/dashboard/SeoScoreGauge';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { QuickActionCard } from '@/components/dashboard/QuickActionCard';
import { SmartBanner } from '@/components/dashboard/SmartBanner';
import { QuotaAlerts } from '@/components/dashboard/QuotaAlerts';
import { SeoChallenges } from '@/components/dashboard/SeoChallenges';
import { ActivityTimeline } from '@/components/dashboard/ActivityTimeline';
import { ReferralSystem } from '@/components/dashboard/ReferralSystem';
import { AIRecommendations } from '@/components/dashboard/AIRecommendations';
import { AdvancedAnalytics } from '@/components/dashboard/AdvancedAnalytics';
import { OnboardingTour } from '@/components/OnboardingTour';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/lib/language';
import { useGoogleShoppingScore } from '@/hooks/useGoogleShoppingScore';
import { useStore } from '@/contexts/StoreContext';
import {
  ShoppingBag, 
  FileText, 
  CheckCircle2,
  Clock,
  DollarSign,
  MessageSquare,
  BarChart3,
  Store,
  Palette,
  Mail,
  Sparkles,
  Target
} from 'lucide-react';

interface Stats {
  totalProducts: number;
  optimizedProducts: number;
  pendingOptimization: number;
  totalArticles: number;
  totalValue: number;
  seoScore: number;
  avgOptimizedScore: number;
  seoCategories: {
    homepage: number;
    products: number;
    collections: number;
    pages: number;
    articles: number;
    images: number;
    tags: number;
  };
  connectedStores: number;
  productsWithImages: number;
  productsWithoutAlt: number;
  // Trends (comparison with previous period)
  trends: {
    products: number;
    optimizations: number;
    articles: number;
    seoScore: number;
  };
}

export default function Dashboard() {
  const { user } = useAuth();
  const { selectedStore } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { t, tf, language } = useTranslation();
  const { trialStatus, showUpgradeDialog, setShowUpgradeDialog } = useTrialLimits();
  const googleShoppingScore = useGoogleShoppingScore(user?.id, selectedStore?.id);
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    optimizedProducts: 0,
    pendingOptimization: 0,
    totalArticles: 0,
    totalValue: 0,
    seoScore: 0,
    avgOptimizedScore: 0,
    seoCategories: {
      homepage: 0,
      products: 0,
      collections: 0,
      pages: 0,
      articles: 0,
      images: 0,
      tags: 0
    },
    connectedStores: 0,
    productsWithImages: 0,
    productsWithoutAlt: 0,
    trends: {
      products: 0,
      optimizations: 0,
      articles: 0,
      seoScore: 0
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (user && selectedStore) {
        loadStats();
        
        const checkoutStatus = searchParams.get('checkout');
        if (checkoutStatus === 'success') {
          toast({
            title: t.toasts.subscriptionActivated,
            description: t.toasts.subscriptionActivatedMessage,
          });
          
          searchParams.delete('checkout');
          searchParams.delete('session_id');
          setSearchParams(searchParams);
          
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else if (checkoutStatus === 'cancelled') {
          toast({
            title: t.toasts.paymentCancelled,
            description: t.toasts.paymentCancelledMessage,
            variant: "destructive"
          });
          
          searchParams.delete('checkout');
          searchParams.delete('plan_id');
          setSearchParams(searchParams);
        }
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [user, selectedStore?.id]);

  const loadStats = async () => {
    try {
      // Get count of all connected stores
      const { count: connectedStores } = await supabase
        .from('shopify_connections')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .eq('is_active', true);

      // First get the exact count of products (without loading all data)
      let countQuery = supabase
        .from('shopify_products')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', user?.id);

      if (selectedStore?.id) {
        countQuery = countQuery.eq('store_id', selectedStore.id);
      }

      const { count: totalProducts, error: countError } = await countQuery;

      if (countError) throw countError;

      // Then fetch products data (limited to first 10k for calculations)
      let productsQuery = supabase
        .from('shopify_products')
        .select('id, price, seo_title, title, seo_description, vendor, image_url, tags, optimization_count, store_id, seo_synced_to_shopify, enrichment_status')
        .eq('seller_id', user?.id)
        .range(0, 9999);

      if (selectedStore?.id) {
        productsQuery = productsQuery.eq('store_id', selectedStore.id);
      }

      const { data: products, error: productsError } = await productsQuery;

      if (productsError) throw productsError;

      const optimizedProducts = products?.filter((p: any) => p.optimization_count && p.optimization_count > 0).length || 0;
      const totalValue = products?.reduce((sum: number, p: any) => sum + (parseFloat(p.price?.toString() || '0') || 0), 0) || 0;
      
      // Calculate average SEO score of optimized products
      const optimizedProductsList = products?.filter((p: any) => p.optimization_count && p.optimization_count > 0) || [];
      const avgOptimizedScore = optimizedProductsList.length > 0
        ? Math.round(
            optimizedProductsList.reduce((sum: number, p: any) => {
              const scoreRaw = calculateDetailedSeoScore(
                p.seo_title || p.title,
                p.seo_description || p.vendor,
                !!p.image_url,
                true,
                p.tags,
                p.optimization_count || 0
              );
              // Apply penalty for pending or not optimized products (same as SeoOptimization.tsx)
              const score = (p.enrichment_status === 'pending' || p.enrichment_status === 'not_optimised') 
                ? scoreRaw.score * 0.5 
                : scoreRaw.score;
              return sum + score;
            }, 0) / optimizedProductsList.length
          )
        : 0;
      
      // Calculate SEO scores using shared functions to ensure consistency with Audit
      
      // 1. PRODUCTS SCORE
      const productsScore = calculateProductsSeoScore(products || []);

      // 2. COLLECTIONS SCORE
      const { data: collections } = await supabase
        .from('shopify_collections')
        .select('id, seo_title, title, seo_description, body_html, image_url, optimization_count')
        .eq('user_id', user?.id)
        .eq('store_id', selectedStore?.id || '')
        .range(0, 9999);
      
      const collectionsScore = calculateCollectionsSeoScore(collections || []);

      // 3. PAGES SCORE
      const { data: pagesData } = await supabase
        .from('shopify_pages')
        .select('seo_title, title, seo_description, body_html, handle, optimization_count')
        .eq('user_id', user?.id)
        .eq('store_id', selectedStore?.id || '')
        .range(0, 9999);

      const pagesScore = calculatePagesSeoScore(pagesData || []);

      // 4. ARTICLES SCORE
      const { data: articlesData } = await supabase
        .from('blog_articles')
        .select('title, meta_description, keywords, featured_image, status, optimization_count')
        .eq('user_id', user?.id)
        .eq('store_id', selectedStore?.id || '')
        .range(0, 9999);

      const articlesScore = calculateArticlesSeoScore(articlesData || []);

      // 5. IMAGES SCORE
      let imagesScore = 0;
      
      // Only calculate if a store is selected (same behavior as SeoAltImageList)
      if (selectedStore?.id) {
        const { data: allImages } = await supabase
          .from('product_images')
          .select('id, alt_text, optimization_count, shopify_products!inner(seller_id, store_id)')
          .eq('shopify_products.seller_id', user?.id)
          .eq('shopify_products.store_id', selectedStore.id);

        imagesScore = calculateImagesSeoScore(allImages || []);
      }

      // 6. TAGS SCORE  
      const tagsScore = calculateTagsSeoScore(products || []);

      // 7. HOMEPAGE SCORE
      // @ts-ignore - Json type causes deep recursion, safe to ignore here
      const { data: homepageData }: any = await supabase
        .from('homepage_seo')
        .select('last_audit')
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const homepageScore = homepageData?.last_audit?.score || 0;

      // Build articles query with optional store filter
      let articlesCountQuery = supabase
        .from('blog_articles')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      if (selectedStore?.id) {
        articlesCountQuery = articlesCountQuery.or(`store_id.eq.${selectedStore.id},store_id.is.null`);
      }

      const { count: articlesCount } = await articlesCountQuery;

      // Build SEO categories with real scores from tabs
      const seoCategories = {
        homepage: homepageScore,
        products: productsScore,
        collections: collectionsScore,
        pages: pagesScore,
        articles: articlesScore,
        images: imagesScore,
        tags: tagsScore
      };

      // Calculate global score as average of all categories
      const seoScore = Math.round(
        (seoCategories.homepage + seoCategories.products + seoCategories.collections + 
         seoCategories.pages + seoCategories.articles + seoCategories.images + seoCategories.tags) / 7
      );

      // DEBUG: Log all calculated scores
      console.log('🔍 Dashboard SEO Scores:', {
        globalScore: seoScore,
        categories: {
          homepage: homepageScore,
          products: productsScore,
          collections: collectionsScore,
          pages: pagesScore,
          articles: articlesScore,
          images: imagesScore,
          tags: tagsScore
        },
        counts: {
          totalProducts,
          optimizedProducts,
          totalArticles: articlesCount || 0
        }
      });

      // Count products with/without alt texts
      const productsWithImages = products?.filter(p => p.image_url)?.length || 0;
      
      const { count: imagesWithoutAlt } = await supabase
        .from('product_images')
        .select('*', { count: 'exact', head: true })
        .in('product_id', products?.map(p => p.id) || [])
        .or('alt_text.is.null,alt_text.eq.');

      // Calculate trends (comparison with last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Build old products query with optional store filter
      let oldProductsQuery = supabase
        .from('shopify_products')
        .select('id, seo_title, seo_description, optimization_count')
        .eq('seller_id', user?.id)
        .lt('created_at', thirtyDaysAgo.toISOString());

      if (selectedStore?.id) {
        oldProductsQuery = oldProductsQuery.eq('store_id', selectedStore.id);
      }

      const { data: oldProducts } = await oldProductsQuery;
      
      const oldTotalProducts = oldProducts?.length || 0;
      const oldOptimizedProducts = oldProducts?.filter(p => p.seo_title && p.seo_description).length || 0;
      
      const { count: oldArticlesCount } = await supabase
        .from('blog_articles')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .lt('created_at', thirtyDaysAgo.toISOString());
      
      // Get previous SEO audit for comparison
      const { data: previousAudit } = await supabase
        .from('seo_audit_reports')
        .select('global_score')
        .eq('user_id', user?.id)
        .lt('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      const oldSeoScore = previousAudit?.global_score || seoScore;
      
      setStats({
        totalProducts,
        optimizedProducts,
        pendingOptimization: totalProducts - optimizedProducts,
        totalArticles: articlesCount || 0,
        totalValue,
        seoScore,
        avgOptimizedScore,
        seoCategories,
        connectedStores: connectedStores || 0,
        productsWithImages,
        productsWithoutAlt: imagesWithoutAlt || 0,
        trends: {
          products: totalProducts - oldTotalProducts,
          optimizations: optimizedProducts - oldOptimizedProducts,
          articles: (articlesCount || 0) - (oldArticlesCount || 0),
          seoScore: seoScore - oldSeoScore
        }
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mock recent activities - In real app, fetch from database
  const recentActivities = [
    {
      id: '1',
      type: 'optimization' as const,
      title: tf('dashboard.recentActivity.productsOptimized', { count: stats.optimizedProducts }),
      timestamp: t.dashboard.recentActivity.today
    },
    {
      id: '2',
      type: 'article' as const,
      title: tf('dashboard.recentActivity.articlesPublished', { count: stats.totalArticles }),
      timestamp: t.dashboard.recentActivity.thisWeek
    },
    {
      id: '3',
      type: 'connection' as const,
      title: tf('dashboard.recentActivity.storesConnected', { 
        count: stats.connectedStores, 
        plural: stats.connectedStores > 1 ? 's' : '' 
      }),
      timestamp: t.dashboard.recentActivity.thisMonth
    }
  ].filter(a => {
    // Only show activities with non-zero values
    if (a.type === 'optimization') return stats.optimizedProducts > 0;
    if (a.type === 'article') return stats.totalArticles > 0;
    if (a.type === 'connection') return stats.connectedStores > 0;
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-6 p-6 max-w-7xl mx-auto animate-fade-in">
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6 max-w-full overflow-x-hidden">
      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        limitType={trialStatus.limitType as 'optimizations' | 'articles' | 'chat' | 'shopifySearch'}
      />
      
      {/* Hero Section avec Welcome Banner */}
      <div className="relative overflow-hidden rounded-lg sm:rounded-xl md:rounded-2xl bg-gradient-to-br from-primary via-primary-dark to-accent p-3 sm:p-4 md:p-6 lg:p-8 shadow-xl animate-fade-in">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
        <div className="relative">
          <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-black text-white mb-1 sm:mb-2 break-words">
            {tf('dashboard.welcome', { name: user?.user_metadata?.full_name || 'User' })}
          </h1>
          <p className="text-white/80 text-xs sm:text-sm mb-3 sm:mb-4 md:mb-6 break-words">
            {new Date().toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => window.location.href = '/seo?tab=audit-dashboard'}
              className="px-3 sm:px-4 md:px-6 py-2 text-xs sm:text-sm bg-white/90 backdrop-blur-md hover:bg-white text-primary font-bold rounded-lg shadow-lg hover:scale-105 transition-transform inline-flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="break-words">{t.dashboard.launchAudit}</span>
            </button>
            {stats.pendingOptimization > 0 && (
              <button
                onClick={() => window.location.href = '/seo?tab=products'}
                className="px-3 sm:px-4 md:px-6 py-2 text-xs sm:text-sm bg-accent/90 backdrop-blur-md hover:bg-accent text-white font-bold rounded-lg shadow-lg hover:scale-105 transition-transform inline-flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="break-words">{tf('dashboard.optimizeProducts', { count: stats.pendingOptimization })}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SEO Score Card - Section Principale */}
      <div className="grid grid-cols-1 gap-6">
        <SeoScoreGauge 
          score={stats.seoScore}
          categories={stats.seoCategories}
        />
        
        {/* Quick Actions sous le score */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <button
            onClick={() => window.location.href = '/seo?tab=products'}
            className="p-3 sm:p-4 bg-card hover:bg-accent/10 border-2 border-accent/20 rounded-xl transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
              </div>
              <div className="text-left flex-1">
                <div className="font-bold text-sm sm:text-base text-foreground">{t.dashboard.actions.optimizeSeo}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  {tf('dashboard.actions.optimizedCount', { optimized: stats.optimizedProducts, total: stats.totalProducts })}
                </div>
              </div>
            </div>
          </button>
          
          <button
            onClick={() => window.location.href = '/blog?tab=articles'}
            className="p-3 sm:p-4 bg-card hover:bg-cyan-500/10 border-2 border-cyan-500/20 rounded-xl transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-600" />
              </div>
              <div className="text-left flex-1">
                <div className="font-bold text-sm sm:text-base text-foreground">{t.dashboard.actions.createArticle}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  {tf('dashboard.actions.published', { count: stats.totalArticles })}
                </div>
              </div>
            </div>
          </button>
          
          <button
            onClick={() => window.location.href = '/integration'}
            className="p-3 sm:p-4 bg-card hover:bg-success/10 border-2 border-success/20 rounded-xl transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-success/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Store className="w-5 h-5 sm:w-6 sm:h-6 text-success" />
              </div>
              <div className="text-left flex-1">
                <div className="font-bold text-sm sm:text-base text-foreground">
                  {stats.connectedStores > 0 ? t.dashboard.actions.manageStores : t.dashboard.connectShopify}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  {stats.connectedStores > 0 ? tf('dashboard.actions.stores', { count: stats.connectedStores }) : t.dashboard.importProducts}
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Métriques Clés - Focus sur l'Optimisation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
        <MetricCard
          title={t.dashboard.cards.aiOptimized}
          value={stats.optimizedProducts}
          icon={Sparkles}
          gradient="from-success to-success"
          iconBg="bg-success/10 text-success"
          badge={stats.totalProducts > 0 ? `${Math.round((stats.optimizedProducts / stats.totalProducts) * 100)}% traités par IA` : '0%'}
          subtitle={stats.avgOptimizedScore > 0 ? `Score moyen : ${stats.avgOptimizedScore}/100` : `${stats.optimizedProducts}/${stats.totalProducts} ${t.dashboard.cards.products}`}
        />
        <MetricCard
          title={t.dashboard.cards.toOptimize}
          value={stats.pendingOptimization}
          icon={Clock}
          gradient="from-warning to-warning"
          iconBg="bg-warning/10 text-warning"
          badge={stats.pendingOptimization > 10 ? t.dashboard.cards.actionRequired : t.dashboard.quality.good}
          subtitle={t.dashboard.cards.productsNoSeo}
        />
        <MetricCard
          title={t.dashboard.cards.seoScore}
          value={`${stats.seoScore}/100`}
          icon={Target}
          gradient="from-primary via-accent to-success"
          iconBg="bg-gradient-to-br from-primary/10 to-success/10 text-primary"
          subtitle={stats.seoScore >= 80 ? t.dashboard.quality.excellent : stats.seoScore >= 60 ? t.dashboard.quality.good : t.dashboard.quality.improve}
          trend={stats.trends.seoScore !== 0 ? `${stats.trends.seoScore > 0 ? '↗' : '↘'} ${Math.abs(stats.trends.seoScore)} pts` : undefined}
        />
        <MetricCard
          title={t.dashboard.cards.articlesPublished}
          value={stats.totalArticles}
          icon={FileText}
          gradient="from-cyan-500 to-cyan-600"
          iconBg="bg-cyan-500/10 text-cyan-600"
          subtitle={`${t.dashboard.cards.seoContent}${stats.trends.articles !== 0 ? ` ${stats.trends.articles > 0 ? '↗' : '↘'} ${Math.abs(stats.trends.articles)} ${t.dashboard.recentActivity.thisMonth}` : ''}`}
        />
        <MetricCard
          title={t.dashboard.cards.optimizedValue}
          value={formatCurrency(stats.totalValue * (stats.avgOptimizedScore / 100))}
          icon={DollarSign}
          gradient="from-purple-500 to-purple-600"
          iconBg="bg-purple-500/10 text-purple-600"
          subtitle={stats.avgOptimizedScore > 0 ? `Basé sur score SEO moyen de ${stats.avgOptimizedScore}/100` : `${Math.round((stats.optimizedProducts / Math.max(stats.totalProducts, 1)) * 100)}% ${t.dashboard.cards.ofCatalog}`}
        />
        <MetricCard
          title={t.dashboard.cards.activeStores}
          value={stats.connectedStores}
          icon={Store}
          gradient="from-primary to-primary-dark"
          iconBg="bg-primary/10 text-primary"
          subtitle={stats.connectedStores > 0 ? t.dashboard.cards.synchronized : t.dashboard.cards.notConnected}
        />
        <MetricCard
          title="Google Shopping"
          value={`${googleShoppingScore.score}/100`}
          icon={ShoppingBag}
          gradient="from-blue-500 to-blue-600"
          iconBg="bg-blue-500/10 text-blue-600"
          subtitle={`${googleShoppingScore.optimizedProducts}/${googleShoppingScore.totalProducts} ${t.dashboard.cards.optimizedProducts}`}
          badge={googleShoppingScore.score >= 80 ? t.dashboard.cards.excellent : googleShoppingScore.score >= 50 ? t.dashboard.cards.good : t.dashboard.cards.needsImprovement}
        />
      </div>

      {/* Referral System */}
      <div className="animate-fade-in" style={{ animationDelay: '150ms' }}>
        <ReferralSystem />
      </div>

      {/* Quick Actions - 8 actions */}
      <div className="space-y-4 animate-fade-in" style={{ animationDelay: '200ms' }}>
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">{t.dashboard.quickActions}</h2>
          <p className="text-muted-foreground">{t.dashboard.quickActionsDesc}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickActionCard
            title={t.dashboard.actions.manageProducts}
            description={t.dashboard.actions.fullCatalog}
            icon={ShoppingBag}
            iconColor="text-primary"
            iconBg="bg-primary/10"
            borderColor="border-primary/20"
            hoverBg="hover:bg-primary/5"
            onClick={() => window.location.href = '/products'}
            counter={stats.totalProducts}
            badge={{
              text: tf('dashboard.actions.optimizedCount', { optimized: stats.optimizedProducts, total: stats.totalProducts }),
              variant: 'secondary'
            }}
          />
          <QuickActionCard
            title={t.dashboard.actions.optimizeSeo}
            description={t.dashboard.actions.pendingProducts}
            icon={Sparkles}
            iconColor="text-warning"
            iconBg="bg-warning/10"
            borderColor="border-warning/20"
            hoverBg="hover:bg-warning/5"
            onClick={() => window.location.href = '/seo?tab=optimization'}
            counter={stats.pendingOptimization}
            badge={stats.pendingOptimization > 5 ? {
              text: t.dashboard.cards.actionRequired,
              variant: 'destructive'
            } : undefined}
          />
          <QuickActionCard
            title={t.dashboard.actions.createArticle}
            description={t.dashboard.actions.aiGenerated}
            icon={FileText}
            iconColor="text-cyan-600"
            iconBg="bg-cyan-500/10"
            borderColor="border-cyan-500/20"
            hoverBg="hover:bg-cyan-500/5"
            onClick={() => window.location.href = '/blog?tab=articles'}
            counter={stats.totalArticles}
            badge={{
              text: t.badges.new,
              variant: 'default'
            }}
          />
          <QuickActionCard
            title={t.dashboard.actions.aiAssistant}
            description={t.dashboard.actions.smartChat}
            icon={MessageSquare}
            iconColor="text-purple-600"
            iconBg="bg-purple-500/10"
            borderColor="border-purple-500/20"
            hoverBg="hover:bg-purple-500/5"
            onClick={() => window.location.href = '/chat'}
            badge={{
              text: t.dashboard.actions.online,
              variant: 'success'
            }}
          />
          <QuickActionCard
            title={t.dashboard.actions.analytics}
            description={t.dashboard.actions.trackPerformance}
            icon={BarChart3}
            iconColor="text-accent"
            iconBg="bg-accent/10"
            borderColor="border-accent/20"
            hoverBg="hover:bg-accent/5"
            onClick={() => window.location.href = '/products'}
          />
          <QuickActionCard
            title={stats.connectedStores > 0 ? t.dashboard.actions.connectShopify : t.dashboard.connectShopify}
            description={stats.connectedStores > 0 ? t.dashboard.actions.manageStores : t.dashboard.actions.connectNow}
            icon={Store}
            iconColor="text-success"
            iconBg="bg-success/10"
            borderColor="border-success/20"
            hoverBg="hover:bg-success/5"
            onClick={() => window.location.href = '/integration'}
            counter={stats.connectedStores}
            badge={stats.connectedStores > 0 ? {
              text: t.dashboard.actions.connected,
              variant: 'success'
            } : {
              text: t.dashboard.actions.connect,
              variant: 'outline'
            }}
          />
          <QuickActionCard
            title={t.dashboard.actions.homepage}
            description={t.dashboard.actions.updateSeo}
            icon={Palette}
            iconColor="text-pink-600"
            iconBg="bg-pink-500/10"
            borderColor="border-pink-500/20"
            hoverBg="hover:bg-pink-500/5"
            onClick={() => window.location.href = '/seo?tab=homepage'}
          />
          <QuickActionCard
            title={t.dashboard.actions.emailCampaigns}
            description={t.dashboard.actions.comingSoon}
            icon={Mail}
            iconColor="text-gray-600"
            iconBg="bg-gray-500/10"
            borderColor="border-gray-500/20"
            hoverBg="hover:bg-gray-500/5"
            onClick={() => {}}
            badge={{
              text: t.badges.beta,
              variant: 'secondary'
            }}
          />
        </div>
      </div>

      {/* Smart Recommendations Banner */}
      <div className="space-y-4 animate-fade-in" style={{ animationDelay: '300ms' }}>
        {/* Onboarding Tour */}
        <OnboardingTour />
        
        {/* AI Recommendations */}
        <AIRecommendations
          stats={{
            productsCount: stats.totalProducts,
            optimizedCount: stats.optimizedProducts,
            articlesCount: stats.totalArticles,
            seoScore: stats.seoScore,
            productsWithImages: stats.productsWithImages,
            productsWithoutAlt: stats.productsWithoutAlt,
          }}
        />

        {stats.pendingOptimization > 0 && (
          <SmartBanner
            type="optimization"
            title={tf('dashboard.banners.optimization.title', { count: stats.pendingOptimization })}
            description={tf('dashboard.banners.optimization.description', { gain: Math.min(stats.pendingOptimization * 5, 30) })}
            actionLabel={t.dashboard.banners.optimization.action}
            onAction={() => window.location.href = '/seo?tab=optimization'}
            count={stats.pendingOptimization}
          />
        )}
        
        {stats.seoScore < 60 && stats.seoScore > 0 && (
          <SmartBanner
            type="low-score"
            title={t.dashboard.banners.lowScore.title}
            description={t.dashboard.banners.lowScore.description}
            actionLabel={t.dashboard.banners.lowScore.action}
            onAction={() => window.location.href = '/seo?tab=optimization'}
          />
        )}

        {stats.seoScore >= 80 && (
          <SmartBanner
            type="success"
            title={t.dashboard.banners.success.title}
            description={t.dashboard.banners.success.description}
            actionLabel={t.dashboard.banners.success.action}
            onAction={() => window.location.href = '/seo'}
          />
        )}

        {/* Quota Alerts */}
        <QuotaAlerts />
        
        {/* SEO Challenges */}
        <SeoChallenges />
      </div>

      {/* Advanced Analytics */}
      <div className="animate-fade-in" style={{ animationDelay: '400ms' }}>
        <AdvancedAnalytics />
      </div>

      {/* Recent Activity Timeline */}
      <div className="animate-fade-in" style={{ animationDelay: '500ms' }}>
        <ActivityTimeline activities={recentActivities} />
      </div>
    </div>
  );
}
