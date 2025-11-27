import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Wrench, RefreshCw, AlertCircle, Database } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useTranslation } from "@/lib/language";

export function AdminToolbox() {
  const { t, tf } = useTranslation();
  const [loading, setLoading] = useState<string | null>(null);

  const runHealthCheck = async () => {
    setLoading("health");
    try {
      const { data, error } = await supabase.functions.invoke("system-health-check");
      if (error) throw error;
      toast.success(t.toasts.admin.healthCheckSuccess);
    } catch (error: any) {
      toast.error(tf('toasts.admin.healthCheckFailed', { error: error.message }));
    } finally {
      setLoading(null);
    }
  };

  const repairProfiles = async () => {
    setLoading("repair");
    try {
      const { data, error } = await supabase.functions.invoke("admin-repair-profiles");
      if (error) throw error;
      toast.success(data?.message || t.toasts.admin.profilesRepaired);
    } catch (error: any) {
      toast.error(tf('toasts.admin.profileRepairFailed', { error: error.message }));
    } finally {
      setLoading(null);
    }
  };

  const syncStripe = async () => {
    setLoading("stripe");
    try {
      const { data, error } = await supabase.functions.invoke("admin-sync-stripe");
      if (error) throw error;
      toast.success(data?.message || t.toasts.admin.stripeSynced);
    } catch (error: any) {
      toast.error(tf('toasts.admin.stripeSyncFailed', { error: error.message }));
    } finally {
      setLoading(null);
    }
  };

  const cleanupOrphans = async () => {
    setLoading("cleanup");
    try {
      const { data, error } = await supabase.rpc("cleanup_orphaned_data");
      if (error) throw error;
      toast.success(t.toasts.admin.orphansCleaned);
    } catch (error: any) {
      toast.error(tf('toasts.admin.cleanupFailed', { error: error.message }));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              {t.common.systemTools}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={runHealthCheck}
              className="w-full"
              disabled={loading === "health"}
            >
              <RefreshCw className={`mr-2 w-4 h-4 ${loading === "health" ? "animate-spin" : ""}`} />
              {t.systemStatus.runHealthCheck}
            </Button>

            <Button
              onClick={cleanupOrphans}
              variant="outline"
              className="w-full"
              disabled={loading === "cleanup"}
            >
              <Database className={`mr-2 w-4 h-4 ${loading === "cleanup" ? "animate-spin" : ""}`} />
              {t.common.cleanupData}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {t.common.userManagement}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={repairProfiles}
              className="w-full"
              disabled={loading === "repair"}
            >
              <AlertCircle className={`mr-2 w-4 h-4 ${loading === "repair" ? "animate-spin" : ""}`} />
              {t.common.repairProfiles}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              {t.common.integrations}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={syncStripe}
              className="w-full"
              disabled={loading === "stripe"}
            >
              <RefreshCw className={`mr-2 w-4 h-4 ${loading === "stripe" ? "animate-spin" : ""}`} />
              {t.common.syncStripe}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
