import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Wrench, RefreshCw, AlertCircle, Database, Mail } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useTranslation } from "@/lib/language";

export function AdminToolbox() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<string | null>(null);

  const runHealthCheck = async () => {
    setLoading("health");
    try {
      const { data, error } = await supabase.functions.invoke("system-health-check");
      if (error) throw error;
      toast.success("Health Check completed successfully");
    } catch (error: any) {
      toast.error(`Health Check failed: ${error.message}`);
    } finally {
      setLoading(null);
    }
  };

  const repairProfiles = async () => {
    setLoading("repair");
    try {
      const { data, error } = await supabase.functions.invoke("admin-repair-profiles");
      if (error) throw error;
      toast.success(data?.message || "Profiles repaired successfully");
    } catch (error: any) {
      toast.error(`Profile repair failed: ${error.message}`);
    } finally {
      setLoading(null);
    }
  };

  const syncStripe = async () => {
    setLoading("stripe");
    try {
      const { data, error } = await supabase.functions.invoke("admin-sync-stripe");
      if (error) throw error;
      toast.success(data?.message || "Stripe synchronized successfully");
    } catch (error: any) {
      toast.error(`Stripe sync failed: ${error.message}`);
    } finally {
      setLoading(null);
    }
  };

  const cleanupOrphans = async () => {
    setLoading("cleanup");
    try {
      const { data, error } = await supabase.rpc("cleanup_orphaned_data");
      if (error) throw error;
      toast.success("Orphaned data cleaned up successfully");
    } catch (error: any) {
      toast.error(`Cleanup failed: ${error.message}`);
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
              System Tools
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={runHealthCheck}
              className="w-full"
              disabled={loading === "health"}
            >
              <RefreshCw className={`mr-2 w-4 h-4 ${loading === "health" ? "animate-spin" : ""}`} />
              Run Health Check
            </Button>

            <Button
              onClick={cleanupOrphans}
              variant="outline"
              className="w-full"
              disabled={loading === "cleanup"}
            >
              <Database className={`mr-2 w-4 h-4 ${loading === "cleanup" ? "animate-spin" : ""}`} />
              Cleanup Orphaned Data
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              User Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={repairProfiles}
              className="w-full"
              disabled={loading === "repair"}
            >
              <AlertCircle className={`mr-2 w-4 h-4 ${loading === "repair" ? "animate-spin" : ""}`} />
              Repair Profiles
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Integrations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={syncStripe}
              className="w-full"
              disabled={loading === "stripe"}
            >
              <RefreshCw className={`mr-2 w-4 h-4 ${loading === "stripe" ? "animate-spin" : ""}`} />
              Sync Stripe
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
