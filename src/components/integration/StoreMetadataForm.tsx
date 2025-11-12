import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Store, Loader2 } from 'lucide-react';
import { useTranslation } from '@/lib/language';

interface StoreMetadata {
  store_label: string;
  store_category: string;
  store_phone: string;
  store_address: string;
  store_business_hours: string;
  store_description: string;
  public_domain: string;
}

export function StoreMetadataForm() {
  const { t } = useTranslation();
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
    public_domain: '',
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
        .select('id, store_label, store_category, store_phone, store_address, store_business_hours, store_description, public_domain')
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
          public_domain: data.public_domain || '',
        });
      }
    } catch (error) {
      console.error('Error loading metadata:', error);
      toast.error(t.integration.store.metadata.toasts.errorLoading);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!storeId) {
      toast.error(t.integration.store.metadata.toasts.noStore);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('shopify_connections')
        .update(metadata)
        .eq('id', storeId);

      if (error) throw error;

      toast.success(t.integration.store.metadata.toasts.saved);
    } catch (error) {
      console.error('Error saving metadata:', error);
      toast.error(t.integration.store.metadata.toasts.errorSaving);
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
          {t.integration.store.metadata.toasts.noStoreConnected}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Store className="w-5 h-5" />
          <CardTitle>{t.integration.store.metadata.title}</CardTitle>
        </div>
        <CardDescription>
          {t.integration.store.metadata.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="store_label">
              {t.integration.store.metadata.fields.label} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="store_label"
              placeholder={t.integration.store.metadata.placeholders.label}
              value={metadata.store_label}
              onChange={(e) => setMetadata({ ...metadata, store_label: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              {t.integration.store.metadata.hints.label}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="store_category">
              {t.integration.store.metadata.fields.category} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="store_category"
              placeholder={t.integration.store.metadata.placeholders.category}
              value={metadata.store_category}
              onChange={(e) => setMetadata({ ...metadata, store_category: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              {t.integration.store.metadata.hints.category}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="store_phone">{t.integration.store.metadata.fields.phone}</Label>
            <Input
              id="store_phone"
              placeholder={t.integration.store.metadata.placeholders.phone}
              value={metadata.store_phone}
              onChange={(e) => setMetadata({ ...metadata, store_phone: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="store_business_hours">{t.integration.store.metadata.fields.hours}</Label>
            <Input
              id="store_business_hours"
              placeholder={t.integration.store.metadata.placeholders.hours}
              value={metadata.store_business_hours}
              onChange={(e) => setMetadata({ ...metadata, store_business_hours: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="store_address">{t.integration.store.metadata.fields.address}</Label>
          <Input
            id="store_address"
            placeholder={t.integration.store.metadata.placeholders.address}
            value={metadata.store_address}
            onChange={(e) => setMetadata({ ...metadata, store_address: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="public_domain">
            Domaine public <span className="text-destructive">*</span>
          </Label>
          <Input
            id="public_domain"
            placeholder="exemple: decora-home.fr"
            value={metadata.public_domain}
            onChange={(e) => setMetadata({ ...metadata, public_domain: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Votre domaine personnalisé (sans https://)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="store_description">
            {t.integration.store.metadata.fields.description} <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="store_description"
            placeholder={t.integration.store.metadata.placeholders.description}
            value={metadata.store_description}
            onChange={(e) => setMetadata({ ...metadata, store_description: e.target.value })}
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            {t.integration.store.metadata.hints.description}
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t.common.saving}...
            </>
          ) : (
            t.integration.store.metadata.button
          )}
        </Button>
      </CardContent>
    </Card>
  );
}