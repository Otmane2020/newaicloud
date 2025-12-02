import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Settings, Save, Facebook } from 'lucide-react';
import { useTranslation } from '@/lib/language';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function OpportunitiesSettings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [facebookPage, setFacebookPage] = useState<any>(null);
  const [autoShareEnabled, setAutoShareEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFacebookConnection();
  }, [user]);

  const loadFacebookConnection = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('facebook_page_connections')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (data) {
      setFacebookPage(data);
      setAutoShareEnabled(data.auto_share_enabled);
    }
  };

  const handleConnectFacebook = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('facebook-page-oauth', {
        body: { action: 'connect' }
      });

      if (error) throw error;
      
      if (data?.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error: any) {
      console.error('Facebook connection error:', error);
      toast.error(t.toasts.error.generic);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!facebookPage) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('facebook_page_connections')
        .delete()
        .eq('id', facebookPage.id);

      if (error) throw error;
      
      setFacebookPage(null);
      toast.success('Facebook page disconnected');
    } catch (error: any) {
      console.error('Disconnect error:', error);
      toast.error(t.toasts.error.generic);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoShare = async () => {
    if (!facebookPage) return;
    
    const newValue = !autoShareEnabled;
    setAutoShareEnabled(newValue);
    
    try {
      const { error } = await supabase
        .from('facebook_page_connections')
        .update({ auto_share_enabled: newValue })
        .eq('id', facebookPage.id);

      if (error) throw error;
      
      toast.success(newValue ? 'Auto-share enabled' : 'Auto-share disabled');
    } catch (error: any) {
      console.error('Toggle error:', error);
      toast.error(t.toasts.error.generic);
      setAutoShareEnabled(!newValue);
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            {t.navigation.settings}
          </CardTitle>
          <CardDescription>{t.blog.submenu.settingsDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-generate">{t.common.settings}</Label>
              <p className="text-sm text-muted-foreground">{t.blog.submenu.settingsDesc}</p>
            </div>
            <Switch id="auto-generate" />
          </div>

          <div>
            <Label htmlFor="frequency">{t.common.settings}</Label>
            <Select defaultValue="daily">
              <SelectTrigger id="frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">{t.integration.daily}</SelectItem>
                <SelectItem value="weekly">{t.integration.weekly}</SelectItem>
                <SelectItem value="monthly">{t.onboarding.monthly}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button className="w-full">
            <Save className="w-4 h-4 mr-2" />
            {t.common.save}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Facebook className="w-5 h-5" />
            Facebook Integration
          </CardTitle>
          <CardDescription>
            Connect your Facebook page to automatically share articles after publication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {facebookPage ? (
            <>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">{facebookPage.page_name}</p>
                  <p className="text-sm text-muted-foreground">Connected</p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleDisconnect}
                  disabled={loading}
                >
                  Disconnect
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-share">Auto-share articles after publication</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically post new articles to your Facebook page
                  </p>
                </div>
                <Switch 
                  id="auto-share"
                  checked={autoShareEnabled}
                  onCheckedChange={handleToggleAutoShare}
                  disabled={loading}
                />
              </div>
            </>
          ) : (
            <Button 
              className="w-full" 
              onClick={handleConnectFacebook}
              disabled={loading}
            >
              <Facebook className="w-4 h-4 mr-2" />
              Connect Facebook Page
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}