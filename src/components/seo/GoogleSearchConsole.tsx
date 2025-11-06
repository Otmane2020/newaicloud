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
  const [newDomain, setNewDomain] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    checkGoogleConnection();
    loadDomains();
    handleOAuthCallback();
  }, []);

  const handleOAuthCallback = async () => {
    try {
      const isPending = sessionStorage.getItem('google_oauth_pending');
      if (!isPending) return;

      // Check if we have a session with provider token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.provider_token) {
        console.log('OAuth callback detected, storing token...');
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Store the OAuth tokens in profiles
        const { error } = await supabase
          .from('profiles')
          .update({
            google_oauth_token: session.provider_token,
            google_refresh_token: session.provider_refresh_token,
            google_token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
          })
          .eq('id', user.id);

        if (error) {
          console.error('Error storing OAuth token:', error);
          toast.error('Erreur lors de la sauvegarde du token Google');
        } else {
          console.log('OAuth token stored successfully');
          toast.success('Connexion à Google réussie !');
          setIsConnected(true);
        }

        sessionStorage.removeItem('google_oauth_pending');
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
        .select('google_oauth_token')
        .eq('id', user.id)
        .single();

      setIsConnected(!!profile?.google_oauth_token);
    } catch (error) {
      console.error('Error checking Google connection:', error);
    }
  };

  const connectWithGoogle = async () => {
    try {
      // Store a flag to handle the callback
      sessionStorage.setItem('google_oauth_pending', 'true');
      sessionStorage.setItem('oauth_return_tab', 'google-console');
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/webmasters.readonly',
          redirectTo: `${window.location.origin}/seo?tab=google-console`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
      toast.success('Connexion à Google en cours...');
    } catch (error) {
      console.error('Error connecting with Google:', error);
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

      // Validate domain format
      const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
      if (!domainRegex.test(newDomain)) {
        toast.error('Format de domaine invalide');
        return;
      }

      const { error } = await supabase
        .from('google_search_console_domains')
        .insert({
          user_id: user.id,
          domain: newDomain.toLowerCase(),
          verified: false,
        });

      if (error) throw error;

      toast.success('Domaine ajouté avec succès');
      setNewDomain('');
      setShowAddDomainDialog(false);
      loadDomains();
    } catch (error: any) {
      console.error('Error adding domain:', error);
      if (error.code === '23505') {
        toast.error('Ce domaine est déjà ajouté');
      } else {
        toast.error('Erreur lors de l\'ajout du domaine');
      }
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
            <Button
              onClick={connectWithGoogle}
              size="lg"
              className="gap-2"
            >
              <Globe className="h-5 w-5" />
              Se connecter avec Google
            </Button>
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
          </div>
          <div className="flex items-center gap-2">
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
    </div>
  );
}
