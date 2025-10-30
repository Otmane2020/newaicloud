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
  Target,
  Sparkles,
  Rocket,
  TrendingUp as TrendingUpIcon
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
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-rose-600';
  };

  const getSeoScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-100 border-emerald-200';
    if (score >= 60) return 'bg-amber-100 border-amber-200';
    if (score >= 40) return 'bg-orange-100 border-orange-200';
    return 'bg-rose-100 border-rose-200';
  };

  const getSeoScoreGradient = (score: number) => {
    if (score >= 80) return 'from-emerald-500 to-green-500';
    if (score >= 60) return 'from-amber-500 to-yellow-500';
    if (score >= 40) return 'from-orange-500 to-red-500';
    return 'from-rose-500 to-red-600';
  };

  const getSeoScoreStatus = (score: number) => {
    if (score >= 80) return 'Excellent! 🎉';
    if (score >= 60) return 'Good job! 👍';
    if (score >= 40) return 'Needs improvement 💪';
    return 'Requires attention ⚠️';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-gradient-to-r from-emerald-500 to-green-500';
    if (score >= 60) return 'bg-gradient-to-r from-amber-500 to-yellow-500';
    if (score >= 40) return 'bg-gradient-to-r from-orange-500 to-red-500';
    return 'bg-gradient-to-r from-rose-500 to-red-600';
  };

  const statCards = [
    {
      title: 'SEO Score',
      value: `${stats.seoScore}/100`,
      icon: Target,
      color: getSeoScoreColor(stats.seoScore),
      bgColor: getSeoScoreBgColor(stats.seoScore),
      gradient: getSeoScoreGradient(stats.seoScore),
      subtitle: getSeoScoreStatus(stats.seoScore),
      progress: stats.seoScore,
      emoji: stats.seoScore >= 80 ? '🚀' : stats.seoScore >= 60 ? '👍' : '💪'
    },
    {
      title: 'Total Products',
      value: stats.totalProducts.toLocaleString(),
      icon: ShoppingBag,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 border-blue-200',
      gradient: 'from-blue-500 to-cyan-500',
      trend: 'All stores',
      emoji: '📦'
    },
    {
      title: 'Optimized Products',
      value: stats.optimizedProducts.toLocaleString(),
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100 border-emerald-200',
      gradient: 'from-emerald-500 to-green-500',
      percentage: stats.totalProducts > 0 ? `${Math.round((stats.optimizedProducts / stats.totalProducts) * 100)}%` : '0%',
      emoji: '✅'
    },
    {
      title: 'Pending Optimization',
      value: stats.pendingOptimization.toLocaleString(),
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100 border-amber-200',
      gradient: 'from-amber-500 to-orange-500',
      percentage: stats.totalProducts > 0 ? `${Math.round((stats.pendingOptimization / stats.totalProducts) * 100)}%` : '0%',
      emoji: '⏳'
    },
    {
      title: 'Catalog Value',
      value: formatCurrency(stats.totalValue),
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 border-purple-200',
      gradient: 'from-purple-500 to-pink-500',
      trend: '+8.2% this month',
      emoji: '💰'
    },
    {
      title: 'Blog Articles',
      value: stats.totalArticles.toLocaleString(),
      icon: FileText,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-100 border-cyan-200',
      gradient: 'from-cyan-500 to-blue-500',
      trend: 'AI Powered Content',
      emoji: '📝'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6 lg:p-8">
        <div className="container mx-auto max-w-7xl">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-32 bg-gradient-to-r from-gray-200 to-gray-300 rounded-2xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 min-h-screen">
      <TrialUpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        reason={trialStatus.trialExpired ? 'trial_expired' : 'limit_reached'}
        limitType={trialStatus.limitType}
      />
      
      {/* Header */}
      <div className="text-center sm:text-left">
        <div className="flex items-center justify-center sm:justify-start gap-3 mb-3">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg">
            <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Dashboard Overview
          </h1>
        </div>
        <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-2xl mx-auto sm:mx-0">
          Track your store performance and SEO optimization progress in real-time
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card 
              key={index} 
              className={`hover:shadow-2xl transition-all duration-300 border-2 shadow-lg hover:scale-105 ${stat.bgColor} relative overflow-hidden`}
            >
              {/* Background Gradient Effect */}
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-5`}></div>
              
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
                <CardTitle className="text-sm font-semibold text-gray-800">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-xl shadow-md ${stat.bgColor} border`}>
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3 relative z-10">
                <div className="flex items-end justify-between">
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {stat.value}
                  </div>
                  <span className="text-lg">{stat.emoji}</span>
                </div>
                
                {/* Progress bar for SEO Score */}
                {stat.progress !== undefined && (
                  <div className="space-y-3">
                    <div className="relative">
                      <Progress 
                        value={stat.progress} 
                        className="h-3 bg-gray-200 rounded-full overflow-hidden"
                      />
                      <div 
                        className={`absolute top-0 left-0 h-3 rounded-full transition-all duration-1000 ease-out ${getProgressColor(stat.progress)}`}
                        style={{ width: `${stat.progress}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center">
                      <Badge 
                        className={`text-xs font-bold ${stat.color} bg-white border shadow-sm`}
                      >
                        {stat.subtitle}
                      </Badge>
                      <span className="text-xs font-bold text-gray-700">
                        {stat.progress}%
                      </span>
                    </div>
                  </div>
                )}
                
                {/* Percentage badges for other cards */}
                {stat.percentage && (
                  <Badge 
                    className="text-xs font-bold bg-white text-gray-700 border shadow-sm"
                  >
                    📊 {stat.percentage} of total
                  </Badge>
                )}
                
                {/* Trend text */}
                {stat.trend && (
                  <div className="flex items-center gap-1">
                    <TrendingUpIcon className="w-3 h-3 text-green-500" />
                    <p className="text-xs font-semibold text-gray-600">
                      {stat.trend}
                    </p>
                  </div>
                )}
                
                {/* Subtitle for other cards */}
                {stat.subtitle && stat.progress === undefined && (
                  <p className="text-xs font-semibold text-gray-500">
                    {stat.subtitle}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card className="border-2 shadow-xl border-white bg-gradient-to-r from-white to-blue-50/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-purple-600" />
            <CardTitle className="text-lg sm:text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Quick Actions
            </CardTitle>
          </div>
          <CardDescription className="text-sm font-medium text-gray-600">
            Manage your store and optimize performance with one click
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <button
              onClick={() => window.location.href = '/products'}
              className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all duration-300 text-left group hover:scale-105"
            >
              <div className="p-2 bg-blue-100 rounded-lg w-fit mb-3 group-hover:scale-110 transition-transform">
                <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <p className="text-sm font-bold text-gray-900 mb-1">Manage Products</p>
              <p className="text-xs text-gray-600">Full catalog overview</p>
            </button>
            
            <button
              onClick={() => window.location.href = '/seo?tab=optimization'}
              className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl hover:border-amber-500 hover:shadow-lg transition-all duration-300 text-left group hover:scale-105"
            >
              <div className="p-2 bg-amber-100 rounded-lg w-fit mb-3 group-hover:scale-110 transition-transform">
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
              </div>
              <p className="text-sm font-bold text-gray-900 mb-1">Optimize SEO</p>
              <p className="text-xs text-gray-600">{stats.pendingOptimization} products pending</p>
            </button>
            
            <button
              onClick={() => window.location.href = '/blog?tab=articles'}
              className="p-4 bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-cyan-200 rounded-xl hover:border-cyan-500 hover:shadow-lg transition-all duration-300 text-left group hover:scale-105"
            >
              <div className="p-2 bg-cyan-100 rounded-lg w-fit mb-3 group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-600" />
              </div>
              <p className="text-sm font-bold text-gray-900 mb-1">Create Article</p>
              <p className="text-xs text-gray-600">AI-powered blog writing</p>
            </button>
            
            <button
              onClick={() => window.location.href = '/chat'}
              className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl hover:border-purple-500 hover:shadow-lg transition-all duration-300 text-left group hover:scale-105"
            >
              <div className="p-2 bg-purple-100 rounded-lg w-fit mb-3 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
              <p className="text-sm font-bold text-gray-900 mb-1">Smart Chat</p>
              <p className="text-xs text-gray-600">AI assistant support</p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Performance Recommendations */}
      {stats.pendingOptimization > 0 && (
        <Card className="border-2 shadow-xl border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold text-orange-900">
              <Sparkles className="w-5 h-5 text-orange-600" />
              Optimization Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gradient-to-r from-orange-100 to-amber-100 rounded-xl border-2 border-orange-300 shadow-md">
                <div className="mb-3 sm:mb-0">
                  <p className="font-bold text-orange-900 text-sm sm:text-base">
                    🚀 {stats.pendingOptimization} products need SEO optimization
                  </p>
                  <p className="text-sm text-orange-800 mt-1 font-medium">
                    Improve your search visibility and drive more traffic to your store
                  </p>
                </div>
                <button
                  onClick={() => window.location.href = '/seo?tab=optimization'}
                  className="px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all duration-300 shadow-lg hover:shadow-xl font-bold text-sm whitespace-nowrap hover:scale-105"
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