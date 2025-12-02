import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Settings, Save, Facebook, Instagram } from 'lucide-react';
import { useTranslation } from '@/lib/language';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function OpportunitiesSettings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [facebookPage, setFacebookPage] = useState<any>(null);
  const [instagramAccount, setInstagramAccount] = useState<any>(null);
  const [autoShareEnabled, setAutoShareEnabled] = useState(true);
  const [autoShareInstagram, setAutoShareInstagram] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFacebookConnection();
    loadInstagramConnection();
  }, [user]);

  const loadFacebookConnection = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('facebook_page_connections')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (data) {
      setFacebookPage(data);
      setAutoShareEnabled(data.auto_share_enabled || true);
    }
  };

  const loadInstagramConnection = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('instagram_account_connections')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (data) {
      setInstagramAccount(data);
      setAutoShareInstagram(data.auto_share_enabled || true);
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

  const handleConnectInstagram = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('instagram-oauth', {
        body: { action: 'connect' }
      });

      if (error) throw error;
      
      if (data?.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error: any) {
      console.error('Instagram connection error:', error);
      toast.error(t.toasts.error.generic);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectInstagram = async () => {
    if (!instagramAccount) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('instagram_account_connections')
        .delete()
        .eq('id', instagramAccount.id);

      if (error) throw error;
      
      setInstagramAccount(null);
      toast.success('Instagram account disconnected');
    } catch (error: any) {
      console.error('Disconnect error:', error);
      toast.error(t.toasts.error.generic);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoShareInstagram = async () => {
    if (!instagramAccount) return;
    
    const newValue = !autoShareInstagram;
    setAutoShareInstagram(newValue);
    
    try {
      const { error } = await supabase
        .from('instagram_account_connections')
        .update({ auto_share_enabled: newValue })
        .eq('id', instagramAccount.id);

      if (error) throw error;
      
      toast.success(newValue ? 'Auto-share enabled' : 'Auto-share disabled');
    } catch (error: any) {
      console.error('Toggle error:', error);
      toast.error(t.toasts.error.generic);
      setAutoShareInstagram(!newValue);
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Facebook className="w-5 h-5 text-[#1877F2]" />
              <span>Facebook Integration</span>
            </CardTitle>
            <CardDescription>
              Connect your Facebook page to automatically share articles after publication
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {facebookPage ? (
              <>
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#1877F2] flex items-center justify-center">
                      <Facebook className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">{facebookPage.page_name}</p>
                      <p className="text-sm text-muted-foreground">Connected</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={handleDisconnect}
                    disabled={loading}
                    size="sm"
                  >
                    Disconnect
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
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
                className="w-full bg-[#1877F2] hover:bg-[#1877F2]/90" 
                onClick={handleConnectFacebook}
                disabled={loading}
              >
                <Facebook className="w-4 h-4 mr-2" />
                Connect Facebook Page
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Instagram className="w-5 h-5 text-[#E4405F]" />
              <span>Instagram Integration</span>
            </CardTitle>
            <CardDescription>
              Connect your Instagram account to automatically share articles after publication
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {instagramAccount ? (
              <>
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] flex items-center justify-center">
                      <Instagram className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">{instagramAccount.account_name}</p>
                      <p className="text-sm text-muted-foreground">Connected</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={handleDisconnectInstagram}
                    disabled={loading}
                    size="sm"
                  >
                    Disconnect
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label htmlFor="auto-share-instagram">Auto-share articles after publication</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically post new articles to your Instagram account
                    </p>
                  </div>
                  <Switch 
                    id="auto-share-instagram"
                    checked={autoShareInstagram}
                    onCheckedChange={handleToggleAutoShareInstagram}
                    disabled={loading}
                  />
                </div>
              </>
            ) : (
              <Button 
                className="w-full bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] hover:opacity-90" 
                onClick={handleConnectInstagram}
                disabled={loading}
              >
                <Instagram className="w-4 h-4 mr-2" />
                Connect Instagram Account
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
