import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Store, Loader2 } from 'lucide-react';

interface StoreMetadata {
  store_label: string;
  store_category: string;
  store_phone: string;
  store_address: string;
  store_business_hours: string;
  store_description: string;
}

export function StoreMetadataForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<StoreMetadata>({
    store_label: '',
    store_category: '',
    store_phone: '',
    store_address: '',
    store_business_hours: '',
    store_description: '',
  });

  useEffect(() => {
    loadMetadata();
  }, []);

  const loadMetadata = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('shopify_connections')
        .select('id, store_label, store_category, store_phone, store_address, store_business_hours, store_description')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setStoreId(data.id);
        setMetadata({
          store_label: data.store_label || '',
          store_category: data.store_category || '',
          store_phone: data.store_phone || '',
          store_address: data.store_address || '',
          store_business_hours: data.store_business_hours || '',
          store_description: data.store_description || '',
        });
      }
    } catch (error) {
      console.error('Error loading metadata:', error);
      toast.error('Erreur lors du chargement des métadonnées');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!storeId) {
      toast.error('Aucune boutique active trouvée');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('shopify_connections')
        .update(metadata)
        .eq('id', storeId);

      if (error) throw error;

      toast.success('Métadonnées enregistrées avec succès');
    } catch (error) {
      console.error('Error saving metadata:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!storeId) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Aucune boutique connectée. Connectez une boutique pour gérer ses métadonnées.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Store className="w-5 h-5" />
          <CardTitle>Métadonnées de la Boutique</CardTitle>
        </div>
        <CardDescription>
          Ces informations améliorent la génération SEO et les contenus générés par IA
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="store_label">
              Nom Commercial <span className="text-destructive">*</span>
            </Label>
            <Input
              id="store_label"
              placeholder="ex: Sweet Deco"
              value={metadata.store_label}
              onChange={(e) => setMetadata({ ...metadata, store_label: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Nom affiché publiquement (différent de l'identifiant technique)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="store_category">
              Secteur d'Activité <span className="text-destructive">*</span>
            </Label>
            <Input
              id="store_category"
              placeholder="ex: Décoration d'intérieur"
              value={metadata.store_category}
              onChange={(e) => setMetadata({ ...metadata, store_category: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Aide l'IA à cibler les bons mots-clés SEO
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="store_phone">Téléphone</Label>
            <Input
              id="store_phone"
              placeholder="ex: +33 1 23 45 67 89"
              value={metadata.store_phone}
              onChange={(e) => setMetadata({ ...metadata, store_phone: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="store_business_hours">Horaires d'Ouverture</Label>
            <Input
              id="store_business_hours"
              placeholder="ex: Lun-Ven 9h-18h"
              value={metadata.store_business_hours}
              onChange={(e) => setMetadata({ ...metadata, store_business_hours: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="store_address">Adresse</Label>
          <Input
            id="store_address"
            placeholder="ex: Paris, France"
            value={metadata.store_address}
            onChange={(e) => setMetadata({ ...metadata, store_address: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="store_description">
            Description <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="store_description"
            placeholder="ex: Spécialiste en décoration scandinave haut de gamme. Nous proposons..."
            value={metadata.store_description}
            onChange={(e) => setMetadata({ ...metadata, store_description: e.target.value })}
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            Description courte de votre boutique pour enrichir les contenus IA (blogs, SEO, etc.)
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enregistrement...
            </>
          ) : (
            'Enregistrer les Métadonnées'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}