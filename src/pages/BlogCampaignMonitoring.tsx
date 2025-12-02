import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  CalendarClock, 
  AlertCircle, 
  CheckCircle2, 
  Play, 
  RefreshCw, 
  FileText,
  Search,
  Database,
  Zap,
  Edit,
  Package,
  ShoppingBag
} from 'lucide-react';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { useTranslation } from '@/lib/language';
import { CampaignEditDialog } from '@/components/blog/CampaignEditDialog';

interface Campaign {
  id: string;
  name: string;
  topic_niche: string;
  keywords: string[];
  frequency: string;
  is_active: boolean;
  next_execution_at: string;
  last_generation_date: string | null;
  created_at: string;
  store_id: string | null;
  collection_ids: string[] | null;
  product_ids: string[] | null;
  target_audience: string | null;
  auto_post: boolean;
  execution_hour: number;
}

interface Article {
  id: string;
  title: string;
  created_at: string;
  status: string;
}

export default function BlogCampaignMonitoring() {
  const { user } = useAuth();
  const { t, language } = useTranslation();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingCampaignId, setGeneratingCampaignId] = useState<string | null>(null);
  const [diagnosticResults, setDiagnosticResults] = useState<any>(null);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load campaigns
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('blog_campaigns')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (campaignsError) throw campaignsError;
      setCampaigns(campaignsData || []);

      // Load recent articles
      const { data: articlesData, error: articlesError } = await supabase
        .from('blog_articles')
        .select('id, title, created_at, status')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (articlesError) throw articlesError;
      setArticles(articlesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error(language === 'fr' ? 'Erreur de chargement des données' : 'Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const handleForceGeneration = async (campaign: Campaign) => {
    try {
      setGeneratingCampaignId(campaign.id);
      toast.info(language === 'fr' 
        ? `Génération d'article en cours pour "${campaign.name}"...` 
        : `Generating article for "${campaign.name}"...`
      );

      const { data, error } = await supabase.functions.invoke('generate-blog-article', {
        body: {
          user_id: user?.id,
          store_id: campaign.store_id,
          campaign_id: campaign.id,
          keywords: campaign.keywords,
          collection_ids: campaign.collection_ids,
          product_ids: campaign.product_ids,
          mode: 'manual'
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(language === 'fr' 
          ? `Article généré avec succès pour "${campaign.name}"` 
          : `Article generated successfully for "${campaign.name}"`
        );
        loadData();
      } else {
        throw new Error(data?.error || 'Generation failed');
      }
    } catch (error: any) {
      console.error('Error forcing generation:', error);
      toast.error(error.message || (language === 'fr' ? 'Erreur de génération' : 'Generation error'));
    } finally {
      setGeneratingCampaignId(null);
    }
  };

  const handleDiagnoseCampaign = async (campaign: Campaign) => {
    try {
      toast.info(language === 'fr' ? 'Diagnostic en cours...' : 'Diagnosing...');

      // Check matching products
      const { data: products, error: productsError } = await supabase
        .from('shopify_products')
        .select('id, title, category, product_type')
        .eq('seller_id', user?.id);

      if (productsError) throw productsError;

      const matchingProducts = products?.filter(p => {
        const searchText = `${p.title} ${p.category} ${p.product_type}`.toLowerCase();
        return campaign.keywords.some(keyword => 
          searchText.includes(keyword.toLowerCase())
        );
      });

      // Check last articles generated
      const { data: relatedArticles, error: articlesError } = await supabase
        .from('blog_articles')
        .select('id, title, created_at')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (articlesError) throw articlesError;

      setDiagnosticResults({
        campaign,
        matchingProducts: matchingProducts || [],
        recentArticles: relatedArticles || [],
      });

      toast.success(language === 'fr' ? 'Diagnostic terminé' : 'Diagnosis complete');
    } catch (error: any) {
      console.error('Error diagnosing campaign:', error);
      toast.error(error.message);
    }
  };

  const getCampaignStatus = (campaign: Campaign) => {
    if (!campaign.is_active) {
      return { label: language === 'fr' ? 'Inactive' : 'Inactive', variant: 'secondary' as const, icon: AlertCircle };
    }

    if (!campaign.last_generation_date) {
      return { label: language === 'fr' ? 'Jamais exécuté' : 'Never ran', variant: 'destructive' as const, icon: AlertCircle };
    }

    const nextExecution = new Date(campaign.next_execution_at);
    const isPastDue = nextExecution < new Date();

    if (isPastDue) {
      return { label: language === 'fr' ? 'En retard' : 'Overdue', variant: 'destructive' as const, icon: AlertCircle };
    }

    return { label: language === 'fr' ? 'Planifié' : 'Scheduled', variant: 'default' as const, icon: CheckCircle2 };
  };

  const getContentSummary = (campaign: Campaign) => {
    const parts = [];
    if (campaign.collection_ids && campaign.collection_ids.length > 0) {
      parts.push(`${campaign.collection_ids.length} collection(s)`);
    }
    if (campaign.product_ids && campaign.product_ids.length > 0) {
      parts.push(`${campaign.product_ids.length} produit(s)`);
    }
    if (parts.length === 0) {
      return language === 'fr' ? 'Génération automatique' : 'Auto generation';
    }
    return parts.join(', ');
  };