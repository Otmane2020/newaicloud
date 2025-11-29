import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  DollarSign, 
  Target, 
  Zap, 
  RefreshCw, 
  Download,
  MinusCircle,
  PlusCircle,
  Brain,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  LogOut,
  Loader2,
  Megaphone,
  Link2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/lib/language';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface SearchTerm {
  id: string;
  search_term: string;
  campaign_name: string;
  clicks: number;
  impressions: number;
  cost_micros: number;
  conversions: number;
  ctr: number;
  date: string;
}

interface ROASData {
  date: string;
  ad_cost: number;
  revenue: number;
  roas: number;
  installs: number;
  signups: number;
  paid_users: number;
}

interface NegativeKeyword {
  id: string;
  keyword: string;
  reason: string;
  is_applied: boolean;
}

interface SuggestedKeyword {
  id: string;
  keyword: string;
  suggested_match_type: string;
  search_volume: number;
  is_added: boolean;
}

interface Strategy {
  id: string;
  strategy_type: string;
  recommendation: string;
  impact_score: number;
  difficulty: string;
  is_applied: boolean;
}

export function GoogleAdsAdmin() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  
  // Connection states
  const [isConnected, setIsConnected] = useState(false);
  const [googleAdsEmail, setGoogleAdsEmail] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Data states
  const [searchTerms, setSearchTerms] = useState<SearchTerm[]>([]);
  const [roasData, setRoasData] = useState<ROASData[]>([]);
  const [negativeKeywords, setNegativeKeywords] = useState<NegativeKeyword[]>([]);
  const [suggestedKeywords, setSuggestedKeywords] = useState<SuggestedKeyword[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);

  // Metrics
  const [totalSpend, setTotalSpend] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [globalROAS, setGlobalROAS] = useState(0);
  const [totalClicks, setTotalClicks] = useState(0);
  const [totalConversions, setTotalConversions] = useState(0);

  useEffect(() => {
    checkConnection();
    handleOAuthCallback();
  }, []);

  useEffect(() => {
    if (isConnected) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [isConnected]);

  const handleOAuthCallback = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    // Si c'est une popup, envoyer le code au parent
    if (code && state === 'google_ads_admin' && window.opener) {
      window.opener.postMessage({
        type: 'GOOGLE_ADS_ADMIN_OAUTH_CODE',
        code: code,
      }, window.location.origin);
      setTimeout(() => window.close(), 1000);
      return;
    }
    
    // Si c'est la fenêtre principale (pas de popup), traiter directement le callback
    if (code && (state === 'google_ads_admin' || state?.includes('/superadmin'))) {
      console.log('🔑 [GOOGLE-ADS-ADMIN] Processing OAuth callback directly');
      
      try {
        const redirectUri = `${window.location.origin}/superadmin`;
        
        const { data, error } = await supabase.functions.invoke('google-oauth-token', {
          body: {
            code: code,
            state: redirectUri
          },
        });
        
        if (error || !data?.success) {
          console.error('❌ [GOOGLE-ADS-ADMIN] Token exchange failed:', error, data);
          toast({
            title: "Erreur de connexion",
            description: error?.message || data?.error || "Échec de l'authentification Google Ads",
            variant: "destructive"
          });
        } else {
          console.log('✅ [GOOGLE-ADS-ADMIN] Token exchange successful');
          toast({
            title: "Connexion réussie",
            description: "Compte Google Ads connecté avec succès"
          });
          checkConnection();
        }
        
        // Nettoyer l'URL des paramètres OAuth
        window.history.replaceState({}, document.title, window.location.pathname);
        
      } catch (err) {
        console.error('❌ [GOOGLE-ADS-ADMIN] OAuth callback error:', err);
        toast({
          title: "Erreur",
          description: "Impossible de finaliser la connexion",
          variant: "destructive"
        });
      }
    }
  };

  const checkConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use standard OAuth columns (same as user normal flow)
      const { data: profile } = await supabase
        .from('profiles')
        .select('google_oauth_token, google_console_email, google_ads_customer_id')
        .eq('id', user.id)
        .single();

      setIsConnected(!!profile?.google_oauth_token);
      setGoogleAdsEmail(profile?.google_console_email || null);
      setCustomerId(profile?.google_ads_customer_id || '');
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  };

  const connectWithGoogle = async () => {
    try {
      setIsConnecting(true);
      const redirectUri = `${window.location.origin}/superadmin`;
      
      // Use the SAME google-oauth-url function as normal users
      const { data: urlData, error: urlError } = await supabase.functions.invoke('google-oauth-url', {
        body: { 
          redirectUri,
          scopes: 'https://www.googleapis.com/auth/adwords https://www.googleapis.com/auth/userinfo.email',
          state: 'google_ads_admin' // Use fixed state for callback recognition
        },
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
        'Google Ads Authorization',
        `width=${width},height=${height},left=${left},top=${top}`
      );
      
      if (!popup || popup.closed) {
        toast({
          title: "Popup bloquée",
          description: "Autorisez les popups pour ce site",
          variant: "destructive"
        });
        setIsConnecting(false);
        return;
      }
      
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'GOOGLE_ADS_ADMIN_OAUTH_CODE' && event.data.code) {
          window.removeEventListener('message', handleMessage);
          
          // Use the SAME google-oauth-token function as normal users
          const { data, error } = await supabase.functions.invoke('google-oauth-token', {
            body: {
              code: event.data.code,
              state: redirectUri // Pass redirectUri as state for token exchange
            },
          });
          
          if (error || !data?.success) {
            toast({
              title: "Erreur de connexion",
              description: error?.message || "Échec de l'authentification",
              variant: "destructive"
            });
            setIsConnecting(false);
            return;
          }
          
          toast({
            title: "Connexion réussie",
            description: "Compte Google Ads connecté"
          });
          checkConnection();
          setIsConnecting(false);
        }
      };
      
      window.addEventListener('message', handleMessage);
      
      setTimeout(() => {
        window.removeEventListener('message', handleMessage);
        setIsConnecting(false);
      }, 5 * 60 * 1000);
      
    } catch (error) {
      console.error('Error connecting:', error);
      toast({
        title: "Erreur",
        description: "Impossible de se connecter à Google Ads",
        variant: "destructive"
      });
      setIsConnecting(false);
    }
  };

  const disconnectGoogle = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Clear standard OAuth columns
      const { error } = await supabase
        .from('profiles')
        .update({
          google_oauth_token: null,
          google_refresh_token: null,
          google_token_expires_at: null,
          google_console_email: null,
          google_ads_customer_id: null,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Déconnecté",
        description: "Compte Google Ads déconnecté"
      });
      setIsConnected(false);
      setGoogleAdsEmail(null);
      setCustomerId('');
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast({
        title: "Erreur",
        description: "Impossible de déconnecter",
        variant: "destructive"
      });
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Load search terms
      const { data: terms } = await supabase
        .from('google_ads_search_terms')
        .select('*')
        .order('date', { ascending: false })
        .limit(100);
      
      if (terms) {
        setSearchTerms(terms as SearchTerm[]);
        // Calculate totals
        const spend = terms.reduce((sum, t) => sum + (t.cost_micros || 0) / 1000000, 0);
        const clicks = terms.reduce((sum, t) => sum + (t.clicks || 0), 0);
        const conversions = terms.reduce((sum, t) => sum + (t.conversions || 0), 0);
        setTotalSpend(spend);
        setTotalClicks(clicks);
        setTotalConversions(conversions);
      }

      // Load ROAS data
      const { data: roas } = await supabase
        .from('google_ads_roas')
        .select('*')
        .order('date', { ascending: true })
        .limit(30);
      
      if (roas) {
        setRoasData(roas as ROASData[]);
        const revenue = roas.reduce((sum, r) => sum + (r.revenue || 0), 0);
        setTotalRevenue(revenue);
        setGlobalROAS(totalSpend > 0 ? revenue / totalSpend : 0);
      }

      // Load negative keywords
      const { data: negatives } = await supabase
        .from('google_ads_negative_keywords')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (negatives) setNegativeKeywords(negatives as NegativeKeyword[]);

      // Load suggested keywords
      const { data: suggested } = await supabase
        .from('google_ads_suggested_keywords')
        .select('*')
        .order('search_volume', { ascending: false });
      
      if (suggested) setSuggestedKeywords(suggested as SuggestedKeyword[]);

      // Load strategies
      const { data: strats } = await supabase
        .from('google_ads_strategies')
        .select('*')
        .order('impact_score', { ascending: false });
      
      if (strats) setStrategies(strats as Strategy[]);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const importSearchTerms = async () => {
    setImporting(true);
    try {
      const { error } = await supabase.functions.invoke('import-google-ads-search-terms');
      if (error) throw error;
      
      toast({
        title: t.superAdmin.googleAds?.importSuccess || "Import successful",
        description: t.superAdmin.googleAds?.searchTermsImported || "Search terms imported",
      });
      loadData();
    } catch (error: unknown) {
      toast({
        title: t.toasts.error.generic,
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const generateNegatives = async () => {
    try {
      const { error } = await supabase.functions.invoke('suggest-negative-keywords');
      if (error) throw error;
      
      toast({
        title: t.superAdmin.googleAds?.negativesGenerated || "Negatives generated",
        description: t.superAdmin.googleAds?.reviewSuggestions || "Review the suggestions below",
      });
      loadData();
    } catch (error: unknown) {
      toast({
        title: t.toasts.error.generic,
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const generateStrategy = async () => {
    try {
      const { error } = await supabase.functions.invoke('generate-ads-strategy');
      if (error) throw error;
      
      toast({
        title: t.superAdmin.googleAds?.strategyGenerated || "Strategy generated",
        description: t.superAdmin.googleAds?.aiAnalysisComplete || "AI analysis complete",
      });
      loadData();
    } catch (error: unknown) {
      toast({
        title: t.toasts.error.generic,
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const chartConfig = {
    cost: { label: "Coût", color: "hsl(var(--destructive))" },
    revenue: { label: "Revenus", color: "hsl(var(--primary))" },
    roas: { label: "ROAS", color: "hsl(var(--accent))" },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show connection UI if not connected
  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">
            {t.superAdmin.googleAds?.title || "Google Ads Optimizer"}
          </h1>
          <p className="text-muted-foreground">
            {t.superAdmin.googleAds?.description || "AI-powered campaign optimization for NewAI"}
          </p>
        </div>
        
        <Card className="p-8">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="p-4 bg-primary/10 rounded-full">
                <Megaphone className="h-12 w-12 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Connecter Google Ads</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Connectez votre compte Google Ads pour importer les campagnes, analyser les performances et optimiser avec l'IA.
              </p>
            </div>
            
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-sm text-left max-w-md mx-auto">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="font-medium text-foreground">Configuration requise</p>
                  <p className="text-muted-foreground">
                    Les credentials Google OAuth sont déjà configurés (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).
                    Cliquez ci-dessous pour autoriser l'accès à votre compte Google Ads.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Button
                onClick={connectWithGoogle}
                size="lg"
                className="gap-2"
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Link2 className="h-5 w-5" />
                )}
                {isConnecting ? "Connexion en cours..." : "Connecter Google Ads"}
              </Button>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>✓ Importer les campagnes et termes de recherche</p>
                <p>✓ Analyser ROAS et performances</p>
                <p>✓ Suggestions de mots-clés négatifs IA</p>
                <p>✓ Stratégies d'optimisation IA</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {t.superAdmin.googleAds?.title || "Google Ads Optimizer"}
          </h1>
          <p className="text-muted-foreground">
            {t.superAdmin.googleAds?.description || "AI-powered campaign optimization for NewAI"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t.superAdmin.googleAds?.refresh || "Refresh"}
          </Button>
          <Button onClick={importSearchTerms} disabled={importing}>
            {importing ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            {t.superAdmin.googleAds?.importData || "Import Data"}
          </Button>
        </div>
      </div>

      {/* Connection Status Card */}
      <Card className="border-green-500/50 bg-green-500/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Google Ads connecté</p>
                {googleAdsEmail && (
                  <p className="text-sm text-muted-foreground">{googleAdsEmail}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {customerId && (
                <Badge variant="outline">ID: {customerId}</Badge>
              )}
              <Button variant="ghost" size="sm" onClick={disconnectGoogle}>
                <LogOut className="h-4 w-4 mr-2" />
                Déconnecter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t.superAdmin.googleAds?.totalSpend || "Total Spend"}
                </p>
                <p className="text-2xl font-bold">{formatCurrency(totalSpend)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t.superAdmin.googleAds?.totalRevenue || "Revenue"}
                </p>
                <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ROAS</p>
                <p className="text-2xl font-bold">{globalROAS.toFixed(2)}x</p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t.superAdmin.googleAds?.clicks || "Clicks"}
                </p>
                <p className="text-2xl font-bold">{totalClicks.toLocaleString()}</p>
              </div>
              <Zap className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t.superAdmin.googleAds?.conversions || "Conversions"}
                </p>
                <p className="text-2xl font-bold">{totalConversions.toLocaleString()}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            {t.superAdmin.googleAds?.tabs?.overview || "Overview"}
          </TabsTrigger>
          <TabsTrigger value="search-terms">
            <Target className="h-4 w-4 mr-2" />
            {t.superAdmin.googleAds?.tabs?.searchTerms || "Search Terms"}
          </TabsTrigger>
          <TabsTrigger value="negatives">
            <MinusCircle className="h-4 w-4 mr-2" />
            {t.superAdmin.googleAds?.tabs?.negatives || "Negatives"}
          </TabsTrigger>
          <TabsTrigger value="keywords">
            <PlusCircle className="h-4 w-4 mr-2" />
            {t.superAdmin.googleAds?.tabs?.keywords || "Keywords"}
          </TabsTrigger>
          <TabsTrigger value="strategy">
            <Brain className="h-4 w-4 mr-2" />
            {t.superAdmin.googleAds?.tabs?.strategy || "AI Strategy"}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ROAS Chart */}
            <Card>
              <CardHeader>
                <CardTitle>{t.superAdmin.googleAds?.roasEvolution || "ROAS Evolution"}</CardTitle>
                <CardDescription>
                  {t.superAdmin.googleAds?.last30Days || "Last 30 days"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {roasData.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={roasData}>
                        <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area type="monotone" dataKey="roas" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.2)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    {t.superAdmin.googleAds?.noData || "No data available"}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cost vs Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle>{t.superAdmin.googleAds?.costVsRevenue || "Cost vs Revenue"}</CardTitle>
                <CardDescription>
                  {t.superAdmin.googleAds?.dailyComparison || "Daily comparison"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {roasData.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={roasData}>
                        <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString('fr-FR', { day: '2-digit' })} />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="ad_cost" fill="hsl(var(--destructive))" name="Coût" />
                        <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Revenus" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    {t.superAdmin.googleAds?.noData || "No data available"}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Search Terms Tab */}
        <TabsContent value="search-terms" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t.superAdmin.googleAds?.searchTermsReport || "Search Terms Report"}</CardTitle>
                  <CardDescription>
                    {t.superAdmin.googleAds?.searchTermsDesc || "All search queries triggering your ads"}
                  </CardDescription>
                </div>
                <Button onClick={importSearchTerms} disabled={importing}>
                  {importing ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                  {t.superAdmin.googleAds?.importSearchTerms || "Import"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {searchTerms.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">{t.superAdmin.googleAds?.term || "Term"}</th>
                        <th className="text-left p-3">{t.superAdmin.googleAds?.campaign || "Campaign"}</th>
                        <th className="text-right p-3">{t.superAdmin.googleAds?.clicks || "Clicks"}</th>
                        <th className="text-right p-3">{t.superAdmin.googleAds?.impressions || "Impr."}</th>
                        <th className="text-right p-3">CTR</th>
                        <th className="text-right p-3">{t.superAdmin.googleAds?.cost || "Cost"}</th>
                        <th className="text-right p-3">{t.superAdmin.googleAds?.conv || "Conv."}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchTerms.slice(0, 50).map((term) => (
                        <tr key={term.id} className="border-b hover:bg-muted/50">
                          <td className="p-3 font-medium">{term.search_term}</td>
                          <td className="p-3 text-muted-foreground">{term.campaign_name}</td>
                          <td className="p-3 text-right">{term.clicks}</td>
                          <td className="p-3 text-right">{term.impressions}</td>
                          <td className="p-3 text-right">{((term.ctr || 0) * 100).toFixed(2)}%</td>
                          <td className="p-3 text-right">{formatCurrency((term.cost_micros || 0) / 1000000)}</td>
                          <td className="p-3 text-right">{term.conversions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {t.superAdmin.googleAds?.noSearchTerms || "No search terms yet"}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {t.superAdmin.googleAds?.importToStart || "Import your Google Ads data to get started"}
                  </p>
                  <Button onClick={importSearchTerms} disabled={importing}>
                    <Download className="h-4 w-4 mr-2" />
                    {t.superAdmin.googleAds?.importNow || "Import Now"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Negatives Tab */}
        <TabsContent value="negatives" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t.superAdmin.googleAds?.negativeKeywords || "Negative Keywords"}</CardTitle>
                  <CardDescription>
                    {t.superAdmin.googleAds?.negativesDesc || "AI-suggested keywords to exclude"}
                  </CardDescription>
                </div>
                <Button onClick={generateNegatives}>
                  <Brain className="h-4 w-4 mr-2" />
                  {t.superAdmin.googleAds?.generateNegatives || "Generate with AI"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {negativeKeywords.length > 0 ? (
                <div className="space-y-3">
                  {negativeKeywords.map((kw) => (
                    <div key={kw.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <MinusCircle className="h-5 w-5 text-destructive" />
                        <div>
                          <p className="font-medium">{kw.keyword}</p>
                          <p className="text-sm text-muted-foreground">{kw.reason}</p>
                        </div>
                      </div>
                      <Badge variant={kw.is_applied ? "default" : "secondary"}>
                        {kw.is_applied ? t.superAdmin.googleAds?.applied || "Applied" : t.superAdmin.googleAds?.pending || "Pending"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <MinusCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {t.superAdmin.googleAds?.noNegatives || "No negative keywords yet"}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {t.superAdmin.googleAds?.aiWillAnalyze || "AI will analyze your search terms to find irrelevant queries"}
                  </p>
                  <Button onClick={generateNegatives}>
                    <Brain className="h-4 w-4 mr-2" />
                    {t.superAdmin.googleAds?.analyzeNow || "Analyze Now"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Keywords Tab */}
        <TabsContent value="keywords" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t.superAdmin.googleAds?.suggestedKeywords || "Suggested Keywords"}</CardTitle>
                  <CardDescription>
                    {t.superAdmin.googleAds?.keywordsDesc || "High-potential keywords to add to campaigns"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {suggestedKeywords.length > 0 ? (
                <div className="space-y-3">
                  {suggestedKeywords.map((kw) => (
                    <div key={kw.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <PlusCircle className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">{kw.keyword}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline">{kw.suggested_match_type}</Badge>
                            <span>{kw.search_volume?.toLocaleString()} vol.</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant={kw.is_added ? "default" : "secondary"}>
                        {kw.is_added ? t.superAdmin.googleAds?.added || "Added" : t.superAdmin.googleAds?.suggested || "Suggested"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <PlusCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {t.superAdmin.googleAds?.noSuggestions || "No suggestions yet"}
                  </h3>
                  <p className="text-muted-foreground">
                    {t.superAdmin.googleAds?.importFirst || "Import search terms first to get AI keyword suggestions"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Strategy Tab */}
        <TabsContent value="strategy" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t.superAdmin.googleAds?.aiStrategy || "AI Strategy Engine"}</CardTitle>
                  <CardDescription>
                    {t.superAdmin.googleAds?.strategyDesc || "Personalized optimization recommendations"}
                  </CardDescription>
                </div>
                <Button onClick={generateStrategy}>
                  <Brain className="h-4 w-4 mr-2" />
                  {t.superAdmin.googleAds?.generateStrategy || "Generate Strategy"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {strategies.length > 0 ? (
                <div className="space-y-4">
                  {strategies.map((strategy) => (
                    <Card key={strategy.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className={`p-2 rounded-lg ${
                              strategy.impact_score && strategy.impact_score >= 8 ? 'bg-primary/10' :
                              strategy.impact_score && strategy.impact_score >= 5 ? 'bg-orange-500/10' : 'bg-muted'
                            }`}>
                              {strategy.impact_score && strategy.impact_score >= 8 ? (
                                <ArrowUpRight className="h-5 w-5 text-primary" />
                              ) : strategy.impact_score && strategy.impact_score >= 5 ? (
                                <TrendingUp className="h-5 w-5 text-orange-500" />
                              ) : (
                                <Clock className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline">{strategy.strategy_type}</Badge>
                                <Badge variant={
                                  strategy.difficulty === 'easy' ? 'default' :
                                  strategy.difficulty === 'medium' ? 'secondary' : 'destructive'
                                }>
                                  {strategy.difficulty}
                                </Badge>
                              </div>
                              <p className="text-sm">{strategy.recommendation}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-primary">+{strategy.impact_score}%</p>
                            <p className="text-xs text-muted-foreground">
                              {t.superAdmin.googleAds?.potentialImpact || "potential impact"}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {t.superAdmin.googleAds?.noStrategy || "No strategy generated yet"}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {t.superAdmin.googleAds?.aiWillCreate || "AI will analyze your campaigns and create personalized recommendations"}
                  </p>
                  <Button onClick={generateStrategy}>
                    <Brain className="h-4 w-4 mr-2" />
                    {t.superAdmin.googleAds?.startAnalysis || "Start Analysis"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
