import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Bell, Mail, Clock, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from '@/lib/language';

export default function NotificationSettings() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    email_enabled: true,
    in_app_enabled: true,
    daily_digest: true,
    digest_hour: 9,
    notify_products: true,
    notify_collections: true,
    notify_blog: true,
    notify_images: true,
    notify_homepage: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings(data);
      } else {
        // Create default settings
        const { error: insertError } = await supabase
          .from('notification_settings')
          .insert([{ user_id: user.id, ...settings }]);

        if (insertError) throw insertError;
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error(t.notificationSettings.loadError);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('notification_settings')
        .update(settings)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success(t.notificationSettings.saveSuccess);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(t.notificationSettings.saveError);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t.notificationSettings.title}</h1>
        <p className="text-muted-foreground mt-2">
          {t.notificationSettings.subtitle}
        </p>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            {t.notificationSettings.general.title}
          </CardTitle>
          <CardDescription>
            {t.notificationSettings.general.subtitle}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="in-app">{t.notificationSettings.general.inApp}</Label>
              <p className="text-sm text-muted-foreground">
                {t.notificationSettings.general.inAppDesc}
              </p>
            </div>
            <Switch
              id="in-app"
              checked={settings.in_app_enabled}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, in_app_enabled: checked })
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {t.notificationSettings.general.email}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t.notificationSettings.general.emailDesc}
              </p>
            </div>
            <Switch
              id="email"
              checked={settings.email_enabled}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, email_enabled: checked })
              }
            />
          </div>

          {settings.email_enabled && (
            <>
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="digest">{t.notificationSettings.general.digest}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t.notificationSettings.general.digestDesc}
                  </p>
                </div>
                <Switch
                  id="digest"
                  checked={settings.daily_digest}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, daily_digest: checked })
                  }
                />
              </div>

              {settings.daily_digest && (
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="hour" className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {t.notificationSettings.general.hour}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {t.notificationSettings.general.hourDesc}
                    </p>
                  </div>
                  <Select
                    value={settings.digest_hour.toString()}
                    onValueChange={(value) => 
                      setSettings({ ...settings, digest_hour: parseInt(value) })
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {i.toString().padStart(2, '0')}:00
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Category Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t.notificationSettings.categories.title}</CardTitle>
          <CardDescription>
            {t.notificationSettings.categories.subtitle}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="products">{t.notificationSettings.categories.products}</Label>
              <p className="text-sm text-muted-foreground">
                {t.notificationSettings.categories.productsDesc}
              </p>
            </div>
            <Switch
              id="products"
              checked={settings.notify_products}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, notify_products: checked })
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="collections">{t.notificationSettings.categories.collections}</Label>
              <p className="text-sm text-muted-foreground">
                {t.notificationSettings.categories.collectionsDesc}
              </p>
            </div>
            <Switch
              id="collections"
              checked={settings.notify_collections}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, notify_collections: checked })
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="blog">{t.notificationSettings.categories.blog}</Label>
              <p className="text-sm text-muted-foreground">
                {t.notificationSettings.categories.blogDesc}
              </p>
            </div>
            <Switch
              id="blog"
              checked={settings.notify_blog}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, notify_blog: checked })
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="images">{t.notificationSettings.categories.images}</Label>
              <p className="text-sm text-muted-foreground">
                {t.notificationSettings.categories.imagesDesc}
              </p>
            </div>
            <Switch
              id="images"
              checked={settings.notify_images}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, notify_images: checked })
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="homepage">{t.notificationSettings.categories.homepage}</Label>
              <p className="text-sm text-muted-foreground">
                {t.notificationSettings.categories.homepageDesc}
              </p>
            </div>
            <Switch
              id="homepage"
              checked={settings.notify_homepage}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, notify_homepage: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving} className="gap-2">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t.notificationSettings.saving}
            </>
          ) : (
            t.notificationSettings.save
          )}
        </Button>
      </div>
    </div>
  );
}