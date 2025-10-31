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

interface SyncSettings {
  auto_sync_enabled: boolean;
  sync_frequency: string;
  last_shopify_sync_at: string | null;
}

export function GoogleShoppingSyncSettings() {
  const { user } = useAuth();
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
      toast.error("Erreur lors du chargement des paramètres de synchronisation");
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

      toast.success("Paramètres de synchronisation sauvegardés !");
    } catch (error) {
      console.error("Error saving sync settings:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setLoading(false);
    }
  };

  const handleSyncNow = async () => {
    if (!user) return;

    try {
      setSyncing(true);
      toast.info("Synchronisation en cours...");

      const { data, error } = await supabase.functions.invoke('sync-shopify-to-feed', {
        body: { userId: user.id }
      });

      if (error) throw error;

      toast.success(`Synchronisation terminée: ${data.productsUpdated} produits mis à jour`);
      await loadSettings();
    } catch (error) {
      console.error("Error syncing:", error);
      toast.error("Erreur lors de la synchronisation");
    } finally {
      setSyncing(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Jamais";
    return new Date(dateString).toLocaleString("fr-FR");
  };

  const getStatusBadge = () => {
    if (!settings.last_shopify_sync_at) {
      return (
        <Badge variant="outline" className="border-gray-300">
          <AlertCircle className="w-3 h-3 mr-1" />
          Jamais synchronisé
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
          À jour
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="border-orange-300 text-orange-700">
          <Clock className="w-3 h-3 mr-1" />
          Synchronisation recommandée
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
              Statut de Synchronisation
            </CardTitle>
            {getStatusBadge()}
          </div>
          <CardDescription>
            Synchronisez vos produits depuis Shopify vers le flux Google Shopping
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Dernière synchronisation</p>
              <p className="text-lg font-semibold">{formatDate(settings.last_shopify_sync_at)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Fréquence</p>
              <p className="text-lg font-semibold capitalize">{settings.sync_frequency}</p>
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
                Synchronisation en cours...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Synchroniser maintenant
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Auto Sync Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Paramètres de Synchronisation Automatique</CardTitle>
          <CardDescription>
            Configurez la synchronisation automatique depuis votre boutique Shopify
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Auto Sync Toggle */}
          <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
            <div className="space-y-1">
              <Label htmlFor="auto_sync" className="text-base">
                Synchronisation automatique
              </Label>
              <p className="text-sm text-muted-foreground">
                Synchroniser automatiquement les modifications depuis Shopify
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
            <Label htmlFor="sync_frequency">Fréquence de synchronisation</Label>
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
                <SelectItem value="manual">Manuelle</SelectItem>
                <SelectItem value="hourly">Toutes les heures</SelectItem>
                <SelectItem value="daily">Quotidienne</SelectItem>
                <SelectItem value="weekly">Hebdomadaire</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {settings.auto_sync_enabled 
                ? "Le flux sera mis à jour automatiquement selon la fréquence sélectionnée"
                : "Activez la synchronisation automatique pour planifier des mises à jour régulières"
              }
            </p>
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
                Enregistrement...
              </>
            ) : (
              "Sauvegarder les paramètres"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Information */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Comment ça marche :</strong> La synchronisation automatique récupère les mises à jour 
          de vos produits depuis Shopify (prix, stock, descriptions) et met à jour votre flux Google Shopping. 
          Les modifications sont détectées automatiquement selon la fréquence choisie.
        </AlertDescription>
      </Alert>
    </div>
  );
}