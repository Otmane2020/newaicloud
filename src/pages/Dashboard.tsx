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
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  BarChart3,
  MessageSquare,
  Target,
  Sparkles
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
      
      const checkoutStatus = searchParams.get('checkout');
      if (checkoutStatus === 'success') {
        toast({
          title: `🎉 ${t('dashboard.subscription_activated')}`,
          description: t('dashboard.subscription_activated_desc'),
        });
        
        searchParams.delete('checkout');
        searchParams.delete('session_id');
        setSearchParams(searchParams);
        
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
      const { data: activeStores } = await supabase
        .from('shopify_connections')
        .select('id')
        .eq('user_id', user?.id)
        .eq('is_active', true);

      const activeStoreIds = activeStores?.map(s => s.id) || [];

      const { data: products, error: productsError } = await supabase
        .from('shopify_products')
        .select('price, seo_title, seo_description')
        .eq('seller_id', user?.id)
        .in('store_id', activeStoreIds.length > 0 ? activeStoreIds : ['']);

      if (productsError) throw productsError;

      const totalProducts = products?.length || 0;
      const optimizedProducts = products?.filter(p => p.seo_title && p.seo_description).length || 0;
      const totalValue = products?.reduce((sum, p) => sum + (parseFloat(p.price?.toString() || '0') || 0), 0) || 0;

      let totalConfidence = 0;
      let validProducts = 0;
      products?.forEach(p => {
        if (p.seo_title || p.seo_description) {
          totalConfidence += calculateSeoConfidence(p.seo_title, p.seo_description);
          validProducts++;
        }
      });
      const seoScore = validProducts > 0 ? Math.round(totalConfidence / validProducts) : 0;

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
    return 'text-red-600';
  };

  const getSeoScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-50';
    if (score >= 60) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  const getSeoScoreStatus = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    return 'Needs improvement';
  };

  const statCards = [
    {
      title: 'SEO Score',
      value: stats.seoScore,
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
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Optimized',
      value: stats.optimizedProducts,
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      percentage: stats.totalProducts > 0 ? `${Math.round((stats.optimizedProducts / stats.totalProducts) * 100)}%` : '0%'
    },
    {
      title: 'Pending',
      value: stats.pendingOptimization,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      percentage: stats.totalProducts > 0 ? `${Math.round((stats.pendingOptimization / stats.totalProducts) * 100)}%` : '0%'
    },
    {
      title: 'Catalog Value',
      value: formatCurrency(stats.totalValue),
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Blog Articles',
      value: stats.totalArticles,
      icon: FileText,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <TrialUpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        reason={trialStatus.trialExpired ? 'trial_expired' : 'limit_reached'}
        limitType={trialStatus.limitType}
      />
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Overview of your store performance</p>
      </div>

      {/* Stats Grid - Compact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-md transition-shadow border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <Icon className={`w-4 h-4 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                      <p className="text-xl font-semibold text-gray-900">{stat.value}</p>
                    </div>
                  </div>
                  
                  {stat.percentage && (
                    <Badge variant="secondary" className="text-xs">
                      {stat.percentage}
                    </Badge>
                  )}
                </div>

                {stat.progress !== undefined && (
                  <div className="mt-3 space-y-2">
                    <Progress value={stat.progress} className="h-1.5" />
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">{stat.subtitle}</span>
                      <span className="text-xs font-medium text-gray-700">{stat.progress}%</span>
                    </div>
                  </div>
                )}

                {stat.subtitle && !stat.progress && (
                  <p className="text-xs text-gray-500 mt-1">{stat.subtitle}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card className="border">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
          <CardDescription>Manage your store efficiently</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              onClick={() => window.location.href = '/products'}
              className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left group"
            >
              <ShoppingBag className="w-4 h-4 text-blue-600 mb-2" />
              <p className="text-sm font-medium text-gray-900">Products</p>
              <p className="text-xs text-gray-500">Manage catalog</p>
            </button>
            
            <button
              onClick={() => window.location.href = '/seo?tab=optimization'}
              className="p-3 border border-gray-200 rounded-lg hover:border-yellow-300 hover:bg-yellow-50 transition-colors text-left group"
            >
              <Zap className="w-4 h-4 text-yellow-600 mb-2" />
              <p className="text-sm font-medium text-gray-900">Optimize SEO</p>
              <p className="text-xs text-gray-500">{stats.pendingOptimization} pending</p>
            </button>
            
            <button
              onClick={() => window.location.href = '/blog?tab=articles'}
              className="p-3 border border-gray-200 rounded-lg hover:border-cyan-300 hover:bg-cyan-50 transition-colors text-left group"
            >
              <FileText className="w-4 h-4 text-cyan-600 mb-2" />
              <p className="text-sm font-medium text-gray-900">Blog</p>
              <p className="text-xs text-gray-500">Create content</p>
            </button>
            
            <button
              onClick={() => window.location.href = '/chat'}
              className="p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors text-left group"
            >
              <MessageSquare className="w-4 h-4 text-purple-600 mb-2" />
              <p className="text-sm font-medium text-gray-900">AI Assistant</p>
              <p className="text-xs text-gray-500">Get help</p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {stats.pendingOptimization > 0 && (
        <Card className="border border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Sparkles className="w-4 h-4 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-orange-900">
                    {stats.pendingOptimization} products need optimization
                  </p>
                  <p className="text-xs text-orange-700">
                    Improve your SEO score and visibility
                  </p>
                </div>
              </div>
              <button
                onClick={() => window.location.href = '/seo?tab=optimization'}
                className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors"
              >
                Optimize
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}