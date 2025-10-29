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
          title: "🎉 Abonnement activé !",
          description: "Votre abonnement a été activé avec succès. Bienvenue !",
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
          title: "Paiement annulé",
          description: "Vous avez annulé le processus de paiement.",
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

  const statCards = [
    {
      title: 'Produits Total',
      value: stats.totalProducts,
      icon: ShoppingBag,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      trend: '+12% ce mois'
    },
    {
      title: 'Produits Optimisés',
      value: stats.optimizedProducts,
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      percentage: stats.totalProducts > 0 ? `${Math.round((stats.optimizedProducts / stats.totalProducts) * 100)}%` : '0%'
    },
    {
      title: 'En Attente',
      value: stats.pendingOptimization,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      percentage: stats.totalProducts > 0 ? `${Math.round((stats.pendingOptimization / stats.totalProducts) * 100)}%` : '0%'
    },
    {
      title: 'Valeur Catalogue',
      value: `${stats.totalValue.toFixed(2)}€`,
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      trend: '+8.2%'
    },
    {
      title: 'Articles Blog',
      value: stats.totalArticles,
      icon: FileText,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-100',
      trend: 'Ce mois'
    },
    {
      title: 'Taux Optimisation',
      value: stats.totalProducts > 0 ? `${Math.round((stats.optimizedProducts / stats.totalProducts) * 100)}%` : '0%',
      icon: Zap,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      target: 'Objectif: 100%'
    },
    {
      title: 'Score SEO Global',
      value: stats.seoScore,
      icon: Target,
      color: stats.seoScore >= 80 ? 'text-green-600' : stats.seoScore >= 60 ? 'text-yellow-600' : 'text-red-600',
      bgColor: stats.seoScore >= 80 ? 'bg-green-100' : stats.seoScore >= 60 ? 'bg-yellow-100' : 'bg-red-100',
      percentage: `${stats.seoScore}%`,
      subtitle: stats.seoScore >= 80 ? 'Excellent' : stats.seoScore >= 60 ? 'Bon' : 'À améliorer'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-8">
        <div className="container mx-auto max-w-7xl">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <TrialUpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        reason={trialStatus.trialExpired ? 'trial_expired' : 'limit_reached'}
        limitType={trialStatus.limitType}
      />
      
      <div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 flex items-center gap-2 sm:gap-3">
          <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-primary" />
          Dashboard
        </h1>
        <p className="text-sm sm:text-base lg:text-lg text-muted-foreground">
          Vue d'ensemble de votre activité
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <div className={`${stat.bgColor} p-1.5 sm:p-2 rounded-lg`}>
                    <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl sm:text-3xl font-bold">{stat.value}</div>
                  {stat.percentage && (
                    <Badge variant="outline" className="mt-1.5 sm:mt-2 text-xs">
                      {stat.percentage}
                    </Badge>
                  )}
                  {stat.subtitle && (
                    <p className="text-xs font-medium text-muted-foreground mt-1.5 sm:mt-2">
                      {stat.subtitle}
                    </p>
                  )}
                  {stat.trend && (
                    <p className="text-xs text-muted-foreground mt-1.5 sm:mt-2">
                      {stat.trend}
                    </p>
                  )}
                  {stat.target && (
                    <p className="text-xs text-muted-foreground mt-1.5 sm:mt-2">
                      {stat.target}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
      </div>

      {/* Quick Actions */}
      <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Actions Rapides</CardTitle>
            <CardDescription className="text-sm">Gérez votre boutique efficacement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <button
                onClick={() => window.location.href = '/products'}
                className="p-3 sm:p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-left group"
              >
                <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 text-primary mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-sm sm:text-base font-semibold">Gérer Produits</p>
                <p className="text-xs text-muted-foreground">Catalogue complet</p>
              </button>
              
              <button
                onClick={() => window.location.href = '/seo?tab=optimization'}
                className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-left group"
              >
                <Zap className="w-6 h-6 text-yellow-600 mb-2 group-hover:scale-110 transition-transform" />
                <p className="font-semibold">Optimiser SEO</p>
                <p className="text-xs text-muted-foreground">{stats.pendingOptimization} produits</p>
              </button>
              
              <button
                onClick={() => window.location.href = '/blog?tab=articles'}
                className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-left group"
              >
                <FileText className="w-6 h-6 text-cyan-600 mb-2 group-hover:scale-110 transition-transform" />
                <p className="font-semibold">Créer Article</p>
                <p className="text-xs text-muted-foreground">Blog SEO AI</p>
              </button>
              
              <button
                onClick={() => window.location.href = '/chat'}
                className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-left group"
              >
                <MessageSquare className="w-6 h-6 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
                <p className="font-semibold">Chat Smart</p>
                <p className="text-xs text-muted-foreground">Assistant IA</p>
              </button>
            </div>
          </CardContent>
      </Card>

      {/* Performance Overview */}
      {stats.pendingOptimization > 0 && (
        <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                Recommandations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div>
                    <p className="font-semibold text-orange-900">
                      {stats.pendingOptimization} produits à optimiser
                    </p>
                    <p className="text-sm text-orange-700">
                      Améliorez votre SEO pour augmenter la visibilité
                    </p>
                  </div>
                  <button
                    onClick={() => window.location.href = '/seo?tab=optimization'}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    Optimiser
                  </button>
                </div>
              </div>
            </CardContent>
        </Card>
      )}
    </div>
  );
}