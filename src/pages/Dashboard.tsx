import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTrialLimits } from '@/hooks/useTrialLimits';
import { TrialUpgradeDialog } from '@/components/TrialUpgradeDialog';
import { calculateDetailedSeoScore } from '@/lib/seoQuality';
import { formatCurrency } from '@/lib/utils';
import { SeoScoreGauge } from '@/components/dashboard/SeoScoreGauge';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { QuickActionCard } from '@/components/dashboard/QuickActionCard';
import { SmartBanner } from '@/components/dashboard/SmartBanner';
import { ActivityTimeline } from '@/components/dashboard/ActivityTimeline';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ShoppingBag, 
  Zap, 
  FileText, 
  CheckCircle2,
  Clock,
  DollarSign,
  MessageSquare,
  BarChart3,
  Store,
  Palette,
  Mail,
  Sparkles
} from 'lucide-react';

interface Stats {
  totalProducts: number;
  optimizedProducts: number;
  pendingOptimization: number;
  totalArticles: number;
  totalValue: number;
  seoScore: number;
  seoBreakdown: {
    presence: number;
    length: number;
    keywords: number;
    readability: number;
  };
  connectedStores: number;
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
    seoScore: 0,
    seoBreakdown: {
      presence: 0,
      length: 0,
      keywords: 0,
      readability: 0
    },
    connectedStores: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadStats();
      
