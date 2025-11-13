import { useState, useEffect, useMemo } from "react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  TrendingUp,
  TrendingDown,
  Users,
  MousePointer,
  BarChart3,
  RefreshCw,
  Calendar,
  AlertCircle,
  Settings,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { GSCArticleOpportunities } from "./GSCArticleOpportunities";
import { useTranslation } from "@/lib/language";

type DateRange = "7" | "30" | "90";

interface SearchConsoleData {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface TopPage {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface TopQuery {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

type AlertSeverity = "critical" | "high" | "medium" | "low";

interface GSCAlert {
  id: string;
  user_id: string;
  domain: string;
  metric_name: string;
  change_percentage: number;
  previous_value: number;
  current_value: number;
  severity: AlertSeverity;
  detection_date: string;
  is_read: boolean;
  is_resolved: boolean;
  resolved_at: string | null;
}

interface GSCSyncConfig {
  user_id: string;
  auto_sync_enabled: boolean;
  notification_enabled: boolean;
  last_sync_at: string | null;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
}

const MetricCard = ({ title, value, change, icon, trend = "neutral" }: MetricCardProps) => {
  const getTrendColor = () => {
    if (trend === "up") return "text-green-600 dark:text-emerald-400";
    if (trend === "down") return "text-red-600 dark:text-rose-400";
    return "text-muted-foreground";
  };

  const getTrendIcon = () => {
    if (trend === "up") return <TrendingUp className="h-4 w-4" />;
    if (trend === "down") return <TrendingDown className="h-4 w-4" />;
    return null;
  };

  return (
    <Card className="relative overflow-hidden border border-border/60 bg-gradient-to-b from-background via-background to-muted/40 p-6">
      <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle_at_0_0,#3b82f633,transparent_55%),radial-gradient(circle_at_100%_0,#6366f166,transparent_55%)]" />
      <div className="relative flex items-center justify-between mb-4">
        <div className="rounded-xl bg-primary/10 p-2.5 shadow-sm ring-1 ring-primary/10">{icon}</div>
        <div
          className={`flex items-center gap-1 rounded-full bg-background/70 px-2.5 py-1 text-xs font-medium shadow-sm ring-1 ring-border/60 ${getTrendColor()}`}
        >
          {getTrendIcon()}
          <span>
            {change > 0 ? "+" : ""}
            {change}%
          </span>
        </div>
      </div>
      <div className="relative space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
      </div>
    </Card>
  );
};

interface AlertsPanelProps {
  alerts: GSCAlert[];
  t: any;
  onMarkRead: (id: string) => Promise<void>;
  onResolve: (id: string) => Promise<void>;
}

const AlertsPanel = ({ alerts, t, onMarkRead, onResolve }: AlertsPanelProps) => {
  if (!alerts.length) return null;

  return (
    <Card className="border-orange-200 bg-gradient-to-r from-orange-50/80 via-amber-50/80 to-orange-50/80 p-6 dark:border-amber-500/40 dark:from-amber-900/30 dark:via-amber-950/40 dark:to-zinc-950">
      <div className="flex items-start gap-4">
        <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-orange-700 shadow-sm ring-2 ring-orange-200 dark:bg-amber-900/60 dark:text-amber-300 dark:ring-amber-500/40">
          <AlertCircle className="h-5 w-5" />
        </div>
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-orange-950 dark:text-amber-100">
              {t.googleConsole.insightsData.alerts} ({alerts.length})
            </h3>
            <Badge
              variant="outline"
              className="border-orange-300/80 bg-white/70 text-[11px] uppercase tracking-wide text-orange-700 dark:border-amber-500/40 dark:bg-amber-950/60 dark:text-amber-200"
            >
              SEO anomalies
            </Badge>
          </div>

          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start justify-between gap-4 rounded-lg border border-orange-200/80 bg-white/80 p-3 shadow-xs backdrop-blur-sm dark:border-amber-700/60 dark:bg-amber-950/70"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        alert.severity === "critical"
                          ? "destructive"
                          : alert.severity === "high"
                            ? "default"
                            : "secondary"
                      }
                      className={
                        alert.severity === "critical"
                          ? "bg-red-600 text-white"
                          : alert.severity === "high"
                            ? "bg-orange-500 text-white"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-900/80 dark:text-amber-100"
                      }
                    >
                      {alert.severity === "critical"
                        ? t.googleConsole.insightsData.severity.critical
                        : alert.severity === "high"
                          ? t.googleConsole.insightsData.severity.high
                          : alert.severity === "medium"
                            ? t.googleConsole.insightsData.severity.medium
                            : t.googleConsole.insightsData.severity.low}
                    </Badge>
                    <span className="text-xs font-medium text-muted-foreground">
                      {new Date(alert.detection_date).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm font-medium">{alert.metric_name}</p>
                  <p className="text-sm text-muted-foreground">
                    Baisse de {Math.abs(alert.change_percentage).toFixed(1)}% ({alert.previous_value.toLocaleString()} →{" "}
                    {alert.current_value.toLocaleString()})
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {!alert.is_read && (
                    <Button size="sm" variant="ghost" className="text-xs" onClick={() => onMarkRead(alert.id)}>
                      {t.googleConsole.insightsData.markRead}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => onResolve(alert.id)}>
                    {t.googleConsole.insightsData.resolve}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

interface DateSelectorProps {
  dateRange: DateRange;
  setDateRange: (value: DateRange) => void;
  analyzingAnomalies: boolean;
  onAnalyzeAnomalies: () => void;
  showSettings: boolean;
  setShowSettings: (value: boolean) => void;
  t: any;
}

const DateSelector = ({
  dateRange,
  setDateRange,
  analyzingAnomalies,
  onAnalyzeAnomalies,
  showSettings,
  setShowSettings,
  t,
}: DateSelectorProps) => {
  return (
    <Card className="border border-border/60 bg-gradient-to-b from-background via-background to-muted/40 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20">
            <Calendar className="h-4 w-4" />
          </div>
          <div className="space-y-0.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t.googleConsole.insightsData.period}
            </Label>
            <p className="text-xs text-muted-foreground">{t.googleConsole.insightsData.charts.clicksImpressions}</p>
          </div>
          <Select value={dateRange} onValueChange={(v: DateRange) => setDateRange(v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">{t.googleConsole.insightsData.days7}</SelectItem>
              <SelectItem value="30">{t.googleConsole.insightsData.days30}</SelectItem>
              <SelectItem value="90">{t.googleConsole.insightsData.days90}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={onAnalyzeAnomalies}
            disabled={analyzingAnomalies}
            className="gap-2"
          >
            {analyzingAnomalies ? <RefreshCw className="h-4 w-4 animate-spin" /> : <AlertCircle className="h-4 w-4" />}
            {t.googleConsole.insightsData.analyzeAnomalies}
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
          className="gap-2 self-start md:self-auto"
        >
          <Settings className="h-4 w-4" />
          {t.googleConsole.insightsData.settings}
        </Button>
      </div>
    </Card>
  );
};

interface SettingsPanelProps {
  syncConfig: GSCSyncConfig | null;
  language: string;
  t: any;
  updateSyncConfig: (field: keyof GSCSyncConfig, value: boolean) => Promise<void>;
}

const SettingsPanel = ({ syncConfig, language, t, updateSyncConfig }: SettingsPanelProps) => {
  return (
    <div className="mt-4 space-y-4 rounded-xl border border-dashed border-border/70 bg-muted/40 p-4">
      <h4 className="text-sm font-semibold">{t.googleConsole.insightsData.syncSettings.title}</h4>

      <div className="flex items-center justify-between gap-4 rounded-lg bg-background/80 p-3">
        <div className="space-y-0.5">
          <Label className="text-sm">{t.googleConsole.insightsData.syncSettings.autoSync}</Label>
          <p className="text-xs text-muted-foreground">{t.googleConsole.insightsData.syncSettings.autoSyncDesc}</p>
        </div>
        <Switch
          checked={syncConfig?.auto_sync_enabled ?? true}
          onCheckedChange={(checked) => updateSyncConfig("auto_sync_enabled", checked)}
        />
      </div>

      <div className="flex items-center justify-between gap-4 rounded-lg bg-background/80 p-3">
        <div className="space-y-0.5">
          <Label className="text-sm">{t.googleConsole.insightsData.syncSettings.notifications}</Label>
          <p className="text-xs text-muted-foreground">{t.googleConsole.insightsData.syncSettings.notificationsDesc}</p>
        </div>
        <Switch
          checked={syncConfig?.notification_enabled ?? true}
          onCheckedChange={(checked) => updateSyncConfig("notification_enabled", checked)}
        />
      </div>

      {syncConfig?.last_sync_at && (
        <div className="text-xs text-muted-foreground">
          {t.googleConsole.insightsData.syncSettings.lastSync} :{" "}
          {new Date(syncConfig.last_sync_at).toLocaleString(language === "fr" ? "fr-FR" : "en-US")}
        </div>
      )}
    </div>
  );
};

interface ChartsSectionProps {
  data: SearchConsoleData[];
  t: any;
  language: string;
}

const ChartsSection = ({ data, t, language }: ChartsSectionProps) => {
  if (!data.length) return null;

  return (
    <>
      <Card className="border border-border/60 bg-background p-6">
        <h3 className="mb-4 text-lg font-semibold">{t.googleConsole.insightsData.charts.clicksImpressions}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area
              type="monotone"
              dataKey="clicks"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.6}
              name={t.googleConsole.insightsData.tables.clicks}
            />
            <Area
              type="monotone"
              dataKey="impressions"
              stroke="hsl(var(--chart-2))"
              fill="hsl(var(--chart-2))"
              fillOpacity={0.5}
              name={t.googleConsole.insightsData.tables.impressions}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <Card className="border border-border/60 bg-background p-6">
        <h3 className="mb-4 text-lg font-semibold">
          {t.googleConsole.insightsData.charts.position} {language === "fr" ? "et" : "and"}{" "}
          {t.googleConsole.insightsData.charts.ctr}
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <defs>
              <linearGradient id="colorPosition" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorCTR" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="date" style={{ fontSize: "12px" }} />
            <YAxis yAxisId="left" style={{ fontSize: "12px" }} />
            <YAxis yAxisId="right" orientation="right" style={{ fontSize: "12px" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
              }}
            />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="position"
              stroke="hsl(var(--chart-3))"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, strokeWidth: 2 }}
              name="Position"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="ctr"
              stroke="hsl(var(--chart-4))"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, strokeWidth: 2 }}
              name={t.googleConsole.insightsData.tables.ctr}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </>
  );
};

interface TopTablesSectionProps {
  topPages: TopPage[];
  topQueries: TopQuery[];
  t: any;
}

const TopTablesSection = ({ topPages, topQueries, t }: TopTablesSectionProps) => {
  if (!topPages.length && !topQueries.length) return null;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="border border-border/60 bg-background p-6">
        <h3 className="mb-4 text-lg font-semibold">{t.googleConsole.insightsData.tables.topPages}</h3>
        {topPages.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.googleConsole.insightsData.tables.page}</TableHead>
                <TableHead className="text-right">{t.googleConsole.insightsData.tables.clicks}</TableHead>
                <TableHead className="text-right">{t.googleConsole.insightsData.tables.impressions}</TableHead>
                <TableHead className="text-right">{t.googleConsole.insightsData.tables.ctr}</TableHead>
                <TableHead className="text-right">{t.googleConsole.insightsData.tables.position}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topPages.map((page, index) => (
                <TableRow key={index}>
                  <TableCell className="max-w-xs truncate font-medium" title={page.page}>
                    {page.page.replace(/^https?:\/\//, "").replace(/^[^/]+/, "") || "/"}
                  </TableCell>
                  <TableCell className="text-right">{page.clicks}</TableCell>
                  <TableCell className="text-right">{page.impressions}</TableCell>
                  <TableCell className="text-right">{page.ctr.toFixed(1)}%</TableCell>
                  <TableCell className="text-right">{page.position.toFixed(1)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">{t.googleConsole.insightsData.noData}</p>
        )}
      </Card>

      <Card className="border border-border/60 bg-background p-6">
        <h3 className="mb-4 text-lg font-semibold">{t.googleConsole.insightsData.tables.topQueries}</h3>
        {topQueries.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.googleConsole.insightsData.tables.query}</TableHead>
                <TableHead className="text-right">{t.googleConsole.insightsData.tables.clicks}</TableHead>
                <TableHead className="text-right">{t.googleConsole.insightsData.tables.impressions}</TableHead>
                <TableHead className="text-right">{t.googleConsole.insightsData.tables.ctr}</TableHead>
                <TableHead className="text-right">{t.googleConsole.insightsData.tables.position}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topQueries.map((query, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{query.query}</TableCell>
                  <TableCell className="text-right">{query.clicks}</TableCell>
                  <TableCell className="text-right">{query.impressions}</TableCell>
                  <TableCell className="text-right">{query.ctr.toFixed(1)}%</TableCell>
                  <TableCell className="text-right">{query.position.toFixed(1)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">{t.googleConsole.insightsData.noData}</p>
        )}
      </Card>
    </div>
  );
};

interface GoogleSearchConsoleInsightsProps {
  selectedDomain: string;
}

export function GoogleSearchConsoleInsights({ selectedDomain }: GoogleSearchConsoleInsightsProps) {
  const [dateRange, setDateRange] = useState<DateRange>("30");
  const [data, setData] = useState<SearchConsoleData[]>([]);
  const [topPages, setTopPages] = useState<TopPage[]>([]);
  const [topQueries, setTopQueries] = useState<TopQuery[]>([]);
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState<GSCAlert[]>([]);
  const [syncConfig, setSyncConfig] = useState<GSCSyncConfig | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [analyzingAnomalies, setAnalyzingAnomalies] = useState(false);
  const { t, language } = useTranslation();

  // Load main data when domain or dateRange changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (selectedDomain) {
        loadSearchConsoleData();
      } else {
        setData([]);
        setTopPages([]);
        setTopQueries([]);
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDomain, dateRange]);

  // Load alerts when domain changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (selectedDomain) {
        loadAlerts();
      } else {
        setAlerts([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDomain]);

  // Load sync config on mount
  useEffect(() => {
    loadSyncConfig();
  }, []);

  const loadSearchConsoleData = async () => {
    if (!selectedDomain) return;

    try {
      setLoading(true);

      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) {
        setLoading(false);
        return;
      }

      const { data: fnData, error } = await supabase.functions.invoke("get-search-console-data", {
        body: {
          domain: selectedDomain,
          days: parseInt(dateRange, 10),
        },
      });

      if (error) throw error;
      if (fnData?.error) throw new Error(fnData.error);
      if (!fnData?.data) throw new Error("Aucune donnée reçue");

      const formattedData: SearchConsoleData[] = fnData.data.map((item: SearchConsoleData) => ({
        date: new Date(item.date).toLocaleDateString("fr-FR", {
          month: "short",
          day: "numeric",
        }),
        clicks: item.clicks,
        impressions: item.impressions,
        ctr: parseFloat(item.ctr.toString()),
        position: parseFloat(item.position.toString()),
      }));

      setData(formattedData);
      setTopPages(fnData.topPages || []);
      setTopQueries(fnData.topQueries || []);
      toast.success(t.googleConsole.insightsData.success);
    } catch (error: any) {
      console.error("Error loading Search Console data:", error);
      toast.error(error?.message || t.googleConsole.insightsData.error);
      setData([]);
      setTopPages([]);
      setTopQueries([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAlerts = async () => {
    try {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) return;

      const { data: rows, error } = await supabase
        .from("gsc_alerts")
        .select("*")
        .eq("user_id", userRes.user.id)
        .eq("domain", selectedDomain)
        .eq("is_resolved", false)
        .order("detection_date", { ascending: false })
        .limit(10);

      if (error) throw error;
      setAlerts((rows || []) as GSCAlert[]);
    } catch (error) {
      console.error("Error loading alerts:", error);
    }
  };

  const loadSyncConfig = async () => {
    try {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) return;

      const { data: row, error } = await supabase
        .from("gsc_sync_config")
        .select("*")
        .eq("user_id", userRes.user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      setSyncConfig((row || null) as GSCSyncConfig | null);
    } catch (error) {
      console.error("Error loading sync config:", error);
    }
  };

  const analyzeAnomalies = async () => {
    if (!selectedDomain) return;

    try {
      setAnalyzingAnomalies(true);

      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) {
        setAnalyzingAnomalies(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("analyze-gsc-anomalies", {
        body: { domain: selectedDomain, days: parseInt(dateRange, 10) },
      });

      if (error) throw error;

      if (data?.summary?.total_alerts > 0) {
        toast.success(`${data.summary.total_alerts} ${t.googleConsole.insightsData.alerts}`);
        await loadAlerts();
      } else {
        toast.success(t.googleConsole.insightsData.noData);
      }
    } catch (error: any) {
      console.error("Error analyzing anomalies:", error);
      toast.error(t.googleConsole.insightsData.error);
    } finally {
      setAnalyzingAnomalies(false);
    }
  };

  const updateSyncConfig = async (field: keyof GSCSyncConfig, value: boolean) => {
    try {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) return;

      const { error } = await supabase.from("gsc_sync_config").upsert({
        user_id: userRes.user.id,
        [field]: value,
      });

      if (error) throw error;

      setSyncConfig((prev) => ({
        ...(prev || {
          user_id: userRes.user.id,
          auto_sync_enabled: true,
          notification_enabled: true,
          last_sync_at: null,
        }),
        [field]: value,
      }));
      toast.success(t.googleConsole.insightsData.syncSettings.updated);
    } catch (error) {
      console.error("Error updating sync config:", error);
      toast.error(t.googleConsole.insightsData.syncSettings.updateError);
    }
  };

  const markAlertAsRead = async (alertId: string) => {
    try {
      const { error } = await supabase.from("gsc_alerts").update({ is_read: true }).eq("id", alertId);

      if (error) throw error;
      await loadAlerts();
    } catch (error) {
      console.error("Error marking alert as read:", error);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from("gsc_alerts")
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", alertId);

      if (error) throw error;
      toast.success(t.googleConsole.insightsData.alertResolved);
      await loadAlerts();
    } catch (error) {
      console.error("Error resolving alert:", error);
      toast.error(t.googleConsole.insightsData.syncSettings.updateError);
    }
  };

  const metrics = useMemo(() => {
    if (data.length === 0) return null;
    if (data.length === 1) {
      const only = data[0];
      return {
        totalClicks: only.clicks,
        totalImpressions: only.impressions,
        avgCTR: only.ctr.toFixed(2),
        avgPosition: only.position.toFixed(1),
        clicksChange: 0,
        impressionsChange: 0,
        ctrChange: 0,
        positionChange: 0,
      };
    }

    const totalClicks = data.reduce((sum, d) => sum + d.clicks, 0);
    const totalImpressions = data.reduce((sum, d) => sum + d.impressions, 0);
    const avgCTR = data.reduce((sum, d) => sum + d.ctr, 0) / data.length;
    const avgPosition = data.reduce((sum, d) => sum + d.position, 0) / data.length;

    const halfLength = Math.floor(data.length / 2) || 1;
    const recentData = data.slice(halfLength);
    const oldData = data.slice(0, halfLength);

    const sumClicks = (arr: SearchConsoleData[]) => arr.reduce((sum, d) => sum + d.clicks, 0);
    const sumImpressions = (arr: SearchConsoleData[]) => arr.reduce((sum, d) => sum + d.impressions, 0);
    const avgCtrArr = (arr: SearchConsoleData[]) =>
      arr.length ? arr.reduce((sum, d) => sum + d.ctr, 0) / arr.length : 0;
    const avgPosArr = (arr: SearchConsoleData[]) =>
      arr.length ? arr.reduce((sum, d) => sum + d.position, 0) / arr.length : 0;

    const recentClicks = sumClicks(recentData);
    const oldClicks = sumClicks(oldData);
    const clicksChange = oldClicks > 0 ? ((recentClicks - oldClicks) / oldClicks) * 100 : 0;

    const recentImpressions = sumImpressions(recentData);
    const oldImpressions = sumImpressions(oldData);
    const impressionsChange = oldImpressions > 0 ? ((recentImpressions - oldImpressions) / oldImpressions) * 100 : 0;

    const recentCTR = avgCtrArr(recentData);
    const oldCTR = avgCtrArr(oldData);
    const ctrChange = oldCTR > 0 ? ((recentCTR - oldCTR) / oldCTR) * 100 : 0;

    const recentPosition = avgPosArr(recentData);
    const oldPosition = avgPosArr(oldData);
    const positionChange = oldPosition > 0 ? ((oldPosition - recentPosition) / oldPosition) * 100 : 0;

    return {
      totalClicks,
      totalImpressions,
      avgCTR: avgCTR.toFixed(2),
      avgPosition: avgPosition.toFixed(1),
      clicksChange: Math.round(clicksChange),
      impressionsChange: Math.round(impressionsChange),
      ctrChange: Math.round(ctrChange),
      positionChange: Math.round(positionChange),
    };
  }, [data]);

  const hasData = data.length > 0;

  return (
    <div className="space-y-6">
      <AlertsPanel alerts={alerts} t={t} onMarkRead={markAlertAsRead} onResolve={resolveAlert} />

      <div className="space-y-2">
        <DateSelector
          dateRange={dateRange}
          setDateRange={setDateRange}
          analyzingAnomalies={analyzingAnomalies}
          onAnalyzeAnomalies={analyzeAnomalies}
          showSettings={showSettings}
          setShowSettings={setShowSettings}
          t={t}
        />
        {showSettings && (
          <SettingsPanel syncConfig={syncConfig} language={language} t={t} updateSyncConfig={updateSyncConfig} />
        )}
      </div>

      {metrics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title={t.googleConsole.insightsData.metrics.totalClicks}
            value={metrics.totalClicks.toLocaleString()}
            change={metrics.clicksChange}
            icon={<MousePointer className="h-5 w-5 text-primary" />}
            trend={metrics.clicksChange > 0 ? "up" : metrics.clicksChange < 0 ? "down" : "neutral"}
          />
          <MetricCard
            title={t.googleConsole.insightsData.metrics.totalImpressions}
            value={metrics.totalImpressions.toLocaleString()}
            change={metrics.impressionsChange}
            icon={<Users className="h-5 w-5 text-primary" />}
            trend={metrics.impressionsChange > 0 ? "up" : metrics.impressionsChange < 0 ? "down" : "neutral"}
          />
          <MetricCard
            title={t.googleConsole.insightsData.metrics.avgCtr}
            value={`${metrics.avgCTR}%`}
            change={metrics.ctrChange}
            icon={<BarChart3 className="h-5 w-5 text-primary" />}
            trend={metrics.ctrChange > 0 ? "up" : metrics.ctrChange < 0 ? "down" : "neutral"}
          />
          <MetricCard
            title={t.googleConsole.insightsData.metrics.avgPosition}
            value={metrics.avgPosition}
            change={metrics.positionChange}
            icon={<TrendingUp className="h-5 w-5 text-primary" />}
            trend={metrics.positionChange > 0 ? "up" : metrics.positionChange < 0 ? "down" : "neutral"}
          />
        </div>
      )}

      {loading && (
        <Card className="border border-border/60 bg-background p-8">
          <div className="flex flex-col items-center justify-center gap-4">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Chargement des données de Google Search Console...</p>
          </div>
        </Card>
      )}

      {!loading && hasData && <ChartsSection data={data} t={t} language={language} />}

      {!loading && (topPages.length > 0 || topQueries.length > 0) && (
        <TopTablesSection topPages={topPages} topQueries={topQueries} t={t} />
      )}

      {!loading && !hasData && (
        <Card className="border border-dashed border-border/70 bg-muted/40 p-8">
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-background text-primary shadow-sm ring-1 ring-border">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">{t.googleConsole.insightsData.noData}</h3>
              <p className="text-sm text-muted-foreground">
                {language === "fr"
                  ? "Les données Google Search Console n'ont pas encore été synchronisées pour ce domaine."
                  : "Google Search Console data has not yet been synced for this domain."}
              </p>
            </div>
            <Button onClick={loadSearchConsoleData} className="gap-2">
              <RefreshCw className="h-5 w-5" />
              Charger les données depuis Google Search Console
            </Button>
          </div>
        </Card>
      )}

      {!loading && topQueries.length > 0 && (
        <GSCArticleOpportunities selectedDomain={selectedDomain} topQueries={topQueries} />
      )}
    </div>
  );
}
