import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Users, DollarSign, ShoppingBag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from '@/lib/language';

interface PlanStats {
  plan_id: string;
  plan_name: string;
  user_count: number;
  active_count: number;
  trialing_count: number;
  total_stores: number;
  total_products: number;
  avg_products_per_user: number;
}

interface UserDetail {
  id: string;
  email: string;
  full_name: string;
  subscription_status: string;
  current_plan_id: string;
  created_at: string;
  products_count: number;
  stores_count: number;
  optimizations_count: number;
  articles_count: number;
  max_products: number;
  max_optimizations_monthly: number;
  max_articles_monthly: number;
}

export function AdvancedAnalytics() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [planStats, setPlanStats] = useState<PlanStats[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>("all");
  const [userDetails, setUserDetails] = useState<UserDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [selectedPlan]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Load plan-based analytics with plan limits
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          subscription_status,
          current_plan_id,
          created_at
        `);

      if (profilesError) throw profilesError;

      // Load all subscription plans with their limits
      const { data: allPlans, error: plansError } = await supabase
        .from('subscription_plans')
        .select('id, name, max_products, max_optimizations_monthly, max_articles_monthly')
        .eq('is_active', true);

      if (plansError) throw plansError;

      // Load usage data
      const { data: usage, error: usageError } = await supabase
        .from('usage_tracking')
        .select('*')
        .eq('month', new Date().toISOString().slice(0, 7) + '-01');

      if (usageError) throw usageError;

      // Load stores
      const { data: stores, error: storesError } = await supabase
        .from('shopify_connections')
        .select('user_id')
        .eq('is_active', true);

      if (storesError) throw storesError;

      // Aggregate by plan
      const planMap = new Map<string, PlanStats>();
      
      profiles?.forEach(profile => {
        const planId = profile.current_plan_id || 'no_plan';
        const userUsage = usage?.find(u => u.seller_id === profile.id);
        const userStores = stores?.filter(s => s.user_id === profile.id).length || 0;

        if (!planMap.has(planId)) {
          planMap.set(planId, {
            plan_id: planId,
            plan_name: planId === 'no_plan' ? t.adminComponents.analytics.noPlan : planId,
            user_count: 0,
            active_count: 0,
            trialing_count: 0,
            total_stores: 0,
            total_products: 0,
            avg_products_per_user: 0
          });
        }

        const stats = planMap.get(planId)!;
        stats.user_count++;
        
        if (profile.subscription_status === 'active') stats.active_count++;
        if (profile.subscription_status === 'trialing') stats.trialing_count++;
        
        stats.total_stores += userStores;
        stats.total_products += userUsage?.products_count || 0;
      });

      // Calculate averages
      planMap.forEach(stats => {
        stats.avg_products_per_user = stats.user_count > 0 
          ? Math.round(stats.total_products / stats.user_count) 
          : 0;
      });

      setPlanStats(Array.from(planMap.values()));

      // Load filtered user details
      let filteredProfiles = profiles || [];
      if (selectedPlan !== "all") {
        filteredProfiles = profiles?.filter(p => (p.current_plan_id || 'no_plan') === selectedPlan) || [];
      }

      const enrichedUsers: UserDetail[] = filteredProfiles.map(profile => {
        const userUsage = usage?.find(u => u.seller_id === profile.id);
        const userStores = stores?.filter(s => s.user_id === profile.id).length || 0;
        const userPlan = allPlans?.find(p => p.id === profile.current_plan_id);

        return {
          id: profile.id,
          email: profile.email || '',
          full_name: profile.full_name || '',
          subscription_status: profile.subscription_status || 'inactive',
          current_plan_id: profile.current_plan_id || 'no_plan',
          created_at: profile.created_at || '',
          products_count: userUsage?.products_count || 0,
          stores_count: userStores,
          optimizations_count: userUsage?.optimizations_count || 0,
          articles_count: userUsage?.articles_count || 0,
          max_products: userPlan?.max_products || 0,
          max_optimizations_monthly: userPlan?.max_optimizations_monthly || 0,
          max_articles_monthly: userPlan?.max_articles_monthly || 0,
        };
      });

      setUserDetails(enrichedUsers);

    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: t.common.error,
        description: t.adminComponents.analytics.loadError,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      trialing: "secondary",
      inactive: "destructive",
      canceled: "outline"
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Plan Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            {t.adminComponents.analytics.title}
          </CardTitle>
          <CardDescription>{t.adminComponents.analytics.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {planStats.map((stat) => (
              <Card key={stat.plan_id} className="border-l-4 border-l-primary">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{stat.plan_name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t.adminComponents.analytics.users}</span>
                    <Badge variant="secondary">{stat.user_count}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-success">{t.adminComponents.analytics.active}</span>
                    <Badge className="bg-green-100 text-green-700">{stat.active_count}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-600">{t.adminComponents.analytics.trialing}</span>
                    <Badge className="bg-blue-100 text-blue-700">{stat.trialing_count}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t.adminComponents.analytics.stores}</span>
                    <Badge variant="outline">{stat.total_stores}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t.adminComponents.analytics.products}</span>
                    <Badge variant="outline">{stat.total_products}</Badge>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm font-medium">{t.adminComponents.analytics.avgProductsPerUser}</span>
                    <Badge className="bg-purple-100 text-purple-700">{stat.avg_products_per_user}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* User Details by Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                {t.adminComponents.analytics.clientDetails}
              </CardTitle>
              <CardDescription>{t.adminComponents.analytics.clientDetailsDesc}</CardDescription>
            </div>
            <Select value={selectedPlan} onValueChange={setSelectedPlan}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t.adminComponents.analytics.filterByPlan} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.adminComponents.analytics.allPlans}</SelectItem>
                {planStats.map(plan => (
                  <SelectItem key={plan.plan_id} value={plan.plan_id}>
                    {plan.plan_name} ({plan.user_count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">{t.adminComponents.analytics.email}</th>
                  <th className="text-left p-3">{t.adminComponents.analytics.name}</th>
                  <th className="text-left p-3">{t.adminComponents.analytics.status}</th>
                  <th className="text-left p-3">{t.adminComponents.analytics.plan}</th>
                  <th className="text-right p-3">{t.adminComponents.analytics.stores}</th>
                  <th className="text-right p-3">{t.adminComponents.analytics.productsQuota}</th>
                  <th className="text-right p-3">{t.adminComponents.analytics.optimizationsQuota}</th>
                  <th className="text-right p-3">{t.adminComponents.analytics.articlesQuota}</th>
                </tr>
              </thead>
              <tbody>
                {userDetails.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-muted/50">
                    <td className="p-3 text-sm">{user.email}</td>
                    <td className="p-3 text-sm">{user.full_name || '-'}</td>
                    <td className="p-3">{getStatusBadge(user.subscription_status)}</td>
                    <td className="p-3 text-sm">{user.current_plan_id}</td>
                    <td className="p-3 text-right">
                      <Badge variant="outline">{user.stores_count}</Badge>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline">{user.products_count} / {user.max_products}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {user.max_products > 0 ? Math.round((user.products_count / user.max_products) * 100) : 0}%
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="secondary">{user.optimizations_count} / {user.max_optimizations_monthly}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {user.max_optimizations_monthly > 0 ? Math.round((user.optimizations_count / user.max_optimizations_monthly) * 100) : 0}%
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="secondary">{user.articles_count} / {user.max_articles_monthly}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {user.max_articles_monthly > 0 ? Math.round((user.articles_count / user.max_articles_monthly) * 100) : 0}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
