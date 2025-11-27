import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw, Calendar, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslation } from "@/lib/language";

interface SyncSettings {
  id?: string;
  auto_sync_enabled: boolean;
  sync_frequency: string;
  last_sync_at: string | null;
  next_sync_at: string | null;
  sync_errors_count: number;
  last_error: string | null;
}

export function GoogleMerchantSyncSettings() {
  const { t, language } = useTranslation();
  const [settings, setSettings] = useState<SyncSettings>({
    auto_sync_enabled: false,
    sync_frequency: "daily",
    last_sync_at: null,
    next_sync_at: null,
    sync_errors_count: 0,
    last_error: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("google_merchant_sync_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      toast.error(t.toasts.error.loading);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("google_merchant_sync_settings")
        .upsert({
          user_id: user.id,
          auto_sync_enabled: settings.auto_sync_enabled,
          sync_frequency: settings.sync_frequency,
        });

      if (error) throw error;

      toast.success(t.toasts.success.saved);
      loadSettings();
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error(t.toasts.error.saving);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return t.integration.never;
    return new Date(date).toLocaleString(language === 'fr' ? "fr-FR" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

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
      <Card className="p-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">{t.googleMerchant.sync.autoSyncTitle}</h3>
            <p className="text-sm text-muted-foreground">
              {t.googleMerchant.sync.autoSyncSubtitle}
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-sync">{t.googleMerchant.sync.autoSyncEnabled}</Label>
                <p className="text-sm text-muted-foreground">
                  {t.googleMerchant.sync.autoSyncDescription}
                </p>
              </div>
              <Switch
                id="auto-sync"
                checked={settings.auto_sync_enabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, auto_sync_enabled: checked })
                }
              />
            </div>

            {settings.auto_sync_enabled && (
              <div className="space-y-2">
                <Label htmlFor="frequency">{t.googleMerchant.sync.frequencyLabel}</Label>
                <Select
                  value={settings.sync_frequency}
                  onValueChange={(value) =>
                    setSettings({ ...settings, sync_frequency: value })
                  }
                >
                  <SelectTrigger id="frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">{t.googleMerchant.sync.frequencyOptions.daily}</SelectItem>
                    <SelectItem value="weekly">{t.googleMerchant.sync.frequencyOptions.weekly}</SelectItem>
                    <SelectItem value="monthly">{t.integration.monthly}</SelectItem>
                    <SelectItem value="manual">{t.googleMerchant.sync.frequencyOptions.manual}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              onClick={saveSettings}
              disabled={saving}
              className="w-full"
            >
              {saving ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  {t.common.saving}
                </>
              ) : (
                t.common.save
              )}
            </Button>
          </div>
        </div>
      </Card>

      {settings.id && (
        <Card className="p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t.googleMerchant.sync.title}
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{t.googleMerchant.sync.lastSync}</p>
                <p className="text-sm font-medium">{formatDate(settings.last_sync_at)}</p>
              </div>

              {settings.auto_sync_enabled && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{t.integration.sync.nextSync.title}</p>
                  <p className="text-sm font-medium">{formatDate(settings.next_sync_at)}</p>
                </div>
              )}
            </div>

            {settings.last_error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-semibold">
                      {t.toasts.error.sync}
                    </p>
                    <p className="text-sm">{settings.last_error}</p>
                    <p className="text-xs">
                      {t.integration.sync.status.consecutiveErrors}: {settings.sync_errors_count}
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {!settings.last_error && settings.last_sync_at && (
              <Alert>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  {t.integration.sync.status.syncSuccess}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
