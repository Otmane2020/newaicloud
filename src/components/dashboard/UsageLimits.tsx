import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useStore } from "@/contexts/StoreContext";
import { Package, FileText, Sparkles, MessageSquare, Image } from "lucide-react";
import { formatLimit } from "@/lib/formatUtils";
import { useTranslation } from "@/lib/language";

interface UsageLimit {
  label: string;
  current: number;
  limit: number;
  icon: React.ReactNode;
  color: string;
}

export function UsageLimits() {
  const { user } = useAuth();
  const { t, language } = useTranslation();
  const { selectedStore } = useStore();

  // Fetch real usage data from actual tables
  const { data: realUsage } = useQuery({
    queryKey: ['real-usage-stats', user?.id, selectedStore?.id],
    queryFn: async () => {
      if (!user?.id || !selectedStore?.id) return null;

      // Count products with enrichment_status = 'enriched'
      const { count: productsOptimized } = await supabase
        .from('shopify_products')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', selectedStore.id)
        .eq('enrichment_status', 'enriched');

      // Count total products
      const { count: productsTotal } = await supabase
        .from('shopify_products')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', selectedStore.id);

      // Count collections with optimization_count > 0
      const { count: collectionsOptimized } = await supabase
        .from('shopify_collections')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', selectedStore.id)
        .gt('optimization_count', 0);

      // Count total collections
      const { count: collectionsTotal } = await supabase
        .from('shopify_collections')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', selectedStore.id);

      // Count articles
      const { count: articlesCount } = await supabase
        .from('blog_articles')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', selectedStore.id);

      // Count stores
      const { count: storesCount } = await supabase
        .from('shopify_connections')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_active', true);

      return {
        products_optimized: productsOptimized || 0,
        products_total: productsTotal || 0,
        collections_optimized: collectionsOptimized || 0,
        collections_total: collectionsTotal || 0,
        articles_count: articlesCount || 0,
        stores_count: storesCount || 0
      };
    },
    enabled: !!user?.id && !!selectedStore?.id
  });

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('current_plan_id, subscription_status')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const { data: plan } = useQuery({
    queryKey: ['subscription-plan', profile?.current_plan_id, profile?.subscription_status],
    queryFn: async () => {
      // Si pas de plan ou en trial, utiliser le plan trial
      const planId = profile?.subscription_status === 'active' 
        ? (profile?.current_plan_id || 'starter') 
        : 'trial';
      
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!profile
  });

  const limits: UsageLimit[] = [
    {
      label: String(t.dashboard?.usage?.labels?.products || 'Products'),
      current: realUsage?.products_optimized || 0,
      limit: realUsage?.products_total || 0,
      icon: <Package className="h-4 w-4" />,
      color: "hsl(var(--primary))"
    },
    {
      label: String(t.dashboard?.usage?.labels?.stores || 'Stores'),
      current: realUsage?.stores_count || 0,
      limit: plan?.max_shopify_stores || 1,
      icon: <Package className="h-4 w-4" />,
      color: "hsl(var(--chart-6))"
    },
    {
      label: language === 'fr' ? 'Collections optimisées' : 'Collections Optimized',
      current: realUsage?.collections_optimized || 0,
      limit: realUsage?.collections_total || 0,
      icon: <Sparkles className="h-4 w-4" />,
      color: "hsl(var(--chart-2))"
    },
    {
      label: String(t.dashboard?.usage?.labels?.articles || 'Articles'),
      current: realUsage?.articles_count || 0,
      limit: plan?.max_articles_monthly || 0,
      icon: <FileText className="h-4 w-4" />,
      color: "hsl(var(--chart-3))"
    }
  ];

  const getPercentage = (current: number, limit: number) => {
    if (limit === 0) return 0;
    return Math.min((current / limit) * 100, 100);
  };

  const optimizationsLeft = (realUsage?.products_total || 0) - (realUsage?.products_optimized || 0);
  const isTrialPlan = profile?.subscription_status !== 'active';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <div>
            <CardTitle>{String(t.dashboard?.usage?.title || 'Usage')}</CardTitle>
            <CardDescription>
              {String(t.dashboard?.usage?.description || 'Your usage statistics')}
            </CardDescription>
          </div>
          {plan && (
            <div className="text-right">
              <Badge variant="outline" className="text-base font-semibold mb-1">
                {String(plan.name || 'Plan')}
              </Badge>
              {!isTrialPlan && (
                <p className="text-sm text-muted-foreground">
                  {String(optimizationsLeft)} {String(t.dashboard?.usage?.remaining || 'remaining')}
                </p>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {limits.map((item) => (
          <div key={item.label} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div style={{ color: item.color }}>
                  {item.icon}
                </div>
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {item.current.toLocaleString('fr-FR')} / {formatLimit(item.limit)}
              </span>
            </div>
            <Progress 
              value={getPercentage(item.current, item.limit)} 
              className="h-2"
              style={{
                // @ts-ignore
                '--progress-background': item.color
              }}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
