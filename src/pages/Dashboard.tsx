import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTrialLimits } from '@/hooks/useTrialLimits';
import { TrialUpgradeDialog } from '@/components/TrialUpgradeDialog';
import { calculateSeoConfidence } from '@/lib/seoQuality';
import { formatCurrency } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { 
  ShoppingBag, 
  Zap, 
  FileText, 
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  BarChart3,
  MessageSquare,
  Target
} from 'lucide-react';

interface Stats {
  totalProducts: number;
  optimizedProducts: number;
  pendingOptimization: number;
  totalArticles: number;
  totalValue: number;
  seoScore: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { trialStatus, showUpgradeDialog, setShowUpgradeDialog } = useTrialLimits();
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    optimizedProducts: 0,
    pendingOptimization: 0,
    totalArticles: 0,
    totalValue: 0,
    seoScore: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadStats();
      
      // Check if returning from successful checkout
      const checkoutStatus = searchParams.get('checkout');
      if (checkoutStatus === 'success') {
        console.log('✅ Returning from successful checkout, refreshing profile...');
        
        // Show success message
        toast({
          title: `🎉 ${t('dashboard.subscription_activated')}`,
          description: t('dashboard.subscription_activated_desc'),
        });
        
        // Remove the checkout parameter from URL
        searchParams.delete('checkout');
        searchParams.delete('session_id');
        setSearchParams(searchParams);
        
        // Force refresh the page to ensure SubscriptionGuard reloads
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else if (checkoutStatus === 'cancelled') {
        toast({
          title: t('dashboard.payment_cancelled'),
          description: t('dashboard.payment_cancelled_desc'),
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
      // Get active stores
      const { data: activeStores } = await supabase
        .from('shopify_connections')
        .select('id')
        .eq('user_id', user?.id)
        .eq('is_active', true);

      const activeStoreIds = activeStores?.map(s => s.id) || [];

      // Load products stats (only from active stores)
      const { data: products, error: productsError } = await supabase
        .from('shopify_products')
        .select('price, seo_title, seo_description')
        .eq('seller_id', user?.id)
        .in('store_id', activeStoreIds.length > 0 ? activeStoreIds : ['']);

      if (productsError) throw productsError;

      const totalProducts = products?.length || 0;
      const optimizedProducts = products?.filter(p => p.seo_title && p.seo_description).length || 0;
      const totalValue = products?.reduce((sum, p) => sum + (parseFloat(p.price?.toString() || '0') || 0), 0) || 0;

      // Calculate SEO score based on confidence
      let totalConfidence = 0;
      let validProducts = 0;
      products?.forEach(p => {
        if (p.seo_title || p.seo_description) {
          totalConfidence += calculateSeoConfidence(p.seo_title, p.seo_description);
          validProducts++;
        }
      });
      const seoScore = validProducts > 0 ? Math.round(totalConfidence / validProducts) : 0;

      // Load blog articles count
      const { count: articlesCount } = await supabase
        .from('blog_articles')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      setStats({
        totalProducts,
        optimizedProducts,
        pendingOptimization: totalProducts - optimizedProducts,
        totalArticles: articlesCount || 0,
        totalValue,
        seoScore
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeoScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getSeoScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    if (score >= 40) return 'bg-orange-100';
    return 'bg-red-100';
  };

  const getSeoScoreStatus = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Needs Improvement';
    return 'Poor';
  };

  const statCards = [
    {
      title: 'SEO Score',
      value: `${stats.seoScore}/100`,
      icon: Target,
      color: getSeoScoreColor(stats.seoScore),
      bgColor: getSeoScoreBgColor(stats.seoScore),
      subtitle: getSeoScoreStatus(stats.seoScore),
      progress: stats.seoScore
    },
    {
      title: 'Total Products',
      value: stats.totalProducts,
      icon: ShoppingBag,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      trend: 'All stores'
    },
    {
      title: 'Optimized Products',
      value: stats.optimizedProducts,
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      percentage: stats.totalProducts > 0 ? `${Math.round((stats.optimizedProducts / stats.totalProducts) * 100)}%` : '0%'
    },
    {
      title: 'Pending Optimization',
      value: stats.pendingOptimization,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      percentage: stats.totalProducts > 0 ? `${Math.round((stats.pendingOptimization / stats.totalProducts) * 100)}%` : '0%'
    },
    {
      title: 'Catalog Value',
      value: formatCurrency(stats.totalValue),
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      trend: '+8.2%'
    },
    {
      title: 'Blog Articles',
      value: stats.totalArticles,
      icon: FileText,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-100',
      trend: 'This month'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-4 sm:p-6 lg:p-8">
        <div className="container mx-auto max-w-7xl">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8">
      <TrialUpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        reason={trialStatus.trialExpired ? 'trial_expired' : 'limit_reached'}
        limitType={trialStatus.limitType}
      />
      
      {/* Header */}
      <div className="text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 flex items-center justify-center sm:justify-start gap-2 sm:gap-3">
          <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-primary" />
          Dashboard Overview
        </h1>
        <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto sm:mx-0">
          Track your store performance and SEO optimization progress
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow duration-300 border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-gray-700">
                  {stat.title}
                </CardTitle>
                <div className={`${stat.bgColor} p-2 rounded-xl`}>
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {stat.value}
                </div>
                
                {/* Progress bar for SEO Score */}
                {stat.progress !== undefined && (
                  <div className="space-y-2">
                    <Progress value={stat.progress} className="h-2" />
                    <div className="flex justify-between items-center">
                      <Badge 
                        variant="outline" 
                        className={`text-xs font-medium ${stat.color} border-current`}
                      >
                        {stat.subtitle}
                      </Badge>
                      <span className="text-xs text-gray-500 font-medium">
                        {stat.progress}%
                      </span>
                    </div>
                  </div>
                )}
                
                {/* Percentage badges for other cards */}
                {stat.percentage && (
                  <Badge 
                    variant="secondary" 
                    className="text-xs font-medium bg-gray-100 text-gray-700"
                  >
                    {stat.percentage} of total
                  </Badge>
                )}
                
                {/* Trend text */}
                {stat.trend && (
                  <p className="text-xs text-gray-500 font-medium">
                    {stat.trend}
                  </p>
                )}
                
                {/* Subtitle for other cards */}
                {stat.subtitle && stat.progress === undefined && (
                  <p className="text-xs font-medium text-gray-500">
                    {stat.subtitle}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg sm:text-xl font-semibold">Quick Actions</CardTitle>
          <CardDescription className="text-sm">
            Manage your store and optimize performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <button
              onClick={() => window.location.href = '/products'}
              className="p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-300 text-left group hover:shadow-md"
            >
              <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 mb-3 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-semibold text-gray-900 mb-1">Manage Products</p>
              <p className="text-xs text-gray-500">Full catalog overview</p>
            </button>
            
            <button
              onClick={() => window.location.href = '/seo?tab=optimization'}
              className="p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-yellow-500 hover:bg-yellow-50 transition-all duration-300 text-left group hover:shadow-md"
            >
              <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 mb-3 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-semibold text-gray-900 mb-1">Optimize SEO</p>
              <p className="text-xs text-gray-500">{stats.pendingOptimization} products pending</p>
            </button>
            
            <button
              onClick={() => window.location.href = '/blog?tab=articles'}
              className="p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-cyan-500 hover:bg-cyan-50 transition-all duration-300 text-left group hover:shadow-md"
            >
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-600 mb-3 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-semibold text-gray-900 mb-1">Create Article</p>
              <p className="text-xs text-gray-500">AI-powered blog writing</p>
            </button>
            
            <button
              onClick={() => window.location.href = '/chat'}
              className="p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all duration-300 text-left group hover:shadow-md"
            >
              <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 mb-3 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-semibold text-gray-900 mb-1">Smart Chat</p>
              <p className="text-xs text-gray-500">AI assistant support</p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Performance Recommendations */}
      {stats.pendingOptimization > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl font-semibold">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              Optimization Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-orange-50 rounded-xl border border-orange-200">
                <div className="mb-3 sm:mb-0">
                  <p className="font-semibold text-orange-900 text-sm sm:text-base">
                    {stats.pendingOptimization} products need SEO optimization
                  </p>
                  <p className="text-sm text-orange-700 mt-1">
                    Improve your search visibility and drive more traffic
                  </p>
                </div>
                <button
                  onClick={() => window.location.href = '/seo?tab=optimization'}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium whitespace-nowrap"
                >
                  Optimize Now
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}