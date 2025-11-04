import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTrialLimits } from '@/hooks/useTrialLimits';
import { UpgradeDialog } from '@/components/UpgradeDialog';
import { calculateDetailedSeoScore } from '@/lib/seoQuality';
import { formatCurrency } from '@/lib/utils';
import { SeoScoreGauge } from '@/components/dashboard/SeoScoreGauge';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { QuickActionCard } from '@/components/dashboard/QuickActionCard';
import { SmartBanner } from '@/components/dashboard/SmartBanner';
import { ActivityTimeline } from '@/components/dashboard/ActivityTimeline';
import { ReferralSystem } from '@/components/dashboard/ReferralSystem';
import { AIRecommendations } from '@/components/dashboard/AIRecommendations';
import { AdvancedAnalytics } from '@/components/dashboard/AdvancedAnalytics';
import { OnboardingTour } from '@/components/OnboardingTour';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/lib/language';
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
  seoCategories: {
    homepage: number;
    products: number;
    collections: number;
    content: number;
    images: number;
    technical: number;
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { t, tf, language } = useTranslation();
  const { trialStatus, showUpgradeDialog, setShowUpgradeDialog } = useTrialLimits();
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    optimizedProducts: 0,
    pendingOptimization: 0,
    totalArticles: 0,
    totalValue: 0,
    seoScore: 0,
    seoCategories: {
      homepage: 0,
      products: 0,
      collections: 0,
      content: 0,
      images: 0,
      technical: 0
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
    if (user) {
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
  }, [user]);

  const loadStats = async () => {
    try {
      const { data: activeStores } = await supabase
        .from('shopify_connections')
        .select('id')
        .eq('user_id', user?.id)
        .eq('is_active', true);

      const activeStoreIds = activeStores?.map(s => s.id) || [];
      const connectedStores = activeStores?.length || 0;

      const { data: products, error: productsError } = await supabase
        .from('shopify_products')
        .select('id, price, seo_title, seo_description, image_url')
        .eq('seller_id', user?.id)
        .in('store_id', activeStoreIds.length > 0 ? activeStoreIds : ['']);

      if (productsError) throw productsError;

      const totalProducts = products?.length || 0;
      const optimizedProducts = products?.filter(p => p.seo_title && p.seo_description).length || 0;
      const totalValue = products?.reduce((sum, p) => sum + (parseFloat(p.price?.toString() || '0') || 0), 0) || 0;

      // Get latest SEO audit for global score
      const { data: latestAudit } = await supabase
        .from('seo_audit_reports')
        .select('global_score, homepage_score, products_score, collections_score, blog_score, images_score, technical_score')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Use audit scores if available
      let seoScore = 0;
      let seoCategories = {
        homepage: 0,
        products: 0,
        collections: 0,
        content: 0,
        images: 0,
        technical: 0
      };

      if (latestAudit?.global_score) {
        // Use audit scores directly
        seoScore = Math.round(latestAudit.global_score);
        seoCategories = {
          homepage: latestAudit.homepage_score || 0,
          products: latestAudit.products_score || 0,
          collections: latestAudit.collections_score || 0,
          content: latestAudit.blog_score || 0, // blog_score stores content score
          images: latestAudit.images_score || 0,
          technical: latestAudit.technical_score || 0
        };
      } else {
        // Fallback: Calculate simple score from products only if no audit exists
        let totalScore = 0;
        let validProducts = 0;

        products?.forEach(p => {
          if (p.seo_title || p.seo_description) {
            const result = calculateDetailedSeoScore(p.seo_title, p.seo_description, true, true);
            totalScore += result.score;
            validProducts++;
          }
        });

        seoScore = validProducts > 0 ? Math.round(totalScore / validProducts) : 0;
        
        // Estimate category scores from product data
        seoCategories = {
          homepage: 50, // Default
          products: seoScore,
          collections: 50, // Default
          content: 50, // Default
          images: validProducts > 0 ? seoScore : 0,
          technical: 80 // Default
        };
      }

      const { count: articlesCount } = await supabase
        .from('blog_articles')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

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
      
      const { data: oldProducts } = await supabase
        .from('shopify_products')
        .select('id, seo_title, seo_description')
        .eq('seller_id', user?.id)
        .in('store_id', activeStoreIds.length > 0 ? activeStoreIds : [''])
        .lt('created_at', thirtyDaysAgo.toISOString());
      
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
        seoCategories,
        connectedStores,
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
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        limitType={trialStatus.limitType as 'optimizations' | 'articles' | 'chat' | 'shopifySearch'}
      />
      
      {/* Hero Section avec Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary-dark to-accent p-8 shadow-xl animate-fade-in">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
        <div className="relative">
          <h1 className="text-4xl font-black text-white mb-2">
            {tf('dashboard.welcome', { name: user?.user_metadata?.full_name || 'User' })}
          </h1>
          <p className="text-white/80 text-lg mb-6">
            {new Date().toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.href = '/seo?tab=audit-dashboard'}
              className="px-6 py-3 bg-white/90 backdrop-blur-md hover:bg-white text-primary font-bold rounded-xl shadow-lg hover:scale-105 transition-transform inline-flex items-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              {t.dashboard.launchAudit}
            </button>
            {stats.pendingOptimization > 0 && (
              <button
                onClick={() => window.location.href = '/seo?tab=products'}
                className="px-6 py-3 bg-accent/90 backdrop-blur-md hover:bg-accent text-white font-bold rounded-xl shadow-lg hover:scale-105 transition-transform inline-flex items-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                {tf('dashboard.optimizeProducts', { count: stats.pendingOptimization })}
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => window.location.href = '/seo?tab=products'}
            className="p-4 bg-card hover:bg-accent/10 border-2 border-accent/20 rounded-xl transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShoppingBag className="w-6 h-6 text-accent" />
              </div>
              <div className="text-left flex-1">
                <div className="font-bold text-foreground">{t.dashboard.actions.optimizeSeo}</div>
                <div className="text-sm text-muted-foreground">
                  {tf('dashboard.actions.optimizedCount', { optimized: stats.optimizedProducts, total: stats.totalProducts })}
                </div>
              </div>
            </div>
          </button>
          
          <button
            onClick={() => window.location.href = '/blog?tab=articles'}
            className="p-4 bg-card hover:bg-cyan-500/10 border-2 border-cyan-500/20 rounded-xl transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6 text-cyan-600" />
              </div>
              <div className="text-left flex-1">
                <div className="font-bold text-foreground">{t.dashboard.actions.createArticle}</div>
                <div className="text-sm text-muted-foreground">
                  {tf('dashboard.actions.published', { count: stats.totalArticles })}
                </div>
              </div>
            </div>
          </button>
          
          <button
            onClick={() => window.location.href = '/integration'}
            className="p-4 bg-card hover:bg-success/10 border-2 border-success/20 rounded-xl transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Store className="w-6 h-6 text-success" />
              </div>
              <div className="text-left flex-1">
                <div className="font-bold text-foreground">
                  {stats.connectedStores > 0 ? t.dashboard.actions.manageStores : t.dashboard.connectShopify}
                </div>
                <div className="text-sm text-muted-foreground">
                  {stats.connectedStores > 0 ? tf('dashboard.actions.stores', { count: stats.connectedStores }) : t.dashboard.importProducts}
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Métriques Clés - Focus sur l'Optimisation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
        <MetricCard
          title={t.dashboard.cards.aiOptimized}
          value={stats.optimizedProducts}
          icon={Sparkles}
          gradient="from-success to-success"
          iconBg="bg-success/10 text-success"
          badge={stats.totalProducts > 0 ? `${Math.round((stats.optimizedProducts / stats.totalProducts) * 100)}%` : '0%'}
          subtitle={`${stats.optimizedProducts}/${stats.totalProducts} ${t.dashboard.cards.products}${stats.trends.optimizations !== 0 ? ` ${stats.trends.optimizations > 0 ? '↗' : '↘'} ${Math.abs(stats.trends.optimizations)} ${t.dashboard.recentActivity.thisMonth}` : ''}`}
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
          value={formatCurrency(stats.totalValue * (stats.optimizedProducts / Math.max(stats.totalProducts, 1)))}
          icon={DollarSign}
          gradient="from-purple-500 to-purple-600"
          iconBg="bg-purple-500/10 text-purple-600"
          subtitle={`${Math.round((stats.optimizedProducts / Math.max(stats.totalProducts, 1)) * 100)}% ${t.dashboard.cards.ofCatalog}`}
        />
        <MetricCard
          title={t.dashboard.cards.activeStores}
          value={stats.connectedStores}
          icon={Store}
          gradient="from-primary to-primary-dark"
          iconBg="bg-primary/10 text-primary"
          subtitle={stats.connectedStores > 0 ? t.dashboard.cards.synchronized : t.dashboard.cards.notConnected}
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
