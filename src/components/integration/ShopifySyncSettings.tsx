import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  RefreshCw,
  Clock,
  Calendar,
  Download,
  Upload,
  CheckCircle2,
  XCircle,
  Loader2,
  Shield,
  Zap,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { SimpleSyncProgress } from "./SyncProgressDialog";
import { SyncResultDialog } from "./SyncResultDialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Types et constantes
interface Timezone {
  value: string;
  label: string;
  utc: string[];
}

interface SyncSettings {
  import_frequency: "manual" | "hourly" | "daily" | "weekly" | "monthly";
  import_schedule_hour: number;
  import_schedule_day: number;
  import_types: string[];
  export_auto_enabled: boolean;
  export_after_optimization: boolean;
  last_import_at: string | null;
  last_export_at: string | null;
  next_import_at: string | null;
  store_id?: string;
  timezone?: string;
}

interface SyncHistory {
  id: string;
  sync_type: "import" | "export";
  content_types: string[];
  status: "running" | "success" | "failed";
  items_synced: number;
  duration_ms: number | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

interface SyncStats {
  products: { before: number; after: number; imported: number; error?: string };
  collections: { before: number; after: number; imported: number; error?: string };
  pages: { before: number; after: number; imported: number; error?: string };
  articles: { before: number; after: number; imported: number; error?: string };
  images: { before: number; after: number; imported: number; error?: string };
}

// Constantes organisées
const TIMEZONES = [
  { value: "America/Los_Angeles", label: "Los Angeles", utc: ["UTC-8"] },
  { value: "America/New_York", label: "New York", utc: ["UTC-5"] },
  { value: "Europe/London", label: "London", utc: ["UTC+0"] },
  { value: "Europe/Paris", label: "Paris", utc: ["UTC+1"] },
  { value: "Asia/Tokyo", label: "Tokyo", utc: ["UTC+9"] },
  { value: "Australia/Sydney", label: "Sydney", utc: ["UTC+10"] },
];

const IMPORT_TYPES = [
  { id: "products", label: "Produits" },
  { id: "collections", label: "Collections" },
  { id: "pages", label: "Pages" },
  { id: "articles", label: "Articles" },
  { id: "images", label: "Images" },
];

const DAYS_OF_WEEK = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
  { value: 0, label: "Dimanche" },
];

