import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Megaphone, ExternalLink, Eye, Trash2, Copy } from 'lucide-react';
import { AdsCampaignWizard } from './AdsCampaignWizard';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTranslation } from '@/lib/language';

interface Campaign {
  id: string;
  name: string;
  campaign_type: 'product' | 'collection' | 'store';
  status: 'draft' | 'active' | 'paused';
  landing_page_url: string;
  products_count: number;
  collections_count: number;
  cta_text: string;
  headline: string;
  subheadline: string;
  created_at: string;
}

export function AdsCampaign() {
  const { t, language } = useTranslation();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ads_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns((data || []) as Campaign[]);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error(t.adsCampaign.toasts.campaignError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleDeleteCampaign = async (id: string) => {
    try {
      const { error } = await supabase
        .from('ads_campaigns')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success(t.adsCampaign.toasts.deleted);
      fetchCampaigns();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error(t.adsCampaign.toasts.deleteError);
    }
  };

  const handleDuplicateCampaign = async (campaign: Campaign) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { error } = await supabase
        .from('ads_campaigns')
        .insert({
          user_id: user.id,
          name: `${campaign.name} (Copie)`,
          campaign_type: campaign.campaign_type,
          cta_text: campaign.cta_text,
          headline: campaign.headline || '',
          subheadline: campaign.subheadline || '',
          status: 'draft' as const,
        });

      if (error) throw error;
      toast.success(t.adsCampaign.toasts.duplicated);
      fetchCampaigns();
    } catch (error) {
      console.error('Error duplicating campaign:', error);
      toast.error(t.adsCampaign.toasts.duplicateError);
    }
  };

  const getCampaignTypeLabel = (type: string) => {
    switch (type) {
      case 'product': return t.adsCampaign.types.product;
      case 'collection': return t.adsCampaign.types.collection;
      case 'store': return t.adsCampaign.types.store;
      default: return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">{t.adsCampaign.status.active}</Badge>;
      case 'paused':
        return <Badge variant="secondary">{t.adsCampaign.status.paused}</Badge>;
      default:
        return <Badge variant="outline">{t.adsCampaign.status.draft}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 dark:from-orange-950 dark:via-red-950 dark:to-pink-950 border-2 border-orange-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Megaphone className="w-6 h-6 text-orange-600" />
                <CardTitle className="text-2xl">{t.adsCampaign.title}</CardTitle>
              </div>
              <CardDescription className="text-base">
                {t.adsCampaign.description}
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowWizard(true)}
              size="lg"
              className="gap-2"
            >
              <Plus className="w-5 h-5" />
              {t.adsCampaign.buttons.new}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Campaigns Grid */}
      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Megaphone className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t.adsCampaign.empty.title}</h3>
            <p className="text-muted-foreground mb-6">
              {t.adsCampaign.empty.description}
            </p>
            <Button onClick={() => setShowWizard(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              {t.adsCampaign.empty.cta}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1">{campaign.name}</CardTitle>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary">
                        {getCampaignTypeLabel(campaign.campaign_type)}
                      </Badge>
                      {getStatusBadge(campaign.status)}
                    </div>
                  </div>
                </div>
                <CardDescription className="text-sm">
                  {t.adsCampaign.details.createdOn} {format(new Date(campaign.created_at), 'dd MMM yyyy', { locale: language === 'fr' ? fr : undefined })}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t.adsCampaign.details.products}</span>
                    <span className="ml-1 font-semibold">{campaign.products_count || 0}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t.adsCampaign.details.collections}</span>
                    <span className="ml-1 font-semibold">{campaign.collections_count || 0}</span>
                  </div>
                </div>

                {campaign.cta_text && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">{t.adsCampaign.details.cta}</span>
                    <p className="font-medium mt-1">"{campaign.cta_text}"</p>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1"
                    onClick={() => window.open(`/landing/${campaign.id}`, '_blank')}
                  >
                    <Eye className="w-4 h-4" />
                    {t.adsCampaign.buttons.view}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/landing/${campaign.id}`);
                      toast.success(t.adsCampaign.toasts.linkCopied);
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDuplicateCampaign(campaign)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteCampaign(campaign.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AdsCampaignWizard
        open={showWizard}
        onOpenChange={setShowWizard}
        onSuccess={fetchCampaigns}
      />
    </div>
  );
}
