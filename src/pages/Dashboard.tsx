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
import { ReferralSystem } from '@/components/dashboard/ReferralSystem';
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
    seoCategories: {
      homepage: 0,
      products: 0,
      collections: 0,
      content: 0,
      images: 0,
      technical: 0
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
        .select('id, price, seo_title, seo_description')
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

      setStats({
        totalProducts,
        optimizedProducts,
        pendingOptimization: totalProducts - optimizedProducts,
        totalArticles: articlesCount || 0,
        totalValue,
        seoScore,
        seoCategories,
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
          <div className="flex gap-3">
            <button
              onClick={() => window.location.href = '/seo?tab=audit-dashboard'}
              className="px-6 py-3 bg-white/90 backdrop-blur-md hover:bg-white text-primary font-bold rounded-xl shadow-lg hover:scale-105 transition-transform inline-flex items-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Lancer l'Audit SEO
            </button>
            {stats.pendingOptimization > 0 && (
              <button
                onClick={() => window.location.href = '/seo?tab=products'}
                className="px-6 py-3 bg-accent/90 backdrop-blur-md hover:bg-accent text-white font-bold rounded-xl shadow-lg hover:scale-105 transition-transform inline-flex items-center gap-2"
              >
                <Zap className="w-5 h-5" />
                Optimiser {stats.pendingOptimization} produits
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
                <div className="font-bold text-foreground">Optimiser Produits</div>
                <div className="text-sm text-muted-foreground">
                  {stats.optimizedProducts}/{stats.totalProducts} optimisés
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
                <div className="font-bold text-foreground">Créer Articles</div>
                <div className="text-sm text-muted-foreground">
                  {stats.totalArticles} articles publiés
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
                  {stats.connectedStores > 0 ? 'Gérer Boutiques' : 'Connecter Shopify'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {stats.connectedStores > 0 ? `${stats.connectedStores} boutique(s)` : 'Importer produits'}
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Métriques Clés - Focus sur l'Optimisation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
        <MetricCard
          title="Produits Optimisés IA"
          value={stats.optimizedProducts}
          icon={Sparkles}
          gradient="from-success to-success"
          iconBg="bg-success/10 text-success"
          badge={stats.totalProducts > 0 ? `${Math.round((stats.optimizedProducts / stats.totalProducts) * 100)}%` : '0%'}
          subtitle={`${stats.optimizedProducts}/${stats.totalProducts} produits`}
        />
        <MetricCard
          title="À Optimiser"
          value={stats.pendingOptimization}
          icon={Clock}
          gradient="from-warning to-warning"
          iconBg="bg-warning/10 text-warning"
          badge={stats.pendingOptimization > 10 ? 'Action requise' : 'Bon'}
          subtitle="Produits sans SEO"
        />
        <MetricCard
          title="Score SEO Global"
          value={`${stats.seoScore}/100`}
          icon={Target}
          gradient="from-primary via-accent to-success"
          iconBg="bg-gradient-to-br from-primary/10 to-success/10 text-primary"
          subtitle={stats.seoScore >= 80 ? 'Excellent' : stats.seoScore >= 60 ? 'Bon' : 'À améliorer'}
        />
        <MetricCard
          title="Articles Publiés"
          value={stats.totalArticles}
          icon={FileText}
          gradient="from-cyan-500 to-cyan-600"
          iconBg="bg-cyan-500/10 text-cyan-600"
          subtitle="Contenu SEO"
        />
        <MetricCard
          title="Valeur Optimisée"
          value={formatCurrency(stats.totalValue * (stats.optimizedProducts / Math.max(stats.totalProducts, 1)))}
          icon={DollarSign}
          gradient="from-purple-500 to-purple-600"
          iconBg="bg-purple-500/10 text-purple-600"
          subtitle={`${Math.round((stats.optimizedProducts / Math.max(stats.totalProducts, 1)) * 100)}% du catalogue`}
        />
        <MetricCard
          title="Boutiques Actives"
          value={stats.connectedStores}
          icon={Store}
          gradient="from-primary to-primary-dark"
          iconBg="bg-primary/10 text-primary"
          subtitle={stats.connectedStores > 0 ? 'Synchronisées' : 'Non connecté'}
        />
      </div>

      {/* Referral System */}
      <div className="animate-fade-in" style={{ animationDelay: '150ms' }}>
        <ReferralSystem />
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
