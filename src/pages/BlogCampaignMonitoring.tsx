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
  Edit
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
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: campaignsData, error: campaignsError } = await supabase
        .from('blog_campaigns')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (campaignsError) throw campaignsError;
      setCampaigns(campaignsData || []);

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
      toast.error(t.blogCampaigns.toasts.loadError);
    } finally {
      setLoading(false);
    }
  };

  const handleForceGeneration = async (campaign: Campaign) => {
    try {
      setGeneratingCampaignId(campaign.id);
      toast.info(t.blogCampaigns.toasts.generating.replace('{{name}}', campaign.name));

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
        toast.success(t.blogCampaigns.toasts.generated.replace('{{name}}', campaign.name));
        loadData();
      } else {
        throw new Error(data?.error || 'Generation failed');
      }
    } catch (error: any) {
      console.error('Error forcing generation:', error);
      toast.error(error.message || t.blogCampaigns.toasts.generationError);
    } finally {
      setGeneratingCampaignId(null);
    }
  };

  const getCampaignStatus = (campaign: Campaign) => {
    if (!campaign.is_active) {
      return { label: t.blogCampaigns.status.inactive, variant: 'secondary' as const, icon: AlertCircle };
    }

    if (!campaign.last_generation_date) {
      return { label: t.blogCampaigns.status.neverRan, variant: 'destructive' as const, icon: AlertCircle };
    }

    const nextExecution = new Date(campaign.next_execution_at);
    const isPastDue = nextExecution < new Date();

    if (isPastDue) {
      return { label: t.blogCampaigns.status.overdue, variant: 'destructive' as const, icon: AlertCircle };
    }

    return { label: t.blogCampaigns.status.scheduled, variant: 'default' as const, icon: CheckCircle2 };
  };

  const getContentSummary = (campaign: Campaign) => {
    const parts = [];
    if (campaign.collection_ids && campaign.collection_ids.length > 0) {
      parts.push(`${campaign.collection_ids.length} ${t.blogCampaigns.contentSummary.collections}`);
    }
    if (campaign.product_ids && campaign.product_ids.length > 0) {
      parts.push(`${campaign.product_ids.length} ${t.blogCampaigns.contentSummary.products}`);
    }
    if (parts.length === 0) {
      return t.blogCampaigns.contentSummary.autoGeneration;
    }
    return parts.join(', ');
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t.blogCampaigns.title}</h1>
          <p className="text-muted-foreground mt-1">{t.blogCampaigns.subtitle}</p>
        </div>
      </div>

      <Tabs defaultValue="campaigns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="campaigns">
            <CalendarClock className="w-4 h-4 mr-2" />
            {t.blogCampaigns.tabs.campaigns} ({campaigns.length})
          </TabsTrigger>
          <TabsTrigger value="articles">
            <FileText className="w-4 h-4 mr-2" />
            {t.blogCampaigns.tabs.recentArticles} ({articles.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          {campaigns.length === 0 ? (
            <Card className="p-12 text-center">
              <CalendarClock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">{t.blogCampaigns.empty.campaigns}</p>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.blogCampaigns.table.campaign}</TableHead>
                    <TableHead>{t.blogCampaigns.table.frequency}</TableHead>
                    <TableHead>{t.blogCampaigns.table.content}</TableHead>
                    <TableHead>{t.blogCampaigns.table.next}</TableHead>
                    <TableHead>{t.blogCampaigns.table.status}</TableHead>
                    <TableHead>{t.blogCampaigns.table.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => {
                    const status = getCampaignStatus(campaign);
                    const StatusIcon = status.icon;
                    
                    return (
                      <TableRow 
                        key={campaign.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setEditingCampaign(campaign)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-semibold">{campaign.name}</p>
                            <p className="text-xs text-muted-foreground">{campaign.topic_niche}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{campaign.frequency}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{getContentSummary(campaign)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {format(new Date(campaign.next_execution_at), 'dd/MM HH:mm')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              onClick={() => handleForceGeneration(campaign)}
                              disabled={generatingCampaignId === campaign.id}
                              size="sm"
                              variant="outline"
                            >
                              {generatingCampaignId === campaign.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              onClick={() => setEditingCampaign(campaign)}
                              size="sm"
                              variant="outline"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="articles" className="space-y-4">
          {articles.length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">{t.blogCampaigns.empty.articles}</p>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.blogCampaigns.table.title}</TableHead>
                    <TableHead>{t.blogCampaigns.table.createdAt}</TableHead>
                    <TableHead>{t.blogCampaigns.table.status}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {articles.map((article) => (
                    <TableRow key={article.id}>
                      <TableCell className="font-medium">{article.title}</TableCell>
                      <TableCell>
                        {format(new Date(article.created_at), 'PPP', { 
                          locale: language === 'fr' ? fr : enUS 
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={article.status === 'published' ? 'default' : 'secondary'}>
                          {article.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <CampaignEditDialog
        campaign={editingCampaign}
        open={!!editingCampaign}
        onOpenChange={(open) => !open && setEditingCampaign(null)}
        onSuccess={loadData}
      />
    </div>
  );
}