      const checkoutStatus = searchParams.get('checkout');
      if (checkoutStatus === 'success') {
        toast({
          title: "🎉 Subscription Activated",
          description: "Your subscription is now active. Welcome aboard!",
        });
        
        searchParams.delete('checkout');
        searchParams.delete('session_id');
        setSearchParams(searchParams);
        
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else if (checkoutStatus === 'cancelled') {
        toast({
          title: "Payment Cancelled",
          description: "Your payment was cancelled. You can try again anytime.",
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
        .select('price, seo_title, seo_description')
        .eq('seller_id', user?.id)
        .in('store_id', activeStoreIds.length > 0 ? activeStoreIds : ['']);

      if (productsError) throw productsError;

      const totalProducts = products?.length || 0;
      const optimizedProducts = products?.filter(p => p.seo_title && p.seo_description).length || 0;
      const totalValue = products?.reduce((sum, p) => sum + (parseFloat(p.price?.toString() || '0') || 0), 0) || 0;

      // Calculate detailed SEO breakdown
      const seoBreakdown = {
        presence: 0,
        length: 0,
        keywords: 0,
        readability: 0
      };
      
      let totalScore = 0;
      let validProducts = 0;

      products?.forEach(p => {
        if (p.seo_title || p.seo_description) {
          const result = calculateDetailedSeoScore(p.seo_title, p.seo_description, true, true);
          totalScore += result.score;
          seoBreakdown.presence += result.breakdown.presence;
          seoBreakdown.length += result.breakdown.length;
          seoBreakdown.keywords += result.breakdown.keywords;
          seoBreakdown.readability += result.breakdown.readability;
          validProducts++;
        }
      });

      const avgScore = validProducts > 0 ? Math.round(totalScore / validProducts) : 0;
      const avgBreakdown = {
        presence: validProducts > 0 ? Math.round(seoBreakdown.presence / validProducts) : 0,
        length: validProducts > 0 ? Math.round(seoBreakdown.length / validProducts) : 0,
        keywords: validProducts > 0 ? Math.round(seoBreakdown.keywords / validProducts) : 0,
        readability: validProducts > 0 ? Math.round(seoBreakdown.readability / validProducts) : 0
      };

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
        seoScore: avgScore,
        seoBreakdown: avgBreakdown,
        connectedStores
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
      title: `${stats.optimizedProducts} produits optimisés`,
      timestamp: 'Aujourd\'hui'
    },
    {
      id: '2',
      type: 'article' as const,
      title: `${stats.totalArticles} articles publiés`,
      timestamp: 'Cette semaine'
    },
    {
      id: '3',
      type: 'connection' as const,
      title: `${stats.connectedStores} boutique${stats.connectedStores > 1 ? 's' : ''} connectée${stats.connectedStores > 1 ? 's' : ''}`,
      timestamp: 'Ce mois'
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
      <TrialUpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        reason={trialStatus.trialExpired ? 'trial_expired' : 'limit_reached'}
        limitType={trialStatus.limitType}
      />
      
      {/* Hero Section avec Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary-dark to-accent p-8 shadow-xl animate-fade-in">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
        <div className="relative">
          <h1 className="text-4xl font-black text-white mb-2">
            Bienvenue, {user?.user_metadata?.full_name || 'Utilisateur'} 👋
          </h1>
          <p className="text-white/80 text-lg mb-6">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <button
            onClick={() => window.location.href = '/seo?tab=audit'}
            className="px-6 py-3 bg-white/90 backdrop-blur-md hover:bg-white text-primary font-bold rounded-xl shadow-lg hover:scale-105 transition-transform inline-flex items-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            Lancer l'Audit SEO
          </button>
        </div>
      </div>

      {/* SEO Score Card - Section Principale */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SeoScoreGauge 
          score={stats.seoScore}
          breakdown={stats.seoBreakdown}
        />
      </div>

      {/* Métriques Clés - Grid Redesigné */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
        <MetricCard
          title="Total Produits"
          value={stats.totalProducts}
          icon={ShoppingBag}
          gradient="from-primary to-primary-dark"
          iconBg="bg-primary/10 text-primary"
          trend="+12.5% ce mois"
        />
        <MetricCard
          title="Optimisés"
          value={stats.optimizedProducts}
          icon={CheckCircle2}
          gradient="from-success to-success"
          iconBg="bg-success/10 text-success"
          badge={stats.totalProducts > 0 ? `${Math.round((stats.optimizedProducts / stats.totalProducts) * 100)}%` : '0%'}
        />
        <MetricCard
          title="En Attente"
          value={stats.pendingOptimization}
          icon={Clock}
          gradient="from-warning to-warning"
          iconBg="bg-warning/10 text-warning"
          badge={stats.totalProducts > 0 ? `${Math.round((stats.pendingOptimization / stats.totalProducts) * 100)}%` : '0%'}
        />
        <MetricCard
          title="Valeur Catalogue"
          value={formatCurrency(stats.totalValue)}
          icon={DollarSign}
          gradient="from-purple-500 to-purple-600"
          iconBg="bg-purple-500/10 text-purple-600"
        />
        <MetricCard
          title="Articles Blog"
          value={stats.totalArticles}
          icon={FileText}
          gradient="from-cyan-500 to-cyan-600"
          iconBg="bg-cyan-500/10 text-cyan-600"
          trend="+3 ce mois"
        />
        <MetricCard
          title="Score Santé SEO"
          value={`${stats.seoScore}%`}
          icon={Sparkles}
          gradient="from-primary via-accent to-success"
          iconBg="bg-gradient-to-br from-primary/10 to-success/10 text-primary"
          subtitle={stats.seoScore >= 80 ? 'Excellent' : stats.seoScore >= 60 ? 'Bon' : 'À améliorer'}
        />
      </div>

      {/* Quick Actions - 8 actions */}
      <div className="space-y-4 animate-fade-in" style={{ animationDelay: '200ms' }}>
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Actions Rapides</h2>
          <p className="text-muted-foreground">Accédez aux fonctionnalités clés directement</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickActionCard
            title="Gérer Produits"
            description="Catalogue complet"
            icon={ShoppingBag}
            iconColor="text-primary"
            iconBg="bg-primary/10"
            borderColor="border-primary/20"
            hoverBg="hover:bg-primary/5"
            onClick={() => window.location.href = '/products'}
            counter={stats.totalProducts}
            badge={{
              text: `${stats.optimizedProducts}/${stats.totalProducts} optimisés`,
              variant: 'secondary'
            }}
          />
          <QuickActionCard
            title="Optimiser SEO"
            description="Produits en attente"
            icon={Zap}
            iconColor="text-warning"
            iconBg="bg-warning/10"
            borderColor="border-warning/20"
            hoverBg="hover:bg-warning/5"
            onClick={() => window.location.href = '/seo?tab=optimization'}
            counter={stats.pendingOptimization}
            badge={stats.pendingOptimization > 5 ? {
              text: 'Action requise',
              variant: 'destructive'
            } : undefined}
          />
          <QuickActionCard
            title="Créer Article"
            description="Blog généré par IA"
            icon={FileText}
            iconColor="text-cyan-600"
            iconBg="bg-cyan-500/10"
            borderColor="border-cyan-500/20"
            hoverBg="hover:bg-cyan-500/5"
            onClick={() => window.location.href = '/blog?tab=articles'}
            counter={stats.totalArticles}
            badge={{
              text: 'Nouveau',
              variant: 'default'
            }}
          />
          <QuickActionCard
            title="Assistant IA"
            description="Chat intelligent"
            icon={MessageSquare}
            iconColor="text-purple-600"
            iconBg="bg-purple-500/10"
            borderColor="border-purple-500/20"
            hoverBg="hover:bg-purple-500/5"
            onClick={() => window.location.href = '/chat'}
            badge={{
              text: 'En ligne',
              variant: 'success'
            }}
          />
          <QuickActionCard
            title="Analytics"
            description="Suivez vos performances"
            icon={BarChart3}
            iconColor="text-accent"
            iconBg="bg-accent/10"
            borderColor="border-accent/20"
            hoverBg="hover:bg-accent/5"
            onClick={() => window.location.href = '/products'}
          />
          <QuickActionCard
            title="Connecter Shopify"
            description={stats.connectedStores > 0 ? 'Gérer boutiques' : 'Connecter maintenant'}
            icon={Store}
            iconColor="text-success"
            iconBg="bg-success/10"
            borderColor="border-success/20"
            hoverBg="hover:bg-success/5"
            onClick={() => window.location.href = '/integration'}
            counter={stats.connectedStores}
            badge={stats.connectedStores > 0 ? {
              text: 'Connecté',
              variant: 'success'
            } : {
              text: 'Connecter',
              variant: 'outline'
            }}
          />
          <QuickActionCard
            title="Page d'Accueil"
            description="Mettre à jour SEO"
            icon={Palette}
            iconColor="text-pink-600"
            iconBg="bg-pink-500/10"
            borderColor="border-pink-500/20"
            hoverBg="hover:bg-pink-500/5"
            onClick={() => window.location.href = '/seo?tab=homepage'}
          />
          <QuickActionCard
            title="Campagnes Email"
            description="Bientôt disponible"
            icon={Mail}
            iconColor="text-gray-600"
            iconBg="bg-gray-500/10"
            borderColor="border-gray-500/20"
            hoverBg="hover:bg-gray-500/5"
            onClick={() => {}}
            badge={{
              text: 'Beta',
              variant: 'secondary'
            }}
          />
        </div>
      </div>

      {/* Smart Recommendations Banner */}
      <div className="space-y-4 animate-fade-in" style={{ animationDelay: '300ms' }}>
        {stats.pendingOptimization > 0 && (
          <SmartBanner
            type="optimization"
            title={`${stats.pendingOptimization} produits nécessitent une optimisation SEO`}
            description={`Gain potentiel : +${Math.min(stats.pendingOptimization * 5, 30)} points de score SEO`}
            actionLabel="Optimiser Maintenant"
            onAction={() => window.location.href = '/seo?tab=optimization'}
            count={stats.pendingOptimization}
          />
        )}
        
        {stats.seoScore < 60 && stats.seoScore > 0 && (
          <SmartBanner
            type="low-score"
            title="Votre score SEO peut être amélioré"
            description="Optimisez vos titres, descriptions et images pour un meilleur référencement"
            actionLabel="Voir Recommandations"
            onAction={() => window.location.href = '/seo?tab=optimization'}
          />
        )}

        {stats.seoScore >= 80 && (
          <SmartBanner
            type="success"
            title="Excellent travail ! Votre SEO est au top"
            description="Continuez à maintenir ce niveau de qualité pour votre catalogue"
            actionLabel="Voir Détails"
            onAction={() => window.location.href = '/seo'}
          />
        )}
      </div>

      {/* Recent Activity Timeline */}
      <div className="animate-fade-in" style={{ animationDelay: '400ms' }}>
        <ActivityTimeline activities={recentActivities} />
      </div>
    </div>
  );
}
