import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/language";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Facebook, Instagram, Plus, Calendar, Send, Settings, Loader2, Trash2, Zap, Palette } from "lucide-react";
import SocialCampaignWizard from "@/components/social/SocialCampaignWizard";
import SocialPostsList from "@/components/social/SocialPostsList";
import SocialConnections from "@/components/social/SocialConnections";
import QuickPostDialog from "@/components/social/QuickPostDialog";
import { SettingsPreview } from "@/components/social/SettingsPreview";

interface SocialSettings {
  id?: string;
  logo_url: string | null;
  default_template_style: string;
  auto_post_articles: boolean;
  default_channels: string[];
  brand_color: string;
}

const SocialMedia = () => {
  const { user } = useAuth();
  const { selectedStore } = useStore();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState("connections");
  const [showCampaignWizard, setShowCampaignWizard] = useState(false);
  const [showQuickPost, setShowQuickPost] = useState(false);
  const [settings, setSettings] = useState<SocialSettings>({
    logo_url: null,
    default_template_style: 'overlay',
    auto_post_articles: false,
    default_channels: ['facebook', 'instagram'],
    brand_color: '#6366f1',
  });
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Handle OAuth redirect with success/error messages
  useEffect(() => {
    const success = searchParams.get('success');
    const message = searchParams.get('message');
    const error = searchParams.get('error');

    if (success === 'true' && message) {
      toast.success(decodeURIComponent(message));
      // Switch to connections tab to show the new connection
      setActiveTab('connections');
      // Clean up URL
      navigate('/social-media', { replace: true });
    } else if (error) {
      toast.error(decodeURIComponent(error));
      setActiveTab('connections');
      navigate('/social-media', { replace: true });
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    if (user?.id) {
      loadSettings();
    }
  }, [user?.id]);

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from('social_settings')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (data) {
        setSettings({
          id: data.id,
          logo_url: data.logo_url,
          default_template_style: data.default_template_style || 'overlay',
          auto_post_articles: data.auto_post_articles || false,
          default_channels: data.default_channels || ['facebook', 'instagram'],
          brand_color: data.brand_color || '#6366f1',
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!user?.id) return;
    
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from('social_settings')
        .upsert({
          user_id: user.id,
          ...settings,
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;
      toast.success(t.socialMedia.settings.saved);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <div className="flex gap-1">
              <Facebook className="h-6 w-6 text-blue-600" />
              <Instagram className="h-6 w-6 text-pink-600" />
            </div>
            {t.socialMedia.title}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t.socialMedia.subtitle}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowQuickPost(true)}>
            <Zap className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">{t.socialMedia.quickPost}</span>
          </Button>
          <Button onClick={() => setShowCampaignWizard(true)}>
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">{t.socialMedia.newCampaign}</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => {
        if (value === 'creative') {
          navigate('/ai-creative-studio');
        } else {
          setActiveTab(value);
        }
      }}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="posts" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            {t.socialMedia.tabs.posts}
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {t.socialMedia.tabs.campaigns}
          </TabsTrigger>
          <TabsTrigger value="creative" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            {t.socialMedia.tabs.creative}
          </TabsTrigger>
          <TabsTrigger value="connections" className="flex items-center gap-2">
            <Facebook className="h-4 w-4" />
            {t.socialMedia.tabs.connections}
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            {t.socialMedia.tabs.settings}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-4">
          <SocialPostsList userId={user?.id} storeId={selectedStore?.id} />
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <SocialCampaignsList userId={user?.id} storeId={selectedStore?.id} />
        </TabsContent>

        <TabsContent value="connections" className="space-y-4">
          <SocialConnections userId={user?.id} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Settings Card */}
            <Card>
              <CardHeader>
                <CardTitle>{t.socialMedia.settings.title}</CardTitle>
                <CardDescription>
                  {t.socialMedia.settings.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t.socialMedia.settings.autoPostArticles}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t.socialMedia.settings.autoPostArticlesDesc}
                    </p>
                  </div>
                  <Switch
                    checked={settings.auto_post_articles}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, auto_post_articles: checked }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t.socialMedia.settings.brandColor}</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={settings.brand_color}
                      onChange={(e) => 
                        setSettings(prev => ({ ...prev, brand_color: e.target.value }))
                      }
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={settings.brand_color}
                      onChange={(e) => 
                        setSettings(prev => ({ ...prev, brand_color: e.target.value }))
                      }
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t.socialMedia.settings.logoUrl}</Label>
                  <Input
                    value={settings.logo_url || ''}
                    onChange={(e) => 
                      setSettings(prev => ({ ...prev, logo_url: e.target.value || null }))
                    }
                    placeholder="https://example.com/logo.png"
                  />
                </div>

                <Button onClick={saveSettings} disabled={savingSettings}>
                  {savingSettings && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {t.socialMedia.settings.save}
                </Button>
              </CardContent>
            </Card>

            {/* Preview Card */}
            <SettingsPreview
              selectedTemplateId={settings.default_template_style}
              onTemplateChange={(templateId) => 
                setSettings(prev => ({ ...prev, default_template_style: templateId }))
              }
              brandColor={settings.brand_color}
              logoUrl={settings.logo_url}
            />
          </div>
        </TabsContent>
      </Tabs>

      {showCampaignWizard && (
        <SocialCampaignWizard
          userId={user?.id}
          onClose={() => setShowCampaignWizard(false)}
          onCreated={() => {
            setShowCampaignWizard(false);
            setActiveTab('campaigns');
          }}
        />
      )}

      {showQuickPost && (
        <QuickPostDialog
          userId={user?.id}
          onClose={() => setShowQuickPost(false)}
          onPosted={() => {
            setShowQuickPost(false);
            setActiveTab('posts');
          }}
        />
      )}
    </div>
  );
};

const SocialCampaignsList = ({ userId, storeId }: { userId?: string; storeId?: string }) => {
  const { t } = useTranslation();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) loadCampaigns();
  }, [userId]);

  const loadCampaigns = async () => {
    const { data } = await supabase
      .from('social_campaigns')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    setCampaigns(data || []);
    setLoading(false);
  };

  const deleteCampaign = async (id: string) => {
    if (!confirm(t.common.actions.confirmDelete)) return;
    await supabase.from('social_campaigns').delete().eq('id', id);
    toast.success(t.toasts.success.deleted);
    loadCampaigns();
  };

  const toggleCampaign = async (id: string, status: string) => {
    await supabase.from('social_campaigns').update({ status: status === 'active' ? 'paused' : 'active' }).eq('id', id);
    loadCampaigns();
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  if (!campaigns.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p>{t.socialMedia.campaign.empty}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {campaigns.map((c) => (
        <Card key={c.id}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <h3 className="font-medium">{c.name}</h3>
              <div className="flex gap-2 mt-1">
                <Badge variant={c.status === 'active' ? 'default' : 'secondary'}>{c.status}</Badge>
                <span className="text-sm text-muted-foreground">{c.frequency}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {c.channels?.includes('facebook') && <Facebook className="h-4 w-4 text-blue-600" />}
              {c.channels?.includes('instagram') && <Instagram className="h-4 w-4 text-pink-600" />}
              <Switch checked={c.status === 'active'} onCheckedChange={() => toggleCampaign(c.id, c.status)} />
              <Button variant="ghost" size="icon" onClick={() => deleteCampaign(c.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default SocialMedia;
