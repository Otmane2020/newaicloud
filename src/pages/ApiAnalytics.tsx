import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Activity, Clock, AlertCircle } from "lucide-react";
import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";

export default function ApiAnalytics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [recentCalls, setRecentCalls] = useState<any[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Statistiques globales
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      const { data: logs, error } = await supabase
        .from("api_usage_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", sevenDaysAgo)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Calculer les statistiques
      const totalCalls = logs?.length || 0;
      const successCalls = logs?.filter((l) => l.status_code === 200).length || 0;
      const errorCalls = totalCalls - successCalls;
      const avgResponseTime = logs?.length 
        ? Math.round(logs.reduce((sum, l) => sum + (l.response_time_ms || 0), 0) / logs.length)
        : 0;

      // Grouper par endpoint
      const endpointStats = logs?.reduce((acc: any, log) => {
        const endpoint = log.endpoint;
        if (!acc[endpoint]) {
          acc[endpoint] = { count: 0, errors: 0, totalTime: 0 };
        }
        acc[endpoint].count++;
        if (log.status_code !== 200) acc[endpoint].errors++;
        acc[endpoint].totalTime += log.response_time_ms || 0;
        return acc;
      }, {});

      setStats({
        totalCalls,
        successCalls,
        errorCalls,
        avgResponseTime,
        endpointStats: Object.entries(endpointStats || {}).map(([endpoint, data]: [string, any]) => ({
          endpoint,
          ...data,
          avgTime: Math.round(data.totalTime / data.count),
        })),
      });

      setRecentCalls(logs?.slice(0, 20) || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="container mx-auto py-6">Chargement...</div>;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics API</h1>
        <p className="text-muted-foreground">Statistiques d'utilisation des 7 derniers jours</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total d'appels</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCalls || 0}</div>
            <p className="text-xs text-muted-foreground">7 derniers jours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de succès</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalCalls > 0 
                ? Math.round((stats.successCalls / stats.totalCalls) * 100) 
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.successCalls} succès / {stats?.errorCalls} erreurs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Temps de réponse</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.avgResponseTime}ms</div>
            <p className="text-xs text-muted-foreground">Moyenne</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Erreurs</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.errorCalls || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalCalls > 0 
                ? Math.round((stats.errorCalls / stats.totalCalls) * 100) 
                : 0}% du total
            </p>
          </CardContent>
        </Card>
      </div>

      {stats?.endpointStats && stats.endpointStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Statistiques par endpoint</CardTitle>
            <CardDescription>Performance et utilisation de chaque endpoint</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.endpointStats.map((endpoint: any, index: number) => (
                <div key={index} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div className="flex-1">
                    <div className="font-mono text-sm font-semibold">{endpoint.endpoint}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {endpoint.count} appels • {endpoint.avgTime}ms moyen
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {endpoint.errors > 0 && (
                      <Badge variant="destructive">{endpoint.errors} erreurs</Badge>
                    )}
                    <Badge>{Math.round(((endpoint.count - endpoint.errors) / endpoint.count) * 100)}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Appels récents</CardTitle>
          <CardDescription>20 dernières requêtes API</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentCalls.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun appel API enregistré
              </p>
            ) : (
              recentCalls.map((call) => (
                <div key={call.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={call.status_code === 200 ? "default" : "destructive"}>
                        {call.method}
                      </Badge>
                      <span className="font-mono text-sm">{call.endpoint}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {format(new Date(call.created_at), "PPpp", { locale: fr })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={call.status_code === 200 ? "outline" : "destructive"}>
                      {call.status_code}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{call.response_time_ms}ms</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
