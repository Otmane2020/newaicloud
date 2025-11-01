import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Save, Copy, Check, ExternalLink, RefreshCw, Settings, Info, AlertCircle } from "lucide-react";

interface MerchantSettings {
  id?: string;
  user_id: string;
  store_name: string;
  auto_update_enabled: boolean;
  gtin_country_code: string;
  default_currency: string;
  default_condition: string;
  default_brand: string;
  last_updated?: string;
  created_at?: string;
}

export function GoogleMerchantSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedStatus, setFeedStatus] = useState<"idle" | "success" | "error">("idle");
  const [settings, setSettings] = useState<MerchantSettings>({
    user_id: user?.id || "",
    store_name: "",
    auto_update_enabled: true,
    gtin_country_code: "FR",
    default_currency: "EUR",
    default_condition: "new",
    default_brand: "",
  });

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.from("merchant_feed_settings").select("*").eq("user_id", user.id).single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setSettings({
          ...data,
          default_currency: data.default_currency || 'EUR',
          default_condition: data.default_condition || 'new',
          default_brand: data.default_brand || '',
        });
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      toast.error("Erreur lors du chargement des paramètres");
    }
  };

  const validateSettings = (): string[] => {
    const errors: string[] = [];

    if (!settings.store_name.trim()) {
      errors.push("Le nom de la boutique est requis");
    }

    if (!/^[a-z0-9-]+$/.test(settings.store_name)) {
      errors.push("Le nom de la boutique ne doit contenir que des lettres minuscules, chiffres et tirets");
    }

    if (settings.store_name.length < 3) {
      errors.push("Le nom de la boutique doit contenir au moins 3 caractères");
    }

    if (settings.store_name.length > 50) {
      errors.push("Le nom de la boutique ne peut pas dépasser 50 caractères");
    }

    return errors;
  };

  const handleSave = async () => {
    if (!user) return;

    const errors = validateSettings();
    if (errors.length > 0) {
      errors.forEach((error) => toast.error(error));
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.from("merchant_feed_settings").upsert(
        {
          ...settings,
          user_id: user.id,
          last_updated: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        },
      );

      if (error) throw error;

      toast.success("Paramètres sauvegardés avec succès ! 🎉");

      // Test the feed automatically after saving
      if (settings.store_name) {
        await testFeed();
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Erreur lors de la sauvegarde des paramètres");
    } finally {
      setLoading(false);
    }
  };

  const testFeed = async () => {
    if (!settings.store_name) {
      toast.error("Veuillez d'abord configurer un nom de boutique");
      return;
    }

    setTesting(true);
    setFeedStatus("idle");

    try {
      const testUrl = user?.id 
        ? `https://nekqqlhrjgmyudmmewas.supabase.co/functions/v1/shopping-feed/shoppingfeed/${user.id}/xml`
        : feedUrl;
      const response = await fetch(testUrl);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();

      if (!text.includes("<?xml") || !text.includes("<rss")) {
        throw new Error("Format XML invalide");
      }

      setFeedStatus("success");
      toast.success("Flux XML testé avec succès ! ✅");
    } catch (error) {
      console.error("Error testing feed:", error);
      setFeedStatus("error");
      toast.error("Erreur lors du test du flux");
    } finally {
      setTesting(false);
    }
  };

  // URL du flux - utilise l'URL Supabase directe
  const feedUrl = user?.id 
    ? `https://nekqqlhrjgmyudmmewas.supabase.co/functions/v1/shopping-feed/shoppingfeed/${user.id}/xml`
    : `https://nekqqlhrjgmyudmmewas.supabase.co/functions/v1/shopping-feed/shoppingfeed/{VOTRE_ID}/xml`;

  const handleCopy = () => {
    navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    toast.success("URL copiée dans le presse-papier");
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = () => {
    switch (feedStatus) {
      case "success":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
            ✓ Opérationnel
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
            ✗ Erreur
          </Badge>
        );
      default:
        return <Badge variant="outline">⏳ Non testé</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configuration du Flux Google Shopping
          </CardTitle>
          <CardDescription>Configurez les paramètres de votre flux XML pour Google Merchant Center</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Store Name */}
          <div className="space-y-2">
            <Label htmlFor="store_name" className="flex items-center gap-2">
              Nom de la boutique
              <Info className="w-4 h-4 text-muted-foreground" />
            </Label>
            <Input
              id="store_name"
              value={settings.store_name}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  store_name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                })
              }
              placeholder="ma-boutique"
              className="font-mono"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Utilisé dans l'URL de votre flux</span>
              <span>{settings.store_name.length}/50</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Le nom de boutique peut être utilisé comme identifiant alternatif dans votre flux
            </div>
          </div>

          {/* Auto Update */}
          <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
            <div className="space-y-1">
              <Label htmlFor="auto_update" className="text-base">
                Mise à jour automatique
              </Label>
              <p className="text-sm text-muted-foreground">
                Synchroniser automatiquement le flux avec vos modifications
              </p>
            </div>
            <Switch
              id="auto_update"
              checked={settings.auto_update_enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, auto_update_enabled: checked })}
            />
          </div>

          {/* Default Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* GTIN Country Code */}
            <div className="space-y-2">
              <Label htmlFor="gtin_country">Format GTIN</Label>
              <Select
                value={settings.gtin_country_code}
                onValueChange={(value) => setSettings({ ...settings, gtin_country_code: value })}
              >
                <SelectTrigger id="gtin_country">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FR">🇫🇷 France (GTIN-13)</SelectItem>
                  <SelectItem value="US">🇺🇸 États-Unis (GTIN-12)</SelectItem>
                  <SelectItem value="GB">🇬🇧 Royaume-Uni (GTIN-13)</SelectItem>
                  <SelectItem value="DE">🇩🇪 Allemagne (GTIN-13)</SelectItem>
                  <SelectItem value="ES">🇪🇸 Espagne (GTIN-13)</SelectItem>
                  <SelectItem value="IT">🇮🇹 Italie (GTIN-13)</SelectItem>
                  <SelectItem value="NL">🇳🇱 Pays-Bas (GTIN-13)</SelectItem>
                  <SelectItem value="BE">🇧🇪 Belgique (GTIN-13)</SelectItem>
                  <SelectItem value="CH">🇨🇭 Suisse (GTIN-13)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Pays principal de vente</p>
            </div>

            {/* Default Currency */}
            <div className="space-y-2">
              <Label htmlFor="default_currency">Devise par défaut</Label>
              <Select
                value={settings.default_currency}
                onValueChange={(value) => setSettings({ ...settings, default_currency: value })}
              >
                <SelectTrigger id="default_currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">€ EUR - Euro</SelectItem>
                  <SelectItem value="USD">$ USD - Dollar US</SelectItem>
                  <SelectItem value="GBP">£ GBP - Livre Sterling</SelectItem>
                  <SelectItem value="CHF">CHF - Franc Suisse</SelectItem>
                  <SelectItem value="CAD">$ CAD - Dollar Canadien</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Default Condition */}
            <div className="space-y-2">
              <Label htmlFor="default_condition">État par défaut</Label>
              <Select
                value={settings.default_condition}
                onValueChange={(value) => setSettings({ ...settings, default_condition: value })}
              >
                <SelectTrigger id="default_condition">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Neuf</SelectItem>
                  <SelectItem value="refurbished">Reconditionné</SelectItem>
                  <SelectItem value="used">Occasion</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Default Brand */}
          <div className="space-y-2">
            <Label htmlFor="default_brand">Marque par défaut</Label>
            <Input
              id="default_brand"
              value={settings.default_brand}
              onChange={(e) => setSettings({ ...settings, default_brand: e.target.value })}
              placeholder="Votre marque principale"
            />
            <p className="text-xs text-muted-foreground">Utilisée pour les produits sans marque spécifiée</p>
          </div>

          {/* Save Button */}
          <Button onClick={handleSave} disabled={loading} className="w-full" size="lg">
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Sauvegarder les paramètres
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Feed URL Display */}
      {user?.id && (
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>URL de votre Flux XML</span>
              {getStatusBadge()}
            </CardTitle>
            <CardDescription>Utilisez cette URL pour configurer votre flux dans Google Merchant Center</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Feed URL */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">URL du flux Google Shopping</Label>
              <div className="flex gap-2">
                <Input readOnly value={feedUrl} className="flex-1 font-mono text-xs sm:text-sm bg-white dark:bg-gray-800" />
                <Button onClick={handleCopy} variant="default" size="sm" className="shrink-0">
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      Copié
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1" />
                      Copier
                    </>
                  )}
                </Button>
              </div>
            </div>

            <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>URL fonctionnelle:</strong> Cette URL est active et peut être utilisée immédiatement dans Google Merchant Center.
              </AlertDescription>
            </Alert>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={testFeed} disabled={testing} variant="default" className="flex-1">
                {testing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Test en cours...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Tester le flux
                  </>
                )}
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <a href={feedUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Ouvrir le flux
                </a>
              </Button>
            </div>

            {/* Status Alert */}
            {feedStatus === "error" && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Impossible de charger le flux. Vérifiez que vous avez des produits actifs avec des images et des prix.
                </AlertDescription>
              </Alert>
            )}

            {feedStatus === "success" && (
              <Alert className="bg-green-50 dark:bg-green-950 border-green-200">
                <Check className="h-4 w-4" />
                <AlertDescription>
                  Flux XML testé avec succès ! ✅ Votre flux est prêt à être utilisé dans Google Merchant Center.
                </AlertDescription>
              </Alert>
            )}

            {/* Tips */}
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                💡 Configuration dans Google Merchant Center
              </h4>
              <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                <li>• Accédez à Produits → Flux → Ajouter un flux</li>
                <li>• Choisissez "Flux planifiés" avec mise à jour quotidienne</li>
                <li>• Collez cette URL dans le champ prévu</li>
                <li>• Vérifiez l'onglet "Diagnostics" après la première récupération</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            Informations importantes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong>Format GTIN :</strong> Le GTIN (Global Trade Item Number) est requis pour certains produits.
            Choisissez le format correspondant à votre pays principal de vente.
          </p>
          <p>
            <strong>Mise à jour automatique :</strong> Lorsque activée, votre flux se met à jour automatiquement à
            chaque modification de vos produits.
          </p>
          <p>
            <strong>Marque par défaut :</strong> Cette marque sera utilisée pour les produits qui n'ont pas de marque
            spécifiée dans Shopify.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
