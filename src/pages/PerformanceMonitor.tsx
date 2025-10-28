import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { Activity, TrendingUp, Zap } from "lucide-react";

interface MetricSummary {
  name: string;
  avg: number;
  min: number;
  max: number;
  count: number;
}

export default function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<MetricSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadMetrics();
    }
  }, [user]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("performance_metrics")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      if (data && data.length > 0) {
        // Calculer les moyennes par opération
        const grouped = data.reduce((acc: Record<string, number[]>, m: any) => {
          const key = `${m.function_name}.${m.operation}`;
          if (!acc[key]) acc[key] = [];
          acc[key].push(m.duration_ms);
          return acc;
        }, {});

        const chartData = Object.entries(grouped).map(([name, durations]) => ({
          name,
          avg: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
          min: Math.min(...durations),
          max: Math.max(...durations),
          count: durations.length,
        }));

        setMetrics(chartData.sort((a, b) => b.avg - a.avg));
      }
    } catch (error) {
      console.error("Error loading metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalOperations = metrics.reduce((sum, m) => sum + m.count, 0);
  const avgResponseTime = metrics.length > 0 
    ? Math.round(metrics.reduce((sum, m) => sum + m.avg, 0) / metrics.length)
    : 0;

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Chargement des métriques...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="flex items-center gap-3 mb-8">
        <Activity className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold">Monitoring de Performance</h1>
      </div>

      {metrics.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            Aucune métrique disponible. Utilisez le chat pour générer des données.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Statistiques globales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Opérations Totales</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalOperations}</div>
                <p className="text-xs text-muted-foreground">
                  Dernières 500 mesures
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Temps Moyen</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgResponseTime}ms</div>
                <p className="text-xs text-muted-foreground">
                  Toutes opérations confondues
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Opérations Suivies</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.length}</div>
                <p className="text-xs text-muted-foreground">
                  Types d'opérations uniques
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Graphique */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Temps de réponse par opération</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={metrics}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={120}
                    className="text-xs"
                  />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="avg" name="Moyenne (ms)" fill="hsl(var(--primary))" />
                  <Bar dataKey="max" name="Maximum (ms)" fill="hsl(var(--destructive))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Détails par opération */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.map((m) => (
              <Card key={m.name}>
                <CardHeader>
                  <CardTitle className="text-sm truncate" title={m.name}>
                    {m.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <div className="text-2xl font-bold text-primary">{m.avg}ms</div>
                      <div className="text-xs text-muted-foreground">Moyenne</div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <div>
                        <div className="font-semibold">{m.min}ms</div>
                        <div className="text-xs text-muted-foreground">Min</div>
                      </div>
                      <div>
                        <div className="font-semibold">{m.max}ms</div>
                        <div className="text-xs text-muted-foreground">Max</div>
                      </div>
                      <div>
                        <div className="font-semibold">{m.count}</div>
                        <div className="text-xs text-muted-foreground">Mesures</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
