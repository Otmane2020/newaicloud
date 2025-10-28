import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Package, FileText, Zap, MessageSquare } from "lucide-react";

interface UsageLimit {
  label: string;
  current: number;
  limit: number;
  icon: React.ReactNode;
  color: string;
}

export function UsageLimits() {
  const { user } = useAuth();

  const { data: usage } = useQuery({
    queryKey: ['usage-tracking', user?.id],
    queryFn: async () => {
      const currentMonth = new Date().toISOString().substring(0, 7) + '-01';
      const { data, error } = await supabase
        .from('usage_tracking')
        .select('*')
        .eq('seller_id', user?.id)
        .eq('month', currentMonth)
        .maybeSingle();

      if (error) throw error;
      return data || {
        products_count: 0,
        optimizations_count: 0,
        articles_count: 0,
        chat_responses_count: 0,
        campaigns_count: 0,
        shopify_requests_count: 0,
        shopify_stores_count: 0
      };
    },
    enabled: !!user?.id
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
      label: "Produits",
      current: usage?.products_count || 0,
      limit: plan?.max_products || 0,
      icon: <Package className="h-4 w-4" />,
      color: "hsl(var(--primary))"
    },
    {
      label: "Boutiques Shopify",
      current: usage?.shopify_stores_count || 0,
      limit: plan?.max_shopify_stores || 0,
      icon: <Package className="h-4 w-4" />,
      color: "hsl(var(--chart-6))"
    },
    {
      label: "Optimisations SEO",
      current: usage?.optimizations_count || 0,
      limit: plan?.max_optimizations_monthly || 0,
      icon: <Zap className="h-4 w-4" />,
      color: "hsl(var(--chart-2))"
    },
    {
      label: "Articles IA",
      current: usage?.articles_count || 0,
      limit: plan?.max_articles_monthly || 0,
      icon: <FileText className="h-4 w-4" />,
      color: "hsl(var(--chart-3))"
    },
    {
      label: "Campagnes auto",
      current: usage?.campaigns_count || 0,
      limit: plan?.max_campaigns || 0,
      icon: <Zap className="h-4 w-4" />,
      color: "hsl(var(--chart-5))"
    },
    {
      label: "Recherche IA Shopify",
      current: usage?.shopify_requests_count || 0,
      limit: plan?.max_shopify_requests_monthly || 0,
      icon: <Package className="h-4 w-4" />,
      color: "hsl(var(--chart-1))"
    },
    {
      label: "Réponses Chat IA",
      current: usage?.chat_responses_count || 0,
      limit: plan?.max_chat_responses_monthly || 0,
      icon: <MessageSquare className="h-4 w-4" />,
      color: "hsl(var(--chart-4))"
    }
  ];

  const getPercentage = (current: number, limit: number) => {
    if (limit === 0) return 0;
    return Math.min((current / limit) * 100, 100);
  };

  const optimizationsLeft = (plan?.max_optimizations_monthly || 0) - (usage?.optimizations_count || 0);
  const isTrialPlan = profile?.subscription_status !== 'active';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <div>
            <CardTitle>Limites d'utilisation</CardTitle>
            <CardDescription>
              Votre utilisation ce mois-ci
            </CardDescription>
          </div>
          {plan && (
            <div className="text-right">
              <Badge variant="outline" className="text-base font-semibold mb-1">
                {plan.name}
              </Badge>
              {!isTrialPlan && (
                <p className="text-sm text-muted-foreground">
                  {optimizationsLeft} optimisations restantes
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
                {item.current} / {item.limit === 0 ? '∞' : item.limit}
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
