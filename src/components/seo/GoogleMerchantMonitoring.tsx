import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/lib/language";

interface SyncHistory {
  id: string;
  sync_type: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  products_synced: number;
  products_failed: number;
  error_message: string | null;
}

interface Stats {
  total_syncs: number;
  successful_syncs: number;
  failed_syncs: number;
  success_rate: number;
  avg_duration: number;
  total_products_synced: number;
}

export function GoogleMerchantMonitoring() {
  const { t } = useTranslation();
  const [history, setHistory] = useState<SyncHistory[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<string>("7");

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(period));

      // Use type assertion to bypass type checking for new table
      const { data, error } = await (supabase as any)
        .from("google_merchant_sync_history")
        .select("*")
        .eq("user_id", user.id)
        .gte("started_at", daysAgo.toISOString())
        .order("started_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      setHistory((data || []) as SyncHistory[]);
      calculateStats((data || []) as SyncHistory[]);
    } catch (error) {
      console.error("Error loading sync history:", error);
      toast.error(t.googleMerchant.monitoring.errorLoading);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: SyncHistory[]) => {
    const total = data.length;
    const successful = data.filter((s) => s.status === "completed").length;
    const failed = data.filter((s) => s.status === "failed").length;
    const successRate = total > 0 ? (successful / total) * 100 : 0;

    const completedSyncs = data.filter((s) => s.duration_ms !== null);
    const avgDuration = completedSyncs.length > 0
      ? completedSyncs.reduce((sum, s) => sum + (s.duration_ms || 0), 0) / completedSyncs.length
      : 0;

    const totalProductsSynced = data.reduce((sum, s) => sum + (s.products_synced || 0), 0);

    setStats({
      total_syncs: total,
      successful_syncs: successful,
      failed_syncs: failed,
      success_rate: successRate,
      avg_duration: avgDuration,
      total_products_synced: totalProductsSynced,
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any; label: string }> = {
      completed: { variant: "default", icon: CheckCircle2, label: t.googleMerchant.monitoring.status.completed },
      failed: { variant: "destructive", icon: XCircle, label: t.googleMerchant.monitoring.status.failed },
      running: { variant: "secondary", icon: RefreshCw, label: t.googleMerchant.monitoring.status.running },
      pending: { variant: "outline", icon: Clock, label: t.googleMerchant.monitoring.status.pending },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return "-";
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Préparer les données pour les graphiques
  const chartData = history
    .slice(0, 20)
    .reverse()
    .map((sync) => ({
      date: new Date(sync.started_at).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
      }),
      [t.googleMerchant.monitoring.charts.duration]: sync.duration_ms ? Math.round(sync.duration_ms / 1000) : 0,
      [t.googleMerchant.monitoring.charts.products]: sync.products_synced,
      [t.googleMerchant.monitoring.charts.success]: sync.status === "completed" ? 1 : 0,
    }));

  const statusData = [
    { name: t.googleMerchant.monitoring.charts.success, value: stats?.successful_syncs || 0, color: "#22c55e" },
    { name: t.googleMerchant.monitoring.status.failed, value: stats?.failed_syncs || 0, color: "#ef4444" },
  ];

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec période */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {t.googleMerchant.monitoring.title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t.googleMerchant.monitoring.subtitle}
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">{t.googleMerchant.monitoring.periods.last7days}</SelectItem>
            <SelectItem value="30">{t.googleMerchant.monitoring.periods.last30days}</SelectItem>
            <SelectItem value="90">{t.googleMerchant.monitoring.periods.last90days}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Statistiques principales */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t.googleMerchant.monitoring.stats.totalSyncs}</span>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{stats.total_syncs}</div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t.googleMerchant.monitoring.stats.successRate}</span>
                {stats.success_rate >= 90 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
              </div>
              <div className="text-2xl font-bold">
                {stats.success_rate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.successful_syncs} {t.googleMerchant.monitoring.stats.successful} / {stats.failed_syncs} {t.googleMerchant.monitoring.stats.failed}
              </p>
            </div>
          </Card>

          <Card className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t.googleMerchant.monitoring.stats.avgDuration}</span>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">
                {formatDuration(stats.avg_duration)}
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t.googleMerchant.monitoring.stats.productsSynced}</span>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
              <div className="text-2xl font-bold">{stats.total_products_synced}</div>
            </div>
          </Card>
        </div>
      )}

      {/* Graphiques */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Graphique de durée */}
        <Card className="p-6">
          <h4 className="text-sm font-semibold mb-4">{t.googleMerchant.monitoring.charts.syncDuration}</h4>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey={t.googleMerchant.monitoring.charts.duration}
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Graphique de produits */}
        <Card className="p-6">
          <h4 className="text-sm font-semibold mb-4">{t.googleMerchant.monitoring.charts.productsSync}</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              <Bar dataKey={t.googleMerchant.monitoring.charts.products} fill="#22c55e" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Répartition succès/échecs */}
        <Card className="p-6">
          <h4 className="text-sm font-semibold mb-4">{t.googleMerchant.monitoring.charts.statusDistribution}</h4>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Taux de succès dans le temps */}
        <Card className="p-6">
          <h4 className="text-sm font-semibold mb-4">{t.googleMerchant.monitoring.charts.successRate}</h4>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} domain={[0, 1]} />
              <Tooltip formatter={(value: any) => `${(value * 100).toFixed(0)}%`} />
              <Legend />
              <Line
                type="stepAfter"
                dataKey={t.googleMerchant.monitoring.charts.success}
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Historique détaillé */}
      <Card className="p-6">
        <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {t.googleMerchant.monitoring.history.title}
        </h4>
        <div className="space-y-3">
          {history.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {t.googleMerchant.monitoring.noSyncs}
            </p>
          ) : (
            history.map((sync) => (
              <div
                key={sync.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-3">
                    {getStatusBadge(sync.status)}
                    <span className="text-sm font-medium capitalize">
                      {t.googleMerchant.monitoring.history.sync} {sync.sync_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(sync.started_at)}
                    </span>
                    {sync.duration_ms && (
                      <span>{t.googleMerchant.monitoring.history.duration}: {formatDuration(sync.duration_ms)}</span>
                    )}
                    <span className="text-green-600">
                      {sync.products_synced} {t.googleMerchant.monitoring.history.productsSynced}
                    </span>
                    {sync.products_failed > 0 && (
                      <span className="text-red-600">
                        {sync.products_failed} {t.googleMerchant.monitoring.history.failures}
                      </span>
                    )}
                  </div>
                  {sync.error_message && (
                    <p className="text-xs text-red-600 mt-1">{sync.error_message}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
