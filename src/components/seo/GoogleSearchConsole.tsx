import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  TrendingUp,
  TrendingDown,
  Users,
  MousePointer,
  BarChart3,
  Globe,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Calendar,
  LogOut,
} from 'lucide-react';

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

  useEffect(() => {
    checkGoogleConnection();
    loadDomains();
    handleOAuthCallback();
  }, []);

  const handleOAuthCallback = async () => {
    try {
      // Check if we have an OAuth code in the URL
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      
      if (code && window.opener) {
        // We're in the popup - send code to parent window
        window.opener.postMessage({
          type: 'GOOGLE_OAUTH_CODE',
          code: code,
        }, window.location.origin);
        
        // Show success and close popup
        toast.success('Autorisation accordée, fermeture...');
        setTimeout(() => window.close(), 1000);
      }
    } catch (error) {
      console.error('Error handling OAuth callback:', error);
    }
  };

  useEffect(() => {
    if (selectedDomain) {
      loadSearchConsoleData();
    }
  }, [selectedDomain, dateRange]);

  const checkGoogleConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user has Google OAuth connected
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
      // Use the full current URL as redirect URI to match Google Cloud Console configuration
      const redirectUri = `${window.location.origin}/seo?tab=google-console`;
      
      // Get Google OAuth URL from edge function (to avoid exposing CLIENT_ID)
      const { data: urlData, error: urlError } = await supabase.functions.invoke('google-oauth-url', {
        body: { redirectUri },
      });
      
      if (urlError || !urlData?.url) {
        throw new Error('Failed to generate OAuth URL');
      }
      
      // Open in popup to avoid full page redirect
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        urlData.url,
        'Google Search Console Authorization',
        `width=${width},height=${height},left=${left},top=${top}`
      );
      
      if (!popup) {
        toast.error('Veuillez autoriser les popups pour ce site');
        return;
      }
      
      // Listen for the callback
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'GOOGLE_OAUTH_CODE' && event.data.code) {
          window.removeEventListener('message', handleMessage);
          
          // Exchange code for tokens via edge function
          const { data, error } = await supabase.functions.invoke('google-oauth-token', {
            body: {
              code: event.data.code,
              state: redirectUri,
            },
          });
          
          if (error || !data?.success) {
            console.error('Error exchanging code:', error);
            toast.error('Erreur lors de la connexion à Google');
            return;
          }
          
          toast.success('Connexion à Google Search Console réussie !');
          setIsConnected(true);
          await checkGoogleConnection();
          await loadDomains();
        }
      };
      
      window.addEventListener('message', handleMessage);
      
      // Clean up after 5 minutes
      setTimeout(() => {
        window.removeEventListener('message', handleMessage);
      }, 5 * 60 * 1000);
      
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
        body: {
          domain: selectedDomain,
          days: parseInt(dateRange),
        },
      });

      if (error) throw error;

      setData(data?.data || []);
    } catch (error) {
      console.error('Error loading Search Console data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const addDomain = async () => {
    if (!newDomain.trim()) {
      toast.error('Veuillez saisir un domaine');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('google_search_console_domains')
        .insert({
          user_id: user.id,
          domain: newDomain.trim(),
        });

      if (error) throw error;

      toast.success('Domaine ajouté avec succès');
      setNewDomain('');
      setShowAddDomainDialog(false);
      await loadDomains();
    } catch (error) {
      console.error('Error adding domain:', error);
      toast.error('Erreur lors de l\'ajout du domaine');
    }
  };

  const disconnectGoogle = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          google_oauth_token: null,
          google_refresh_token: null,
          google_token_expires_at: null,
          google_console_email: null,
        })
        .eq('id', user.id);

      if (error) throw error;

      setIsConnected(false);
      setGoogleConsoleEmail(null);
      toast.success('Google Search Console déconnecté avec succès');
    } catch (error) {
      console.error('Error disconnecting Google:', error);
      toast.error('Impossible de déconnecter Google Search Console');
    }
  };

  const checkAvailableSites = async () => {
    try {
      setLoadingAvailableSites(true);
      const { data, error } = await supabase.functions.invoke('list-search-console-sites');

      if (error) throw error;

      if (data?.sites && data.sites.length > 0) {
        const siteUrls = data.sites.map((s: any) => s.siteUrl.replace('sc-domain:', ''));
        setAvailableSites(siteUrls);
        setShowAvailableSitesDialog(true);
      } else {
        toast.error('Aucun site trouvé dans votre Google Search Console');
      }
    } catch (error) {
      console.error('Error fetching available sites:', error);
      toast.error('Erreur lors de la récupération des sites disponibles');
    } finally {
      setLoadingAvailableSites(false);
    }
  };

  const removeDomain = async (domainId: string) => {
    try {
      const { error } = await supabase
        .from('google_search_console_domains')
        .delete()
        .eq('id', domainId);

      if (error) throw error;

      toast.success('Domaine supprimé');
      if (selectedDomain === domains.find(d => d.id === domainId)?.domain) {
        setSelectedDomain('');
      }
      loadDomains();
    } catch (error) {
      console.error('Error removing domain:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const calculateMetrics = () => {
    if (data.length === 0) return null;

    const totalClicks = data.reduce((sum, d) => sum + d.clicks, 0);
    const totalImpressions = data.reduce((sum, d) => sum + d.impressions, 0);
    const avgCTR = data.reduce((sum, d) => sum + d.ctr, 0) / data.length;
    const avgPosition = data.reduce((sum, d) => sum + d.position, 0) / data.length;

    // Calculate change compared to previous period
    const halfLength = Math.floor(data.length / 2);
    const recentData = data.slice(halfLength);
    const oldData = data.slice(0, halfLength);

    const recentClicks = recentData.reduce((sum, d) => sum + d.clicks, 0);
    const oldClicks = oldData.reduce((sum, d) => sum + d.clicks, 0);
    const clicksChange = oldClicks > 0 ? ((recentClicks - oldClicks) / oldClicks) * 100 : 0;

    const recentImpressions = recentData.reduce((sum, d) => sum + d.impressions, 0);
    const oldImpressions = oldData.reduce((sum, d) => sum + d.impressions, 0);
    const impressionsChange = oldImpressions > 0 ? ((recentImpressions - oldImpressions) / oldImpressions) * 100 : 0;

    const recentCTR = recentData.reduce((sum, d) => sum + d.ctr, 0) / recentData.length;
    const oldCTR = oldData.reduce((sum, d) => sum + d.ctr, 0) / oldData.length;
    const ctrChange = oldCTR > 0 ? ((recentCTR - oldCTR) / oldCTR) * 100 : 0;

    const recentPosition = recentData.reduce((sum, d) => sum + d.position, 0) / recentData.length;
    const oldPosition = oldData.reduce((sum, d) => sum + d.position, 0) / oldData.length;
    const positionChange = oldPosition > 0 ? ((oldPosition - recentPosition) / oldPosition) * 100 : 0; // Lower is better

    return {
      totalClicks,
      totalImpressions,
      avgCTR: avgCTR.toFixed(2),
      avgPosition: avgPosition.toFixed(1),
      clicksChange: Math.round(clicksChange),
      impressionsChange: Math.round(impressionsChange),
      ctrChange: Math.round(ctrChange),
      positionChange: Math.round(positionChange),
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
              Connectez votre compte Google pour importer les données Search Console
              et suivre l'évolution de votre trafic et l'impact de vos optimisations SEO.
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button
                onClick={connectWithGoogle}
                size="lg"
                className="gap-2"
              >
                <Globe className="h-5 w-5" />
                Se connecter avec Google
              </Button>
              {isConnected && (
                <Button
                  onClick={checkAvailableSites}
                  size="lg"
                  variant="outline"
                  disabled={loadingAvailableSites}
                  className="gap-2"
                >
                  {loadingAvailableSites ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    <BarChart3 className="h-5 w-5" />
                  )}
                  Voir mes sites disponibles
                </Button>
              )}
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>✓ Analyse de performance SEO</p>
              <p>✓ Évolution du trafic par période</p>
              <p>✓ Support multi-domaines</p>
              <p>✓ Mesure de l'impact des optimisations</p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with domain selector */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold">Google Search Console</h2>
            <p className="text-muted-foreground">
              Analyse de performance SEO et évolution du trafic
            </p>
            {googleConsoleEmail && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                <Globe className="h-3.5 w-3.5" />
                <span>Connecté avec : <span className="font-medium text-foreground">{googleConsoleEmail}</span></span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={checkAvailableSites}
              disabled={loadingAvailableSites}
              className="gap-2"
            >
              {loadingAvailableSites ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <BarChart3 className="h-4 w-4" />
              )}
              Mes sites
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddDomainDialog(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Ajouter domaine
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadSearchConsoleData}
              disabled={loading || !selectedDomain}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={disconnectGoogle}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Déconnecter
            </Button>
          </div>
        </div>
      </Card>

      {/* Domain list */}
      {domains.length > 0 && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <Label>Domaines connectés</Label>
            </div>
            <div className="grid gap-2">
              {domains.map((domain) => (
                <div
                  key={domain.id}
                  className={`flex items-center justify-between p-3 rounded-lg border-2 transition-colors cursor-pointer ${
                    selectedDomain === domain.domain
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedDomain(domain.domain)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{domain.domain}</span>
                    </div>
                    <Badge variant={domain.verified ? 'default' : 'secondary'}>
                      {domain.verified ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Vérifié
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Non vérifié
                        </>
                      )}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeDomain(domain.id);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {selectedDomain && (
        <>
          {/* Date range selector */}
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <Calendar className="h-5 w-5 text-primary" />
              <Label>Période d'analyse</Label>
              <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 derniers jours</SelectItem>
                  <SelectItem value="30">30 derniers jours</SelectItem>
                  <SelectItem value="90">90 derniers jours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Metrics cards */}
          {metrics && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title="Clics totaux"
                value={metrics.totalClicks.toLocaleString()}
                change={metrics.clicksChange}
                trend={metrics.clicksChange > 0 ? 'up' : metrics.clicksChange < 0 ? 'down' : 'neutral'}
                icon={<MousePointer className="h-5 w-5 text-primary" />}
              />
              <MetricCard
                title="Impressions"
                value={metrics.totalImpressions.toLocaleString()}
                change={metrics.impressionsChange}
                trend={metrics.impressionsChange > 0 ? 'up' : metrics.impressionsChange < 0 ? 'down' : 'neutral'}
                icon={<Users className="h-5 w-5 text-primary" />}
              />
              <MetricCard
                title="CTR moyen"
                value={`${metrics.avgCTR}%`}
                change={metrics.ctrChange}
                trend={metrics.ctrChange > 0 ? 'up' : metrics.ctrChange < 0 ? 'down' : 'neutral'}
                icon={<BarChart3 className="h-5 w-5 text-primary" />}
              />
              <MetricCard
                title="Position moyenne"
                value={metrics.avgPosition}
                change={metrics.positionChange}
                trend={metrics.positionChange > 0 ? 'up' : metrics.positionChange < 0 ? 'down' : 'neutral'}
                icon={<TrendingUp className="h-5 w-5 text-primary" />}
              />
            </div>
          )}

          {/* Charts */}
          {data.length > 0 && (
            <>
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Évolution des clics et impressions</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip
                      labelFormatter={(value) => new Date(value).toLocaleDateString('fr-FR')}
                      formatter={(value: any) => value.toLocaleString()}
                    />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="clicks"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.3}
                      name="Clics"
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="impressions"
                      stroke="hsl(var(--secondary))"
                      fill="hsl(var(--secondary))"
                      fillOpacity={0.3}
                      name="Impressions"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">CTR et Position moyenne</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" reversed />
                    <Tooltip
                      labelFormatter={(value) => new Date(value).toLocaleDateString('fr-FR')}
                      formatter={(value: any, name: string) =>
                        name === 'CTR' ? `${value.toFixed(2)}%` : value.toFixed(2)
                      }
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="ctr"
                      stroke="#10b981"
                      strokeWidth={2}
                      name="CTR (%)"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="position"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      name="Position"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </>
          )}
        </>
      )}

      {/* Add domain dialog */}
      <Dialog open={showAddDomainDialog} onOpenChange={setShowAddDomainDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un domaine</DialogTitle>
            <DialogDescription>
              Entrez le domaine que vous souhaitez connecter à Google Search Console
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="domain">Domaine</Label>
              <Input
                id="domain"
                placeholder="exemple.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Entrez uniquement le domaine (sans http:// ou https://)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDomainDialog(false)}>
              Annuler
            </Button>
            <Button onClick={addDomain}>
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Available sites dialog */}
      <Dialog open={showAvailableSitesDialog} onOpenChange={setShowAvailableSitesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sites disponibles dans Google Search Console</DialogTitle>
            <DialogDescription>
              Voici les domaines auxquels votre compte Google a accès dans Search Console
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {availableSites.length > 0 ? (
              <div className="space-y-2">
                {availableSites.map((site, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="font-medium">{site}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setNewDomain(site);
                        setShowAvailableSitesDialog(false);
                        setShowAddDomainDialog(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Ajouter
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                <p>Aucun site trouvé dans votre Google Search Console</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAvailableSitesDialog(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