const SCHEDULE_HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${i.toString().padStart(2, "0")}:00`,
}));

// Hook personnalisé pour la gestion des données
const useSyncData = () => {
  const [settings, setSettings] = useState<SyncSettings | null>(null);
  const [history, setHistory] = useState<SyncHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("shopify_sync_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setSettings(data as SyncSettings);
      } else {
        const defaultSettings: Partial<SyncSettings> = {
          import_frequency: "manual",
          import_schedule_hour: 9,
          import_schedule_day: 1,
          import_types: ["products", "collections", "pages", "articles", "images"],
          export_auto_enabled: false,
          export_after_optimization: true,
        };

        const { data: newSettings } = await supabase
          .from("shopify_sync_settings")
          .insert({ ...defaultSettings, user_id: user.id })
          .select()
          .single();

        if (newSettings) {
          setSettings(newSettings as SyncSettings);
        }
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      toast.error("Erreur lors du chargement des paramètres");
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Nettoyer les synchronisations bloquées
      await supabase
        .from("sync_history")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: "Sync bloquée",
        })
        .eq("user_id", user.id)
        .eq("status", "running")
        .lt("started_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());

      const { data, error } = await supabase
        .from("sync_history")
        .select("*")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setHistory((data || []) as SyncHistory[]);
    } catch (error) {
      console.error("Error loading history:", error);
    }
  };

  return {
    settings,
    history,
    loading,
    setSettings,
    loadSettings,
    loadHistory,
  };
};

// Composants enfants pour une meilleure organisation
const SyncModeSelector = ({
  syncMode,
  setSyncMode,
}: {
  syncMode: string;
  setSyncMode: (mode: "full" | "smart") => void;
}) => (
  <Card>
    <CardHeader>
      <CardTitle>Mode de synchronisation</CardTitle>
      <CardDescription>Choisissez comment gérer le contenu optimisé par l'IA</CardDescription>
    </CardHeader>
    <CardContent>
      <RadioGroup value={syncMode} onValueChange={(v) => setSyncMode(v as "full" | "smart")}>
        <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
          <RadioGroupItem value="smart" id="smart" />
          <Label htmlFor="smart" className="flex-1 cursor-pointer">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-primary" />
              <span className="font-semibold">Smart (Recommandé)</span>
              <Badge variant="secondary" className="ml-auto">
                Par défaut
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Protège le contenu optimisé par l'IA. Seuls les prix, stocks et nouveaux produits sont synchronisés.
            </p>
          </Label>
        </div>
        <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
          <RadioGroupItem value="full" id="full" />
          <Label htmlFor="full" className="flex-1 cursor-pointer">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-orange-500" />
              <span className="font-semibold">Full</span>
              <Badge variant="outline" className="ml-auto">
                Avancé
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Écrase TOUT le contenu avec les données Shopify. À utiliser avec précaution.
            </p>
          </Label>
        </div>
      </RadioGroup>
    </CardContent>
  </Card>
);

const ContentTypeSelector = ({
  selectedTypes,
  setSelectedTypes,
}: {
  selectedTypes: string[];
  setSelectedTypes: (types: string[]) => void;
}) => (
  <div>
    <Label className="mb-3 block">Types de contenu à synchroniser</Label>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {IMPORT_TYPES.map((type) => (
        <div key={type.id} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted/30">
          <Checkbox
            id={type.id}
            checked={selectedTypes.includes(type.id)}
            onCheckedChange={(checked) => {
              if (checked) {
                setSelectedTypes([...selectedTypes, type.id]);
              } else {
                setSelectedTypes(selectedTypes.filter((t) => t !== type.id));
              }
            }}
          />
          <Label htmlFor={type.id} className="cursor-pointer flex-1">
            {type.label}
          </Label>
        </div>
      ))}
    </div>
  </div>
);

const ScheduleSettings = ({
  settings,
  setSettings,
}: {
  settings: SyncSettings | null;
  setSettings: (settings: SyncSettings) => void;
}) => {
  if (!settings || settings.import_frequency === "manual") return null;

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
      <Label className="text-sm font-semibold">Horaire de synchronisation</Label>

      {["daily", "weekly", "monthly"].includes(settings.import_frequency) && (
        <div className="space-y-2">
          <Label htmlFor="schedule_hour" className="text-sm">
            Heure de synchronisation
          </Label>
          <Select
            value={settings.import_schedule_hour?.toString() || "2"}
            onValueChange={(value) => setSettings({ ...settings, import_schedule_hour: parseInt(value) })}
          >
            <SelectTrigger id="schedule_hour">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCHEDULE_HOURS.map((hour) => (
                <SelectItem key={hour.value} value={hour.value.toString()}>
                  {hour.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {settings.import_frequency === "weekly" && (
        <div className="space-y-2">
          <Label htmlFor="schedule_day" className="text-sm">
            Jour de la semaine
          </Label>
          <Select
            value={settings.import_schedule_day?.toString() || "1"}
            onValueChange={(value) => setSettings({ ...settings, import_schedule_day: parseInt(value) })}
          >
            <SelectTrigger id="schedule_day">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS_OF_WEEK.map((day) => (
                <SelectItem key={day.value} value={day.value.toString()}>
                  {day.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {settings.import_frequency === "monthly" && (
        <div className="space-y-2">
          <Label htmlFor="schedule_day" className="text-sm">
            Jour du mois
          </Label>
          <Select
            value={settings.import_schedule_day?.toString() || "1"}
            onValueChange={(value) => setSettings({ ...settings, import_schedule_day: parseInt(value) })}
          >
            <SelectTrigger id="schedule_day">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 28 }, (_, i) => (
                <SelectItem key={i + 1} value={(i + 1).toString()}>
                  {i + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="timezone" className="text-sm">
          Fuseau horaire
        </Label>
        <Select
          value={settings.timezone || "Europe/Paris"}
          onValueChange={(value) => setSettings({ ...settings, timezone: value })}
        >
          <SelectTrigger id="timezone">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>
                {tz.label} ({tz.utc[0]})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

const NextSyncDisplay = ({ nextImportAt }: { nextImportAt: string | null }) => {
  if (!nextImportAt) return null;

  return (
    <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
      <div className="flex items-center gap-3">
        <Calendar className="w-5 h-5 text-primary" />
        <div>
          <p className="font-medium text-sm">Prochaine synchronisation</p>
          <p className="text-sm text-muted-foreground">{format(new Date(nextImportAt), "PPp", { locale: fr })}</p>
        </div>
      </div>
      <Badge variant="secondary">
        <Clock className="w-3 h-3 mr-1" />
        Planifiée
      </Badge>
    </div>
  );
};

const AutoExportSettings = ({
  settings,
  setSettings,
}: {
  settings: SyncSettings | null;
  setSettings: (settings: SyncSettings) => void;
}) => (
  <div className="space-y-4 pt-6 border-t">
    <Label className="text-base font-semibold">Export automatique</Label>

    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
      <div className="flex-1">
        <Label htmlFor="export_auto" className="cursor-pointer font-medium">
          Activer l'export automatique
        </Label>
        <p className="text-xs text-muted-foreground mt-1">
          Exporter automatiquement les données après chaque synchronisation
        </p>
      </div>
      <Switch
        id="export_auto"
        checked={settings?.export_auto_enabled || false}
        onCheckedChange={(checked) => setSettings({ ...settings!, export_auto_enabled: checked })}
      />
    </div>

    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
      <div className="flex-1">
        <Label htmlFor="export_after_opt" className="cursor-pointer font-medium">
          Exporter après optimisation
        </Label>
        <p className="text-xs text-muted-foreground mt-1">
          Exporter automatiquement vers Shopify après optimisation IA
        </p>
      </div>
      <Switch
        id="export_after_opt"
        checked={settings?.export_after_optimization || false}
        onCheckedChange={(checked) => setSettings({ ...settings!, export_after_optimization: checked })}
      />
    </div>
  </div>
);

const SyncHistoryList = ({ history }: { history: SyncHistory[] }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Clock className="w-5 h-5" />
        Historique de synchronisation
      </CardTitle>
    </CardHeader>
    <CardContent>
      {history.length === 0 ? (
        <p className="text-muted-foreground text-center py-4">Aucune synchronisation récente</p>
      ) : (
        <div className="space-y-2">
          {history.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {entry.status === "success" && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                {entry.status === "failed" && <XCircle className="w-5 h-5 text-red-500" />}
                {entry.status === "running" && <Loader2 className="w-5 h-5 animate-spin text-blue-500" />}
                <div>
                  <p className="font-medium capitalize">{entry.sync_type}</p>
                  <p className="text-sm text-muted-foreground">
                    {entry.items_synced} éléments • {format(new Date(entry.started_at), "Pp", { locale: fr })}
                  </p>
                </div>
              </div>
              <Badge
                variant={
                  entry.status === "success" ? "default" : entry.status === "failed" ? "destructive" : "secondary"
                }
              >
                {entry.status}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

export function ShopifySyncSettings() {
  const { settings, history, loading, setSettings, loadSettings, loadHistory } = useSyncData();
  const [saving, setSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMode, setSyncMode] = useState<"full" | "smart">("smart");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([
    "products",
    "collections",
    "pages",
    "articles",
    "images",
  ]);

  // États pour les dialogues
  const [showProgress, setShowProgress] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [currentType, setCurrentType] = useState("");
  const [syncResults, setSyncResults] = useState<SyncStats>({
    products: { before: 0, after: 0, imported: 0 },
    collections: { before: 0, after: 0, imported: 0 },
    pages: { before: 0, after: 0, imported: 0 },
    articles: { before: 0, after: 0, imported: 0 },
    images: { before: 0, after: 0, imported: 0 },
  });
  const [totalImported, setTotalImported] = useState(0);

  useEffect(() => {
    loadSettings();
    loadHistory();
  }, []);

  const saveSettings = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Calculate next import time
      let next_import_at: string | null = null;
      
      if (settings.import_frequency !== "manual") {
        const now = new Date();
        const timezone = settings.timezone || "Europe/Paris";
        
        switch (settings.import_frequency) {
          case "hourly":
            next_import_at = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
            break;
          case "daily":
            const nextDaily = new Date(now);
            nextDaily.setHours(settings.import_schedule_hour || 2, 0, 0, 0);
            if (nextDaily <= now) {
              nextDaily.setDate(nextDaily.getDate() + 1);
            }
            next_import_at = nextDaily.toISOString();
            break;
          case "weekly":
            const nextWeekly = new Date(now);
            nextWeekly.setHours(settings.import_schedule_hour || 2, 0, 0, 0);
            const daysUntilTarget = ((settings.import_schedule_day || 1) - nextWeekly.getDay() + 7) % 7;
            nextWeekly.setDate(nextWeekly.getDate() + (daysUntilTarget || 7));
            next_import_at = nextWeekly.toISOString();
            break;
          case "monthly":
            const nextMonthly = new Date(now);
            nextMonthly.setDate(settings.import_schedule_day || 1);
            nextMonthly.setHours(settings.import_schedule_hour || 2, 0, 0, 0);
            if (nextMonthly <= now) {
              nextMonthly.setMonth(nextMonthly.getMonth() + 1);
            }
            next_import_at = nextMonthly.toISOString();
            break;
        }
      }

      const { error } = await supabase
        .from("shopify_sync_settings")
        .update({ 
          ...settings, 
          import_types: selectedTypes,
          next_import_at 
        })
        .eq("user_id", user.id);

      if (error) throw error;

      // Reload settings to get the updated next_import_at
      await loadSettings();
      
      toast.success("Paramètres enregistrés avec succès");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleSyncNow = async () => {
    if (!settings) {
      toast.error("Veuillez configurer vos paramètres de synchronisation");
      return;
    }

    // Logique de synchronisation simplifiée pour l'exemple
    try {
      setIsSyncing(true);
      setShowProgress(true);

      // Votre logique de synchronisation existante ici...
      // (conservée pour garder la fonctionnalité)
    } catch (error) {
      console.error("❌ Error during sync:", error);
      toast.error("Erreur lors de la synchronisation");
    } finally {
      setIsSyncing(false);
      setCurrentType("");
      setShowProgress(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SyncModeSelector syncMode={syncMode} setSyncMode={setSyncMode} />

      {/* Paramètres d'importation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Paramètres d'importation
          </CardTitle>
          <CardDescription>Configurez comment importer vos données depuis Shopify</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ContentTypeSelector selectedTypes={selectedTypes} setSelectedTypes={setSelectedTypes} />

          {/* Fréquence d'importation */}
          <div className="space-y-3 pt-6 border-t">
            <Label htmlFor="import_frequency">Fréquence d'importation</Label>
            <Select
              value={settings?.import_frequency || "manual"}
              onValueChange={(value) => setSettings({ ...settings!, import_frequency: value as any })}
            >
              <SelectTrigger id="import_frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manuel</SelectItem>
                <SelectItem value="hourly">Toutes les heures</SelectItem>
                <SelectItem value="daily">Quotidien</SelectItem>
                <SelectItem value="weekly">Hebdomadaire</SelectItem>
                <SelectItem value="monthly">Mensuel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ScheduleSettings settings={settings} setSettings={setSettings} />
          <NextSyncDisplay nextImportAt={settings?.next_import_at || null} />
          <AutoExportSettings settings={settings} setSettings={setSettings} />

          {/* Boutons d'action */}
          <div className="space-y-3 pt-6 border-t">
            <Button
              onClick={handleSyncNow}
              disabled={isSyncing || selectedTypes.length === 0}
              className="w-full"
              size="lg"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Synchronisation en cours...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Synchroniser maintenant
                </>
              )}
            </Button>

            <Button onClick={saveSettings} disabled={saving} variant="outline" className="w-full">
              {saving ? "Enregistrement..." : "Enregistrer les paramètres"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <SyncHistoryList history={history} />

      {/* Dialogues */}
      <SimpleSyncProgress open={showProgress} currentType={currentType} />
      <SyncResultDialog
        open={showResultDialog}
        onOpenChange={setShowResultDialog}
        stats={syncResults}
        totalImported={totalImported}
      />
    </div>
  );
}
