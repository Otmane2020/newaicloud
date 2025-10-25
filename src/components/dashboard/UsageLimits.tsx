import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
        chat_responses_count: 0
      };
    },
    enabled: !!user?.id
  });

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('current_plan_id')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const { data: plan } = useQuery({
    queryKey: ['subscription-plan', profile?.current_plan_id],
    queryFn: async () => {
      if (!profile?.current_plan_id) return null;
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', profile.current_plan_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.current_plan_id
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
      label: "Optimisations",
      current: usage?.optimizations_count || 0,
      limit: plan?.max_optimizations_monthly || 0,
      icon: <Zap className="h-4 w-4" />,
      color: "hsl(var(--chart-2))"
    },
    {
      label: "Articles",
      current: usage?.articles_count || 0,
      limit: plan?.max_articles_monthly || 0,
      icon: <FileText className="h-4 w-4" />,
      color: "hsl(var(--chart-3))"
    },
    {
      label: "Chat",
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Limites d'utilisation</CardTitle>
        <CardDescription>
          Votre utilisation ce mois-ci
        </CardDescription>
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
