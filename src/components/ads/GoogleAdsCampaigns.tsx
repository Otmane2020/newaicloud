import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Sparkles, Download, RefreshCw, TrendingUp, Eye, MousePointerClick } from 'lucide-react';
import { useTranslation } from '@/lib/language';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface GoogleAdsCampaign {
  id: string;
  campaign_id: string;
  name: string;
  status: string;
  advertising_channel_type: string;
  impressions: number;
  clicks: number;
  cost_micros: number;
  currency: string;
  last_sync_at: string;
}

export function GoogleAdsCampaigns() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<GoogleAdsCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (user) {
        loadCampaigns();
      } else {
        setCampaigns([]);
        setLoading(false);
      }
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [user]);

  const loadCampaigns = async () => {
    if (!user?.id) {
      setCampaigns([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('google_ads_campaigns')
        .select('*')
        .eq('user_id', user.id)
        .order('last_sync_at', { ascending: false });

      if (error) throw error;

      setCampaigns(data || []);
    } catch (error: any) {
      console.error('[GoogleAdsCampaigns] Error loading campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const importCampaigns = async () => {
    try {
      setImporting(true);
      const toastId = toast.loading('🔄 Import des campagnes Google Ads...');

      console.log('[GoogleAdsCampaigns] 🔵 Calling list-google-ads-campaigns...');
      const { data, error } = await supabase.functions.invoke('list-google-ads-campaigns');

      if (error) {
        console.error('[GoogleAdsCampaigns] ❌ Error:', error);
        throw error;
      }

      console.log('[GoogleAdsCampaigns] ✅ Response:', data);

      if (!data?.success) {
        toast.error(data?.error || 'Erreur lors de l\'import', { id: toastId });
        return;
      }

      toast.success(`✅ ${data.count || 0} campagne(s) importée(s)`, { id: toastId });
      await loadCampaigns();
    } catch (error: any) {
      console.error('[GoogleAdsCampaigns] Error importing:', error);
      toast.error(error.message || 'Erreur lors de l\'import des campagnes');
    } finally {
      setImporting(false);
    }
  };

  const formatCurrency = (costMicros: number, currency: string = 'EUR') => {
    const amount = costMicros / 1000000; // Convert micros to standard currency
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('fr-FR').format(num);
  };

  const getCTR = (clicks: number, impressions: number) => {
    if (impressions === 0) return '0%';
    return ((clicks / impressions) * 100).toFixed(2) + '%';
  };

  const getChannelTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'SEARCH': 'Recherche',
      'DISPLAY': 'Display',
      'SHOPPING': 'Shopping',
      'VIDEO': 'Vidéo',
      'MULTI_CHANNEL': 'Multi-canal',
      'UNSPECIFIED': 'Non spécifié',
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      'ENABLED': { variant: 'default', label: 'Active' },
      'PAUSED': { variant: 'secondary', label: 'En pause' },
      'REMOVED': { variant: 'destructive', label: 'Supprimée' },
      'UNKNOWN': { variant: 'outline', label: 'Inconnu' },
    };
    const config = variants[status] || { variant: 'outline' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (campaigns.length === 0 && !loading) {
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold">{t.googleAds.campaigns.title}</h3>
              <p className="text-sm text-muted-foreground">{t.googleAds.campaigns.subtitle}</p>
            </div>
            <Button className="gap-2" onClick={importCampaigns} disabled={importing}>
              {importing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Importer mes campagnes
            </Button>
          </div>

          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t.googleAds.campaigns.firstCampaign}</h3>
            <p className="text-muted-foreground mb-4">
              {t.googleAds.campaigns.firstCampaignDesc}
            </p>
            <Button variant="outline" className="gap-2" onClick={importCampaigns} disabled={importing}>
              {importing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {t.googleAds.campaigns.createWithAI}
            </Button>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
          <h3 className="font-semibold mb-3">{t.googleAds.campaigns.upcomingFeatures.title}</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              {t.googleAds.campaigns.upcomingFeatures.feature1}
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              {t.googleAds.campaigns.upcomingFeatures.feature2}
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              {t.googleAds.campaigns.upcomingFeatures.feature3}
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              {t.googleAds.campaigns.upcomingFeatures.feature4}
            </li>
          </ul>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">{t.googleAds.campaigns.title}</h3>
            <p className="text-sm text-muted-foreground">
              {campaigns.length} campagne(s) importée(s)
            </p>
          </div>
          <Button variant="outline" className="gap-2" onClick={importCampaigns} disabled={importing}>
            {importing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Actualiser
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Impressions</p>
                <p className="text-xl font-bold">
                  {formatNumber(campaigns.reduce((sum, c) => sum + c.impressions, 0))}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <MousePointerClick className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Clics</p>
                <p className="text-xl font-bold">
                  {formatNumber(campaigns.reduce((sum, c) => sum + c.clicks, 0))}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Eye className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CTR Moyen</p>
                <p className="text-xl font-bold">
                  {getCTR(
                    campaigns.reduce((sum, c) => sum + c.clicks, 0),
                    campaigns.reduce((sum, c) => sum + c.impressions, 0)
                  )}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Coût Total</p>
                <p className="text-xl font-bold">
                  {formatCurrency(campaigns.reduce((sum, c) => sum + c.cost_micros, 0))}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Campaigns Table */}
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom de la campagne</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Impressions</TableHead>
                <TableHead className="text-right">Clics</TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead className="text-right">Coût</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{getChannelTypeLabel(campaign.advertising_channel_type)}</Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                  <TableCell className="text-right">{formatNumber(campaign.impressions)}</TableCell>
                  <TableCell className="text-right">{formatNumber(campaign.clicks)}</TableCell>
                  <TableCell className="text-right">{getCTR(campaign.clicks, campaign.impressions)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(campaign.cost_micros, campaign.currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
        <h3 className="font-semibold mb-3">{t.googleAds.campaigns.upcomingFeatures.title}</h3>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            {t.googleAds.campaigns.upcomingFeatures.feature1}
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            {t.googleAds.campaigns.upcomingFeatures.feature2}
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            {t.googleAds.campaigns.upcomingFeatures.feature3}
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            {t.googleAds.campaigns.upcomingFeatures.feature4}
          </li>
        </ul>
      </Card>
    </div>
  );
}
