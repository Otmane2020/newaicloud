import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Save, Copy, Check, ExternalLink } from 'lucide-react';

export function GoogleMerchantSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState({
    store_name: '',
    auto_update_enabled: false,
    gtin_country_code: 'FR',
  });

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('merchant_feed_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSettings({
          store_name: data.store_name,
          auto_update_enabled: data.auto_update_enabled,
          gtin_country_code: data.gtin_country_code,
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    if (!settings.store_name.trim()) {
      toast.error('Le nom de la boutique est requis');
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('merchant_feed_settings')
        .upsert({
          user_id: user.id,
          ...settings,
        });

      if (error) throw error;

      toast.success('Paramètres du feed sauvegardés avec succès ! 🎉');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erreur lors de la sauvegarde des paramètres');
    } finally {
      setLoading(false);
    }
  };

  const feedUrl = settings.store_name
    ? `https://newai.sale/shoppingfeed/${settings.store_name}/xml`
    : `https://newai.sale/shoppingfeed/{nom-boutique}/xml`;

  const handleCopy = () => {
    navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-xl font-bold mb-4">Paramètres du Flux XML</h3>
        
        <div className="space-y-4">
          {/* Store Name */}
          <div>
            <Label htmlFor="store_name">Nom de la boutique (slug URL)</Label>
            <Input
              id="store_name"
              value={settings.store_name}
              onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
              placeholder="ma-boutique"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Utilisé dans l'URL du flux : <code className="bg-muted px-1 rounded">/shoppingfeed/{'{nom-boutique}'}/xml</code>
            </p>
          </div>

          {/* Auto Update */}
          <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
            <div>
              <Label htmlFor="auto_update">Mise à jour automatique</Label>
              <p className="text-sm text-muted-foreground">
                Synchroniser automatiquement le flux avec vos modifications Shopify
              </p>
            </div>
            <Switch
              id="auto_update"
              checked={settings.auto_update_enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, auto_update_enabled: checked })}
            />
          </div>

          {/* GTIN Country Code */}
          <div>
            <Label htmlFor="gtin_country">Format GTIN par pays</Label>
            <Select
              value={settings.gtin_country_code}
              onValueChange={(value) => setSettings({ ...settings, gtin_country_code: value })}
            >
              <SelectTrigger id="gtin_country" className="mt-1">
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
            <p className="text-xs text-muted-foreground mt-1">
              Choisissez le format GTIN selon votre pays principal de vente
            </p>
          </div>

          {/* Save Button */}
          <Button onClick={handleSave} disabled={loading} className="w-full">
            {loading ? (
              'Enregistrement...'
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Sauvegarder les paramètres
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Feed URL Display */}
      {settings.store_name && (
        <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200">
          <h3 className="text-xl font-bold mb-4">URL de votre Flux XML</h3>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
            <Label className="text-sm font-medium mb-2 block">URL du flux Google Shopping</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={feedUrl}
                className="flex-1 font-mono text-sm"
              />
              <Button onClick={handleCopy} variant="default" size="sm">
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

          <div className="flex gap-3">
            <Button asChild variant="default">
              <a href={feedUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Tester le flux
              </a>
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
