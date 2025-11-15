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
  Settings,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';

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
  const [alerts, setAlerts] = useState<any[]>([]);
  const [syncConfig, setSyncConfig] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [analyzingAnomalies, setAnalyzingAnomalies] = useState(false);

  useEffect(() => {
    checkGoogleConnection();
    loadDomains();
    handleOAuthCallback();
    loadSyncConfig();
  }, []);

  useEffect(() => {
    if (selectedDomain) {
      loadAlerts();
    }
  }, [selectedDomain]);

  const handleOAuthCallback = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      
      if (code && window.opener) {
        window.opener.postMessage({
          type: 'GOOGLE_OAUTH_CODE',
          code: code,
        }, window.location.origin);
        
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

      if (urlError || !urlData?.url) {
        throw new Error('Failed to generate OAuth URL');
      }

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

      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'GOOGLE_OAUTH_CODE' && event.data.code) {
          window.removeEventListener('message', handleMessage);

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

  const loadAlerts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('gsc_alerts')
        .select('*')
        .eq('user_id', user.id)
        .eq('domain', selectedDomain)
        .eq('is_resolved', false)
        .order('detection_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  };

  const loadSyncConfig = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('gsc_sync_config')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setSyncConfig(data);
    } catch (error) {
      console.error('Error loading sync config:', error);
    }
  };

  const analyzeAnomalies = async () => {
    if (!selectedDomain) return;

    try {
      setAnalyzingAnomalies(true);
      const { data, error } = await supabase.functions.invoke('analyze-gsc-anomalies', {
        body: {
          domain: selectedDomain,
          days: parseInt(dateRange)
        },
      });

      if (error) throw error;

      if (data?.summary?.total_alerts > 0) {
        toast.success(`${data.summary.total_alerts} alerte(s) détectée(s)`);
        await loadAlerts();
      } else {
        toast.success('Aucune anomalie détectée');
      }
    } catch (error: any) {
      console.error('Error analyzing anomalies:', error);
      toast.error('Erreur lors de l\'analyse des anomalies');
    } finally {
      setAnalyzingAnomalies(false);
    }
  };

  const updateSyncConfig = async (field: string, value: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('gsc_sync_config')
        .upsert({
          user_id: user.id,
          [field]: value,
        });

      if (error) throw error;

      setSyncConfig((prev: any) => ({ ...prev, [field]: value }));
      toast.success('Configuration mise à jour');
    } catch (error) {
      console.error('Error updating sync config:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const markAlertAsRead = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('gsc_alerts')
        .update({ is_read: true })
        .eq('id', alertId);

      if (error) throw error;
      await loadAlerts();
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('gsc_alerts')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;

      toast.success('Alerte résolue');
      await loadAlerts();
    } catch (error) {
      console.error('Error resolving alert:', error);
      toast.error('Erreur lors de la résolution');
    }
  };

  const loadSearchConsoleData = async () => {
    if (!selectedDomain) return;

    try {
      setLoading(true);
      console.log('Loading Search Console data for:', selectedDomain, 'days:', dateRange);

      const { data, error } = await supabase.functions.invoke('get-search-console-data', {
        body: {
          domain: selectedDomain,
          days: parseInt(dateRange),
        },
      });

      console.log('Search Console response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (!data?.data) {
        throw new Error('Aucune donnée reçue de Google Search Console');
      }

      setData(data.data);
      toast.success('Données chargées avec succès');
    } catch (error: any) {
      console.error('Error loading Search Console data:', error);
      const errorMessage = error?.message || 'Erreur lors du chargement des données';
      toast.error(errorMessage);
      setData([]);
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
    const positionChange = oldPosition > 0 ? ((oldPosition - recentPosition) / oldPosition) * 100 : 0;

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
              Connectez votre compte Google pour importer les données Search Console et suivre l'évolution de votre trafic et l'impact de vos optimisations SEO.
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
          {alerts.length > 0 && (
            <Card className="p-6 border-orange-200 bg-orange-50/50">
              <div className="flex items-start gap-4">
                <AlertCircle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2 text-orange-900">
                    Alertes détectées ({alerts.length})
                  </h3>
                  <div className="space-y-3">
                    {alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="flex items-start justify-between gap-4 p-3 bg-white rounded-lg border border-orange-200"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant={
                                alert.severity === 'critical'
                                  ? 'destructive'
                                  : alert.severity === 'high'
                                  ? 'default'
                                  : 'secondary'
                              }
                            >
                              {alert.severity === 'critical'
                                ? 'Critique'
                                : alert.severity === 'high'
                                ? 'Important'
                                : alert.severity === 'medium'
                                ? 'Moyen'
                                : 'Faible'}
                            </Badge>
                            <span className="font-medium text-sm">{alert.metric_name}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Baisse de {Math.abs(alert.change_percentage).toFixed(1)}% (
                            {alert.previous_value.toLocaleString()} → {alert.current_value.toLocaleString()})
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {!alert.is_read && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => markAlertAsRead(alert.id)}
                            >
                              Marquer lu
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resolveAlert(alert.id)}
                          >
                            Résoudre
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}

          <Card className="p-6">
            <div className="flex items-center justify-between">
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={analyzeAnomalies}
                  disabled={analyzingAnomalies}
                  className="gap-2"
                >
                  {analyzingAnomalies ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  Analyser les anomalies
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                Paramètres
              </Button>
            </div>

            {showSettings && (
              <div className="mt-6 pt-6 border-t space-y-4">
                <h4 className="font-semibold mb-4">Paramètres de synchronisation automatique</h4>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Synchronisation automatique</Label>
                    <p className="text-sm text-muted-foreground">
                      Synchroniser automatiquement les données quotidiennement
                    </p>
                  </div>
                  <Switch
                    checked={syncConfig?.auto_sync_enabled ?? true}
                    onCheckedChange={(checked) => updateSyncConfig('auto_sync_enabled', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Recevoir des notifications pour les alertes et synchronisations
                    </p>
                  </div>
                  <Switch
                    checked={syncConfig?.notification_enabled ?? true}
                    onCheckedChange={(checked) => updateSyncConfig('notification_enabled', checked)}
                  />
                </div>
                {syncConfig?.last_sync_at && (
                  <div className="text-sm text-muted-foreground">
                    Dernière synchronisation : {new Date(syncConfig.last_sync_at).toLocaleString('fr-FR')}
                  </div>
                )}
              </div>
            )}
          </Card>

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

          {loading && (
            <Card className="p-8">
              <div className="flex flex-col items-center justify-center gap-4">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Chargement des données de Google Search Console...</p>
              </div>
            </Card>
          )}

          {!loading && data.length === 0 && (
            <Card className="p-8 border-2 border-dashed">
              <div className="flex flex-col items-center justify-center gap-4 text-center max-w-2xl mx-auto">
                <div className="p-4 bg-primary/10 rounded-full">
                  <BarChart3 className="h-12 w-12 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">Aucune donnée Search Console</h3>
                  <p className="text-muted-foreground">
                    Les données Google Search Console n'ont pas encore été synchronisées pour ce domaine.
                  </p>
                  {!domains.find(d => d.domain === selectedDomain)?.verified && (
                    <div className="flex items-center gap-2 justify-center text-orange-600 mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <p className="text-sm font-medium">
                        Ce domaine n'est pas encore vérifié dans Google Search Console
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-3 w-full max-w-md">
                  <Button
                    onClick={loadSearchConsoleData}
                    size="lg"
                    className="gap-2 w-full"
                  >
                    <RefreshCw className="h-5 w-5" />
                    Charger les données depuis Google Search Console
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Cette action récupère vos statistiques de recherche directement depuis Google
                  </p>
                </div>
                <div className="mt-4 p-4 bg-muted/50 rounded-lg w-full">
                  <h4 className="font-medium mb-2 text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Comment ça marche ?
                  </h4>
                  <ol className="text-sm text-muted-foreground space-y-2 text-left list-decimal list-inside">
                    <li>Vérifiez que votre domaine est bien ajouté dans Google Search Console</li>
                    <li>Cliquez sur "Charger les données" pour synchroniser les statistiques</li>
                    <li>Les données seront mises à jour et affichées automatiquement</li>
                  </ol>
                </div>
              </div>
            </Card>
          )}

          {!loading && data.length > 0 && (
            <>
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Évolution des clics et impressions</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
                      }
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
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
                      }
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
            <Button onClick={addDomain}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
