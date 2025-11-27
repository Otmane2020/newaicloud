import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { RefreshCw, Clock, CheckCircle, AlertCircle, Info } from "lucide-react";
import { useTranslation } from "@/lib/language";

interface SyncSettings {
  auto_sync_enabled: boolean;
  sync_frequency: string;
  last_shopify_sync_at: string | null;
}

export function GoogleShoppingSyncSettings() {
  const { user } = useAuth();
  const { t, language } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [settings, setSettings] = useState<SyncSettings>({
    auto_sync_enabled: false,
    sync_frequency: 'manual',
    last_shopify_sync_at: null,
  });

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("merchant_feed_settings")
        .select("auto_sync_enabled, sync_frequency, last_shopify_sync_at")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setSettings({
          auto_sync_enabled: data.auto_sync_enabled || false,
          sync_frequency: data.sync_frequency || 'manual',
          last_shopify_sync_at: data.last_shopify_sync_at || null,
        });
      }
    } catch (error) {
      console.error("Error loading sync settings:", error);
      toast.error(t.toasts.error.loading);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { error } = await supabase
        .from("merchant_feed_settings")
        .update({
          auto_sync_enabled: settings.auto_sync_enabled,
          sync_frequency: settings.sync_frequency,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success(t.toasts.success.saved);
    } catch (error) {
      console.error("Error saving sync settings:", error);
      toast.error(t.toasts.error.saving);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncNow = async () => {
    if (!user) return;

    try {
      setSyncing(true);
      toast.info(t.googleMerchant.sync.syncing);

      const { error } = await supabase.functions.invoke("sync-shopify-to-feed", {
        body: { user_id: user.id },
      });

      if (error) throw error;

      toast.success(t.toasts.success.synchronized);
      await loadSettings();
    } catch (error) {
      console.error("Error syncing:", error);
      toast.error(t.toasts.error.sync);
    } finally {
      setSyncing(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return t.integration.never;
    return new Date(dateString).toLocaleString(language === 'fr' ? "fr-FR" : "en-US");
  };

  const getStatusBadge = () => {
    if (!settings.last_shopify_sync_at) {
      return (
        <Badge variant="outline" className="border-gray-300">
          <AlertCircle className="w-3 h-3 mr-1" />
          {t.integration.neverSynced}
        </Badge>
      );
    }

    const lastSync = new Date(settings.last_shopify_sync_at);
    const now = new Date();
    const hoursSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);

    if (hoursSinceSync < 24) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          {t.integration.upToDate}
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="border-orange-300 text-orange-700">
          <Clock className="w-3 h-3 mr-1" />
          {t.integration.syncRecommended}
        </Badge>
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Sync Status */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              {t.googleMerchant.sync.title}
            </CardTitle>
            {getStatusBadge()}
          </div>
          <CardDescription>
            {t.googleMerchant.sync.subtitle}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{t.googleMerchant.sync.lastSync}</p>
              <p className="text-lg font-semibold">{formatDate(settings.last_shopify_sync_at)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{t.googleMerchant.sync.frequency}</p>
              <p className="text-lg font-semibold capitalize">
                {settings.sync_frequency === 'manual' ? t.googleMerchant.sync.frequencyOptions.manual :
                 settings.sync_frequency === 'hourly' ? t.googleMerchant.sync.frequencyOptions.hourly :
                 settings.sync_frequency === 'daily' ? t.googleMerchant.sync.frequencyOptions.daily :
                 settings.sync_frequency === 'weekly' ? t.googleMerchant.sync.frequencyOptions.weekly :
                 settings.sync_frequency}
              </p>
            </div>
          </div>

          <Button
            onClick={handleSyncNow}
            disabled={syncing}
            className="w-full"
            size="lg"
          >
            {syncing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                {t.googleMerchant.sync.syncing}
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                {t.googleMerchant.sync.syncNow}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Auto Sync Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t.googleMerchant.sync.autoSyncTitle}</CardTitle>
          <CardDescription>
            {t.googleMerchant.sync.autoSyncSubtitle}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Auto Sync Toggle */}
          <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
            <div className="space-y-1">
              <Label htmlFor="auto_sync" className="text-base">
                {t.googleMerchant.sync.autoSyncEnabled}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t.googleMerchant.sync.autoSyncDescription}
              </p>
            </div>
            <Switch
              id="auto_sync"
              checked={settings.auto_sync_enabled}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, auto_sync_enabled: checked })
              }
            />
          </div>

          {/* Frequency Selector */}
          <div className="space-y-2">
            <Label htmlFor="sync_frequency">{t.googleMerchant.sync.frequencyLabel}</Label>
            <Select
              value={settings.sync_frequency}
              onValueChange={(value) => 
                setSettings({ ...settings, sync_frequency: value })
              }
              disabled={!settings.auto_sync_enabled}
            >
              <SelectTrigger id="sync_frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">{t.googleMerchant.sync.frequencyOptions.manual}</SelectItem>
                <SelectItem value="hourly">{t.googleMerchant.sync.frequencyOptions.hourly}</SelectItem>
                <SelectItem value="daily">{t.googleMerchant.sync.frequencyOptions.daily}</SelectItem>
                <SelectItem value="weekly">{t.googleMerchant.sync.frequencyOptions.weekly}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                {t.common.saving}
              </>
            ) : (
              t.common.save
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Information */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          {t.googleMerchant.sync.howItWorks}
        </AlertDescription>
      </Alert>
    </div>
  );
}
