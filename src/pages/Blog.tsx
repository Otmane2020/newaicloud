import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Sparkles, FileText, CalendarClock, PenSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useLocation } from 'react-router-dom';

export default function Blog() {
  const { user } = useAuth();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const defaultTab = searchParams.get('tab') || 'articles';
  const [articles, setArticles] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      const { data: articlesData, error: articlesError } = await supabase
        .from('blog_articles')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (articlesError) throw articlesError;
      setArticles(articlesData || []);

      const { data: campaignsData, error: campaignsError } = await supabase
        .from('blog_campaigns')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (campaignsError) throw campaignsError;
      setCampaigns(campaignsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle p-8">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <FileText className="w-10 h-10 text-primary" />
            Blog SEO AI
          </h1>
          <p className="text-muted-foreground text-lg">
            Créez des articles optimisés avec l'IA
          </p>
        </div>

        <Tabs defaultValue={defaultTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="articles" className="flex items-center gap-2">
              <PenSquare className="w-4 h-4" />
              Articles
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4" />
              Campagnes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="articles">
            <Card className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Articles de Blog</h2>
                <Button size="lg">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Créer Article IA
                </Button>
              </div>

              {articles.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">Aucun article</p>
                  <Button>
                    <Plus className="w-5 h-5 mr-2" />
                    Créer votre premier article
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {articles.map((article) => (
                    <Card key={article.id} className="p-4">
                      <h3 className="font-semibold">{article.title}</h3>
                      <Badge variant="secondary">{article.status}</Badge>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="campaigns">
            <Card className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Campagnes Auto</h2>
                <Button size="lg">
                  <Plus className="w-5 h-5 mr-2" />
                  Créer Campagne
                </Button>
              </div>

              {campaigns.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">Aucune campagne</p>
                  <Button>
                    <Plus className="w-5 h-5 mr-2" />
                    Créer campagne
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {campaigns.map((campaign) => (
                    <Card key={campaign.id} className="p-4">
                      <h3 className="font-semibold">{campaign.name}</h3>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}