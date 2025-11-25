import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, AlertCircle, Activity, RefreshCw, ChevronDown, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/language";

interface FunctionStatus {
  name: string;
  status: "healthy" | "unhealthy";
  ms: number; // Backend field
  code?: number; // Backend field
  error?: string;
  ts: string; // Backend timestamp field
}

interface HealthCheckResults {
  [category: string]: FunctionStatus[];
}

interface HealthCheckSummary {
  totalFunctions: number;
  healthyCount: number;
  unhealthyCount: number;
  avgResponseTimeMs: number;
  status: "operational" | "degraded" | "major_outage";
}

export function SystemStatusDashboard() {
  const { toast } = useToast();
  const { t } = useTranslation();

  const [results, setResults] = useState<HealthCheckResults>({});
  const [summary, setSummary] = useState<HealthCheckSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  useEffect(() => {
    loadLastHealthCheck();
  }, []);

  /* 🔥 Load last DB saved check */
  const loadLastHealthCheck = async () => {
    try {
      const { data, error } = await supabase
        .from("system_health_checks")
        .select("*")
        .order("checked_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setResults(data.results || {});
        setSummary({
          totalFunctions: data.total_functions,
          healthyCount: data.healthy_count,
          unhealthyCount: data.unhealthy_count,
          avgResponseTimeMs: data.avg_response_time_ms,
          status:
            data.unhealthy_count === 0
              ? "operational"
              : data.unhealthy_count < data.total_functions * 0.1
                ? "degraded"
                : "major_outage",
        });
        setLastChecked(data.checked_at);
      }
    } catch (error) {
      console.error("Error loading health check:", error);
    }
  };

  /* 🔥 Trigger new check */
  const runHealthCheck = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("system-health-check", {
        body: {},
      });

      if (error) throw error;

      setResults(data.results);
      setSummary(data.summary);
      setLastChecked(data.timestamp);

      toast({
        title: t.systemStatus.healthCheckComplete,
        description: `${data.summary.healthyCount}/${data.summary.totalFunctions} ${t.systemStatus.functionsOperational}`,
        variant: data.summary.unhealthyCount === 0 ? "default" : "destructive",
      });
    } catch (error) {
      console.error("Error running health check:", error);
      toast({
        title: t.toasts.error.generic,
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const allHealthy = summary?.unhealthyCount === 0;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div
        className={cn(
          "rounded-lg p-6 border-2 transition-colors",
          !summary
            ? "bg-muted/30 border-border"
            : allHealthy
              ? "bg-green-950/30 border-green-500"
              : summary.status === "degraded"
                ? "bg-orange-950/30 border-orange-500"
                : "bg-red-950/30 border-red-500",
        )}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {!summary ? (
              <Activity className="w-8 h-8 text-muted-foreground" />
            ) : allHealthy ? (
              <CheckCircle className="w-8 h-8 text-green-500" />
            ) : summary.status === "degraded" ? (
              <AlertCircle className="w-8 h-8 text-orange-500" />
            ) : (
              <XCircle className="w-8 h-8 text-red-500" />
            )}

            <div>
              <h2 className="text-2xl font-bold">
                {!summary
                  ? t.systemStatus.noDataYet
                  : allHealthy
                    ? t.systemStatus.fullyOperational
                    : summary.status === "degraded"
                      ? t.systemStatus.someServicesDegraded
                      : t.systemStatus.majorOutage}
              </h2>
              <p className="text-muted-foreground mt-1">
                {!summary
                  ? t.systemStatus.runFirstCheck
                  : allHealthy
                    ? t.systemStatus.noIssues
                    : `${summary.unhealthyCount} ${t.systemStatus.functionIssues}`}
              </p>
            </div>
          </div>

          <Button onClick={runHealthCheck} disabled={loading} variant="outline" className="gap-2">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            {t.systemStatus.runHealthCheck}
          </Button>
        </div>

        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-background/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-500">{summary.healthyCount}</div>
              <div className="text-xs text-muted-foreground">{t.systemStatus.healthy}</div>
            </div>

            <div className="bg-background/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-red-500">{summary.unhealthyCount}</div>
              <div className="text-xs text-muted-foreground">{t.systemStatus.unhealthy}</div>
            </div>

            <div className="bg-background/50 rounded-lg p-3">
              <div className="text-2xl font-bold">{summary.avgResponseTimeMs}ms</div>
              <div className="text-xs text-muted-foreground">{t.systemStatus.avgResponseTime}</div>
            </div>

            <div className="bg-background/50 rounded-lg p-3">
              <div className="text-2xl font-bold">{summary.totalFunctions}</div>
              <div className="text-xs text-muted-foreground">{t.systemStatus.totalFunctions}</div>
            </div>
          </div>
        )}

        {lastChecked && (
          <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            {t.systemStatus.lastChecked}: {new Date(lastChecked).toLocaleString()}
          </div>
        )}
      </div>

      {/* DÉTAILS PAR CATÉGORIE */}
      <Card>
        <CardHeader>
          <CardTitle>{t.systemStatus.detailedStatus}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-2">
          {Object.keys(results).length === 0 ? (
            <p className="text-muted-foreground text-center py-8">{t.systemStatus.noResultsYet}</p>
          ) : (
            Object.entries(results).map(([category, functions]) => {
              const allCategoryHealthy = functions.every((f) => f.status === "healthy");
              const unhealthyCount = functions.filter((f) => f.status === "unhealthy").length;

              return (
                <Collapsible key={category}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-accent rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                      {allCategoryHealthy ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}

                      <span className="font-medium">{category}</span>

                      {!allCategoryHealthy && (
                        <Badge variant="destructive">
                          {unhealthyCount} {t.systemStatus.issues}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {functions.length} {t.systemStatus.components}
                      </span>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="px-4 pb-2">
                    <div className="space-y-2 mt-2">
                      {functions.map((func) => (
                        <div
                          key={func.name}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg border",
                            func.status === "healthy"
                              ? "bg-green-950/20 border-green-500/30"
                              : "bg-red-950/20 border-red-500/30",
                          )}
                        >
                          <div className="flex items-center gap-3">
                            {func.status === "healthy" ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-500" />
                            )}
                            <code className="text-sm">{func.name}</code>
                          </div>

                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-muted-foreground">{func.ms}ms</span>

                            {func.code && (
                              <Badge variant={func.status === "healthy" ? "default" : "destructive"}>{func.code}</Badge>
                            )}

                            {func.error && <span className="text-red-500 text-xs max-w-xs truncate">{func.error}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
