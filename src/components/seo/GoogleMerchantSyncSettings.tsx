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
      toast.error("Impossible de charger les paramètres de synchronisation");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const dataToSave = {
        user_id: user.id,
        auto_sync_enabled: settings.auto_sync_enabled,
        sync_frequency: settings.sync_frequency,
      };

      if (settings.id) {
        const { error } = await supabase
          .from("google_merchant_sync_settings")
          .update(dataToSave)
          .eq("id", settings.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("google_merchant_sync_settings")
          .insert([dataToSave])
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setSettings({ ...settings, id: data.id });
        }
      }

      toast.success("Paramètres de synchronisation sauvegardés");
      loadSettings();
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Impossible de sauvegarder les paramètres");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return "Jamais";
    return new Date(date).toLocaleString("fr-FR", {
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
            <h3 className="text-lg font-semibold">Synchronisation Automatique</h3>
            <p className="text-sm text-muted-foreground">
              Configurez la synchronisation automatique de vos flux Google Merchant
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-sync">Activer la synchronisation automatique</Label>
                <p className="text-sm text-muted-foreground">
                  Les flux seront mis à jour automatiquement selon la fréquence choisie
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
                <Label htmlFor="frequency">Fréquence de synchronisation</Label>
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
                    <SelectItem value="daily">Quotidienne</SelectItem>
                    <SelectItem value="weekly">Hebdomadaire</SelectItem>
                    <SelectItem value="monthly">Mensuelle</SelectItem>
                    <SelectItem value="manual">Manuelle uniquement</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  La synchronisation s'effectuera automatiquement selon la fréquence choisie
                </p>
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
                  Sauvegarde...
                </>
              ) : (
                "Enregistrer les paramètres"
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
              Statut de la synchronisation
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Dernière synchronisation</p>
                <p className="text-sm font-medium">{formatDate(settings.last_sync_at)}</p>
              </div>

              {settings.auto_sync_enabled && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Prochaine synchronisation</p>
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
                      Erreur lors de la dernière synchronisation
                    </p>
                    <p className="text-sm">{settings.last_error}</p>
                    <p className="text-xs">
                      Nombre d'erreurs consécutives: {settings.sync_errors_count}
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {!settings.last_error && settings.last_sync_at && (
              <Alert>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  La dernière synchronisation s'est terminée avec succès
                </AlertDescription>
              </Alert>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
