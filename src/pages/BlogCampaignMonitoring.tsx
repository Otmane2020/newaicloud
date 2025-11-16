import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Zap
} from 'lucide-react';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { useTranslation } from '@/lib/language';

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
          campaign_id: campaign.id, // 🔥 Send campaign_id instead
          keywords: campaign.keywords,
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

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-2">
            {language === 'fr' ? '📊 Suivi des Campagnes Blog' : '📊 Blog Campaign Monitoring'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'fr' 
              ? 'Surveillez vos campagnes automatiques, forcez des générations et diagnostiquez les problèmes' 
              : 'Monitor your automated campaigns, force generations and diagnose issues'}
          </p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          {language === 'fr' ? 'Actualiser' : 'Refresh'}
        </Button>
      </div>

      <Tabs defaultValue="campaigns" className="space-y-6">
        <TabsList>
          <TabsTrigger value="campaigns">
            <CalendarClock className="w-4 h-4 mr-2" />
            {language === 'fr' ? 'Campagnes' : 'Campaigns'} ({campaigns.length})
          </TabsTrigger>
          <TabsTrigger value="articles">
            <FileText className="w-4 h-4 mr-2" />
            {language === 'fr' ? 'Articles Récents' : 'Recent Articles'} ({articles.length})
          </TabsTrigger>
          {diagnosticResults && (
            <TabsTrigger value="diagnostic">
              <Search className="w-4 h-4 mr-2" />
              {language === 'fr' ? 'Diagnostic' : 'Diagnostic'}
            </TabsTrigger>
          )}
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          {campaigns.length === 0 ? (
            <Card className="p-12 text-center">
              <CalendarClock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                {language === 'fr' 
                  ? 'Aucune campagne trouvée. Créez votre première campagne automatique !' 
                  : 'No campaigns found. Create your first automated campaign!'}
              </p>
            </Card>
          ) : (
            campaigns.map((campaign) => {
              const status = getCampaignStatus(campaign);
              const StatusIcon = status.icon;
              
              return (
                <Card key={campaign.id} className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold">{campaign.name}</h3>
                        <Badge variant={status.variant}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </Badge>
                        <Badge variant="outline">{campaign.frequency}</Badge>
                      </div>

                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4" />
                          <span><strong>{language === 'fr' ? 'Sujet' : 'Topic'}:</strong> {campaign.topic_niche}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4" />
                          <span><strong>{language === 'fr' ? 'Mots-clés' : 'Keywords'}:</strong> {campaign.keywords.join(', ')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CalendarClock className="w-4 h-4" />
                          <span>
                            <strong>{language === 'fr' ? 'Prochain article' : 'Next article'}:</strong>{' '}
                            {format(new Date(campaign.next_execution_at), 'PPP à HH:mm', { 
                              locale: language === 'fr' ? fr : enUS 
                            })}
                          </span>
                        </div>
                        {campaign.last_generation_date && (
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>
                              <strong>{language === 'fr' ? 'Dernière génération' : 'Last generation'}:</strong>{' '}
                              {format(new Date(campaign.last_generation_date), 'PPP à HH:mm', { 
                                locale: language === 'fr' ? fr : enUS 
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => handleForceGeneration(campaign)}
                        disabled={generatingCampaignId === campaign.id}
                        size="sm"
                      >
                        {generatingCampaignId === campaign.id ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4 mr-2" />
                        )}
                        {language === 'fr' ? 'Générer maintenant' : 'Generate now'}
                      </Button>
                      <Button
                        onClick={() => handleDiagnoseCampaign(campaign)}
                        variant="outline"
                        size="sm"
                      >
                        <Search className="w-4 h-4 mr-2" />
                        {language === 'fr' ? 'Diagnostiquer' : 'Diagnose'}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Articles Tab */}
        <TabsContent value="articles">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {language === 'fr' ? 'Derniers articles générés' : 'Latest generated articles'}
            </h3>
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {articles.map((article) => (
                  <Card key={article.id} className="p-4 border-l-4 border-l-primary">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium">{article.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {format(new Date(article.created_at), 'PPP à HH:mm', { 
                            locale: language === 'fr' ? fr : enUS 
                          })}
                        </p>
                        <Badge variant="outline" className="mt-2">
                          {article.status}
                        </Badge>
                      </div>
                      <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                    </div>
                  </Card>
                ))}
                {articles.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    {language === 'fr' ? 'Aucun article généré' : 'No articles generated'}
                  </p>
                )}
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>

        {/* Diagnostic Tab */}
        {diagnosticResults && (
          <TabsContent value="diagnostic">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                {language === 'fr' 
                  ? `Diagnostic: ${diagnosticResults.campaign.name}` 
                  : `Diagnosis: ${diagnosticResults.campaign.name}`}
              </h3>

              <div className="space-y-6">
                {/* Matching Products */}
                <div>
                  <h4 className="font-semibold mb-2">
                    {language === 'fr' ? 'Produits correspondants' : 'Matching products'}
                  </h4>
                  {diagnosticResults.matchingProducts.length > 0 ? (
                    <div className="space-y-2">
                      {diagnosticResults.matchingProducts.map((p: any) => (
                        <Card key={p.id} className="p-3 border-l-4 border-l-green-500">
                          <p className="font-medium text-sm">{p.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.category} • {p.product_type}
                          </p>
                        </Card>
                      ))}
                      <Badge variant="default" className="bg-green-500">
                        ✅ {diagnosticResults.matchingProducts.length}{' '}
                        {language === 'fr' ? 'produits trouvés' : 'products found'}
                      </Badge>
                    </div>
                  ) : (
                    <Card className="p-4 border-l-4 border-l-red-500">
                      <p className="text-sm text-red-600">
                        ⚠️ {language === 'fr' 
                          ? 'Aucun produit ne correspond aux mots-clés de cette campagne' 
                          : 'No products match the keywords for this campaign'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {language === 'fr' 
                          ? 'Mots-clés: ' + diagnosticResults.campaign.keywords.join(', ')
                          : 'Keywords: ' + diagnosticResults.campaign.keywords.join(', ')}
                      </p>
                    </Card>
                  )}
                </div>

                {/* Recent Articles */}
                <div>
                  <h4 className="font-semibold mb-2">
                    {language === 'fr' ? 'Articles récents' : 'Recent articles'}
                  </h4>
                  <div className="space-y-2">
                    {diagnosticResults.recentArticles.map((article: any) => (
                      <Card key={article.id} className="p-3 border-l-4 border-l-blue-500">
                        <p className="font-medium text-sm">{article.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(article.created_at), 'PPP', { 
                            locale: language === 'fr' ? fr : enUS 
                          })}
                        </p>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
