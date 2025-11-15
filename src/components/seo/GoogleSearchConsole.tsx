import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TrendingUp, TrendingDown, Users, MousePointer, BarChart3, Globe, Plus, X, CheckCircle2, AlertCircle, RefreshCw, Calendar, LogOut, Settings, Search, FileText, Package } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { GoogleSearchConsoleKeywords } from './GoogleSearchConsoleKeywords';
import { GoogleSearchConsolePages } from './GoogleSearchConsolePages';
import { GoogleSearchConsoleProducts } from './GoogleSearchConsoleProducts';

interface Domain {
  id: string;
  domain: string;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

interface SearchConsoleData {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}

const MetricCard = ({ title, value, change, icon, trend = 'neutral' }: MetricCardProps) => {
  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-600';
    if (trend === 'down') return 'text-red-600';
    return 'text-muted-foreground';
  };

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4" />;
    return null;
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-primary/10 rounded-lg">{icon}</div>
        <div className={`flex items-center gap-1 text-sm font-medium ${getTrendColor()}`}>
          {getTrendIcon()}
          <span>{change > 0 ? '+' : ''}{change}%</span>
        </div>
      </div>
      <div>
        <p className="text-sm text-muted-foreground mb-1">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </Card>
  );
};

export function GoogleSearchConsole() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [dateRange, setDateRange] = useState<'7' | '30' | '90'>('30');
  const [data, setData] = useState<SearchConsoleData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddDomainDialog, setShowAddDomainDialog] = useState(false);
  const [showAvailableSitesDialog, setShowAvailableSitesDialog] = useState(false);
  const [availableSites, setAvailableSites] = useState<string[]>([]);
  const [loadingAvailableSites, setLoadingAvailableSites] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [googleConsoleEmail, setGoogleConsoleEmail] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'keywords' | 'pages' | 'products'>('overview');

  useEffect(() => {
    checkGoogleConnection();
    loadDomains();
  }, []);

  useEffect(() => {
    if (selectedDomain && activeSubTab === 'overview') {
      loadSearchConsoleData();
    }
  }, [selectedDomain, dateRange, activeSubTab]);

  const checkGoogleConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('google_oauth_token, google_console_email')
        .eq('id', user.id)
        .single();

      setIsConnected(!!profile?.google_oauth_token);
      setGoogleConsoleEmail(profile?.google_console_email || null);
    } catch (error) {
      console.error('Error checking Google connection:', error);
    }
  };

  const connectWithGoogle = async () => {
    try {
      const redirectUri = `${window.location.origin}/seo?tab=google-console`;
      const { data: urlData, error: urlError } = await supabase.functions.invoke('google-oauth-url', {
        body: { redirectUri },
      });

      if (urlError || !urlData?.url) throw new Error('Failed to generate OAuth URL');

      const width = 600, height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      window.open(urlData.url, 'Google Search Console Authorization', `width=${width},height=${height},left=${left},top=${top}`);
    } catch (error) {
      console.error('Error connecting to Google:', error);
      toast.error('Erreur lors de la connexion à Google');
    }
  };

  const loadDomains = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('google_search_console_domains')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDomains(data || []);
      if (data && data.length > 0 && !selectedDomain) {
        setSelectedDomain(data[0].domain);
      }
    } catch (error) {
      console.error('Error loading domains:', error);
    }
  };

  const loadSearchConsoleData = async () => {
    if (!selectedDomain) return;
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('get-search-console-data', {
        body: { domain: selectedDomain, days: parseInt(dateRange) },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.data) throw new Error('Aucune donnée reçue');

      setData(data.data);
      toast.success('Données chargées avec succès');
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error(error?.message || 'Erreur lors du chargement');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const addDomain = async () => {
    if (!newDomain.trim()) return toast.error('Veuillez saisir un domaine');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('google_search_console_domains')
        .insert({ user_id: user.id, domain: newDomain.trim() });

      if (error) throw error;
      toast.success('Domaine ajouté avec succès');
      setNewDomain('');
      setShowAddDomainDialog(false);
      await loadDomains();
    } catch (error) {
      toast.error('Erreur lors de l\'ajout du domaine');
    }
  };

  const disconnectGoogle = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ google_oauth_token: null, google_refresh_token: null, google_token_expires_at: null, google_console_email: null })
        .eq('id', user.id);

      if (error) throw error;
      setIsConnected(false);
      setGoogleConsoleEmail(null);
      toast.success('Google Search Console déconnecté');
    } catch (error) {
      toast.error('Impossible de déconnecter');
    }
  };

  const calculateMetrics = () => {
    if (data.length === 0) return null;
    const totalClicks = data.reduce((sum, d) => sum + d.clicks, 0);
    const totalImpressions = data.reduce((sum, d) => sum + d.impressions, 0);
    const avgCTR = data.reduce((sum, d) => sum + d.ctr, 0) / data.length;
    const avgPosition = data.reduce((sum, d) => sum + d.position, 0) / data.length;

    const halfLength = Math.floor(data.length / 2);
    const recentData = data.slice(halfLength);
    const oldData = data.slice(0, halfLength);

    const clicksChange = oldData.reduce((s, d) => s + d.clicks, 0);
    const recentClicks = recentData.reduce((s, d) => s + d.clicks, 0);

    return {
      totalClicks,
      totalImpressions,
      avgCTR: avgCTR.toFixed(2),
      avgPosition: avgPosition.toFixed(1),
      clicksChange: clicksChange > 0 ? Math.round(((recentClicks - clicksChange) / clicksChange) * 100) : 0,
      impressionsChange: 0,
      ctrChange: 0,
      positionChange: 0,
    };
  };

  const metrics = calculateMetrics();

  if (!isConnected) {
    return (
      <Card className="p-8">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="p-4 bg-primary/10 rounded-full">
              <Globe className="h-12 w-12 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Google Search Console</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Connectez Google pour importer les données Search Console
            </p>
          </div>
          <Button onClick={connectWithGoogle} size="lg" className="gap-2">
            <Globe className="h-5 w-5" />
            Se connecter avec Google
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Google Search Console</h2>
            <p className="text-sm text-muted-foreground">Connecté : {googleConsoleEmail}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAddDomainDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter domaine
            </Button>
            <Button variant="ghost" size="sm" onClick={disconnectGoogle}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {domains.length > 0 && (
        <Card className="p-6">
          <Label>Domaines</Label>
          <div className="grid gap-2 mt-2">
            {domains.map((domain) => (
              <div
                key={domain.id}
                className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer ${
                  selectedDomain === domain.domain ? 'border-primary' : 'border-border'
                }`}
                onClick={() => setSelectedDomain(domain.domain)}
              >
                <span>{domain.domain}</span>
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {selectedDomain && (
        <Tabs value={activeSubTab} onValueChange={(v: any) => setActiveSubTab(v)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview"><BarChart3 className="h-4 w-4 mr-2" />Vue</TabsTrigger>
            <TabsTrigger value="keywords"><Search className="h-4 w-4 mr-2" />Mots-clés</TabsTrigger>
            <TabsTrigger value="pages"><FileText className="h-4 w-4 mr-2" />Pages</TabsTrigger>
            <TabsTrigger value="products"><Package className="h-4 w-4 mr-2" />Produits</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 jours</SelectItem>
                    <SelectItem value="30">30 jours</SelectItem>
                    <SelectItem value="90">90 jours</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={loadSearchConsoleData} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </Card>

            {metrics && (
              <div className="grid gap-4 md:grid-cols-4">
                <MetricCard title="Clics" value={metrics.totalClicks.toLocaleString()} change={metrics.clicksChange} icon={<MousePointer className="h-5 w-5" />} />
                <MetricCard title="Impressions" value={metrics.totalImpressions.toLocaleString()} change={0} icon={<Users className="h-5 w-5" />} />
                <MetricCard title="CTR moyen" value={`${metrics.avgCTR}%`} change={0} icon={<BarChart3 className="h-5 w-5" />} />
                <MetricCard title="Position" value={metrics.avgPosition} change={0} icon={<TrendingUp className="h-5 w-5" />} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="keywords">
            <GoogleSearchConsoleKeywords selectedDomain={selectedDomain} dateRange={dateRange} />
          </TabsContent>

          <TabsContent value="pages">
            <GoogleSearchConsolePages selectedDomain={selectedDomain} dateRange={dateRange} />
          </TabsContent>

          <TabsContent value="products">
            <GoogleSearchConsoleProducts selectedDomain={selectedDomain} />
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={showAddDomainDialog} onOpenChange={setShowAddDomainDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un domaine</DialogTitle>
          </DialogHeader>
          <Input placeholder="exemple.com" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} />
          <DialogFooter>
            <Button onClick={addDomain}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
