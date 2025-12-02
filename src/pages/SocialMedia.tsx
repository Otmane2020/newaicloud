import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/language";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Facebook, Instagram, Plus, Calendar, Send, Settings, Loader2, Trash2 } from "lucide-react";
import SocialCampaignWizard from "@/components/social/SocialCampaignWizard";
import SocialPostsList from "@/components/social/SocialPostsList";
import SocialConnections from "@/components/social/SocialConnections";

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
  
  const [activeTab, setActiveTab] = useState("posts");
  const [showCampaignWizard, setShowCampaignWizard] = useState(false);
  const [settings, setSettings] = useState<SocialSettings>({
    logo_url: null,
    default_template_style: 'overlay',
    auto_post_articles: false,
    default_channels: ['facebook', 'instagram'],
    brand_color: '#6366f1',
  });
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

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
      toast.success("Paramètres sauvegardés");
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
            Social Media
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez vos publications Facebook et Instagram automatiquement
          </p>
        </div>
        <Button onClick={() => setShowCampaignWizard(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle campagne
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="posts" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Posts
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Campagnes
          </TabsTrigger>
          <TabsTrigger value="connections" className="flex items-center gap-2">
            <Facebook className="h-4 w-4" />
            Connexions
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Paramètres
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
          <Card>
            <CardHeader>
              <CardTitle>Paramètres Social Media</CardTitle>
              <CardDescription>
                Configurez vos préférences de publication
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Publication automatique des articles</Label>
                  <p className="text-sm text-muted-foreground">
                    Publie automatiquement les nouveaux articles sur les réseaux sociaux
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
                <Label>Style de template par défaut</Label>
                <Select
                  value={settings.default_template_style}
                  onValueChange={(value) => 
                    setSettings(prev => ({ ...prev, default_template_style: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Photo simple</SelectItem>
                    <SelectItem value="overlay">Template avec overlay</SelectItem>
                    <SelectItem value="carousel">Carrousel multi-images</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Couleur de marque</Label>
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
                <Label>URL du logo</Label>
                <Input
                  value={settings.logo_url || ''}
                  onChange={(e) => 
                    setSettings(prev => ({ ...prev, logo_url: e.target.value || null }))
                  }
                  placeholder="https://example.com/logo.png"
                />
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">💰 Coût des publications</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Publication Facebook : 3 crédits</li>
                  <li>• Publication Instagram : 3 crédits</li>
                </ul>
              </div>

              <Button onClick={saveSettings} disabled={savingSettings}>
                {savingSettings && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Sauvegarder
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showCampaignWizard && (
        <SocialCampaignWizard
          userId={user?.id}
          storeId={selectedStore?.id}
          onClose={() => setShowCampaignWizard(false)}
          onCreated={() => {
            setShowCampaignWizard(false);
            setActiveTab('campaigns');
          }}
        />
      )}
    </div>
  );
};

const SocialCampaignsList = ({ userId, storeId }: { userId?: string; storeId?: string }) => {
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
    if (!confirm('Supprimer ?')) return;
    await supabase.from('social_campaigns').delete().eq('id', id);
    toast.success('Supprimé');
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
          <p>Aucune campagne</p>
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
