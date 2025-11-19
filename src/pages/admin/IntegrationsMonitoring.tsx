// Phase 4B: Dashboard Admin pour Monitoring des Intégrations
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, XCircle, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";

interface IntegrationStats {
  shopify_pending: number;
  shopify_expired: number;
  google_ads_failures_24h: number;
  google_merchant_failures_24h: number;
  total_failures_7d: number;
}

interface RecentFailure {
  id: string;
  integration_type: string;
  error_type: string;
  error_message: string;
  created_at: string;
  user_id: string;
}

export default function IntegrationsMonitoring() {
  const [stats, setStats] = useState<IntegrationStats | null>(null);
  const [recentFailures, setRecentFailures] = useState<RecentFailure[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    setLoading(true);
    try {
      // Stats Shopify pending connections
      const { data: pending, error: pendingError } = await supabase
        .from('shopify_pending_connections')
        .select('*', { count: 'exact', head: true })
        .eq('is_claimed', false);

      const { data: expired, error: expiredError } = await supabase
        .from('shopify_pending_connections')
        .select('*', { count: 'exact', head: true })
        .eq('is_claimed', false)
        .lt('expires_at', new Date().toISOString());

      // Stats échecs Google Ads (24h)
      const { data: googleAdsFailures, error: adsError } = await supabase
        .from('integration_failures')
        .select('*', { count: 'exact', head: true })
        .eq('integration_type', 'google_ads')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      // Stats échecs Google Merchant (24h)
      const { data: merchantFailures, error: merchantError } = await supabase
        .from('integration_failures')
        .select('*', { count: 'exact', head: true })
        .eq('integration_type', 'google_merchant')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      // Stats échecs totaux (7j)
      const { data: totalFailures, error: totalError } = await supabase
        .from('integration_failures')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      // Échecs récents
      const { data: failures, error: failuresError } = await supabase
        .from('integration_failures')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (pendingError || expiredError || adsError || merchantError || totalError || failuresError) {
        throw new Error('Failed to load stats');
      }

      setStats({
        shopify_pending: pending?.length || 0,
        shopify_expired: expired?.length || 0,
        google_ads_failures_24h: googleAdsFailures?.length || 0,
        google_merchant_failures_24h: merchantFailures?.length || 0,
        total_failures_7d: totalFailures?.length || 0,
      });

      setRecentFailures(failures || []);
    } catch (error) {
      console.error('Error loading stats:', error);
      toast.error("Erreur lors du chargement des statistiques");
    } finally {
      setLoading(false);
    }
  };

  const cleanupExpiredTokens = async () => {
    try {
      const { data, error } = await supabase.rpc('cleanup_expired_shopify_tokens');
      
      if (error) throw error;
      
      toast.success(`${data} tokens expirés nettoyés`);
      loadStats();
    } catch (error) {
      console.error('Cleanup error:', error);
      toast.error("Erreur lors du nettoyage");
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Monitoring des Intégrations</h1>
          <p className="text-muted-foreground">Suivi en temps réel des connexions tierces</p>
        </div>
        <Button onClick={loadStats} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Shopify Stats */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connexions Shopify en attente</CardTitle>
            {stats && stats.shopify_pending > 0 ? (
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.shopify_pending || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.shopify_expired || 0} expirées
            </p>
            {stats && stats.shopify_expired > 0 && (
              <Button onClick={cleanupExpiredTokens} size="sm" variant="outline" className="mt-2">
                Nettoyer les tokens expirés
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Google Ads Failures */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Échecs Google Ads (24h)</CardTitle>
            {stats && stats.google_ads_failures_24h > 5 ? (
              <TrendingUp className="h-4 w-4 text-red-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-green-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.google_ads_failures_24h || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Dernières 24 heures
            </p>
          </CardContent>
        </Card>

        {/* Google Merchant Failures */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Échecs Google Merchant (24h)</CardTitle>
            {stats && stats.google_merchant_failures_24h > 5 ? (
              <TrendingUp className="h-4 w-4 text-red-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-green-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.google_merchant_failures_24h || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Dernières 24 heures
            </p>
          </CardContent>
        </Card>

        {/* Total Failures */}
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total des échecs (7 jours)</CardTitle>
            {stats && stats.total_failures_7d > 20 ? (
              <XCircle className="h-4 w-4 text-red-500" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_failures_7d || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Toutes intégrations confondues
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Failures Table */}
      <Card>
        <CardHeader>
          <CardTitle>Échecs Récents</CardTitle>
          <CardDescription>Les 20 dernières erreurs d'intégration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentFailures.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun échec récent</p>
            ) : (
              recentFailures.map((failure) => (
                <div key={failure.id} className="flex items-start gap-4 border-b pb-4">
                  <XCircle className="h-5 w-5 text-red-500 mt-1" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{failure.integration_type}</Badge>
                      <Badge variant="secondary">{failure.error_type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{failure.error_message}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(failure.created_at).toLocaleString('fr-FR')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
