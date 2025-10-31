import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function LandingPage() {
  const { campaignId } = useParams();
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaignData();
  }, [campaignId]);

  const fetchCampaignData = async () => {
    try {
      if (!campaignId) return;

      const { data: campaignData, error } = await supabase
        .from('ads_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (error) throw error;
      setCampaign(campaignData);
    } catch (error) {
      console.error('Error fetching campaign:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Campagne introuvable</h1>
          <p className="text-muted-foreground">Cette landing page n'existe pas ou a été supprimée.</p>
        </div>
      </div>
    );
  }

  // If landing page HTML is generated, render it directly
  if (campaign.landing_page_html) {
    return (
      <div 
        dangerouslySetInnerHTML={{ __html: campaign.landing_page_html }}
        className="landing-page-container"
      />
    );
  }

  // Fallback message if HTML not generated yet
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4 bg-muted/30">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <div className="text-center space-y-2">
        <p className="text-xl font-semibold">
          Génération de la landing page en cours...
        </p>
        <p className="text-sm text-muted-foreground">
          Veuillez patienter quelques instants
        </p>
      </div>
    </div>
  );
}
