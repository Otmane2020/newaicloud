import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Activity, Timer, Zap, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/language";

interface Insight {
  totalActions: number;
  lastLogin: string | null;
  monthlyActions: number;
  weeklyActions: number;
  favoriteFeature: string | null;
  churnScore: number;
}

interface UserInsightPanelProps {
  userId?: string;
}

export function UserInsightPanel({ userId }: UserInsightPanelProps) {
  const { t } = useTranslation();
  const [insight, setInsight] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadInsights();
    } else {
      setLoading(false);
      setInsight(null);
    }
  }, [userId]);

  const loadInsights = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-insights", {
        body: { userId },
      });

      if (error) throw error;
      setInsight(data);
    } catch (error) {
      console.error("Error loading insights:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        {t.common.loading}
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Please select a user to view insights
      </div>
    );
  }

  if (!insight) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No insight data available
      </div>
    );
  }

  const getChurnBadgeVariant = (score: number) => {
    if (score < 30) return "default";
    if (score < 70) return "secondary";
    return "destructive";
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Total Activity</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-bold flex items-center gap-2">
          <Activity className="w-6 h-6 text-primary" />
          {insight.totalActions.toLocaleString()}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Last Login</CardTitle>
        </CardHeader>
        <CardContent className="text-lg">
          {insight.lastLogin ? (
            <div className="flex items-center gap-2">
              <Timer className="w-5 h-5 text-muted-foreground" />
              {new Date(insight.lastLogin).toLocaleString()}
            </div>
          ) : (
            <span className="text-muted-foreground">Never</span>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Favorite Feature</CardTitle>
        </CardHeader>
        <CardContent className="text-lg flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          {insight.favoriteFeature || (
            <span className="text-muted-foreground">No data</span>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Weekly Actions</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-bold">
          {insight.weeklyActions}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Monthly Actions</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-bold">
          {insight.monthlyActions}
        </CardContent>
      </Card>

      <Card className="md:col-span-2 lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingDown className="w-5 h-5" />
            Churn Risk Score
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Badge
            variant={getChurnBadgeVariant(insight.churnScore)}
            className="text-xl px-4 py-2"
          >
            {insight.churnScore} / 100
          </Badge>
          <p className="text-sm text-muted-foreground">
            {insight.churnScore < 30 && "Low risk - User is highly engaged"}
            {insight.churnScore >= 30 && insight.churnScore < 70 && "Medium risk - Monitor activity"}
            {insight.churnScore >= 70 && "High risk - Intervention recommended"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
