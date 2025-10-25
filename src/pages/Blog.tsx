import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Sparkles, FileText, CalendarClock, PenSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function Blog() {
  const { user } = useAuth();
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

  const handleCreateArticle = async () => {
    try {
      setLoading(true);
      toast.info('Génération de l\'article en cours...');

      const { data, error } = await supabase.functions.invoke('generate-blog-article', {
        body: {
          user_id: user?.id,
          title: 'Guide Complet pour Bien Choisir',
          keywords: ['guide', 'comparatif', 'conseils'],
          mode: 'manual'
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Article généré avec succès !');
        loadData();
      } else {
        throw new Error(data?.error || 'Erreur lors de la génération');
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Erreur lors de la génération');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncArticle = async (articleId: string) => {
    try {
      toast.info('Synchronisation avec Shopify...');

      const { data, error } = await supabase.functions.invoke('sync-blog-to-shopify', {
        body: { articleId }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Article publié sur Shopify !');
        loadData();
      } else {
        throw new Error(data?.error || 'Erreur lors de la synchronisation');
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Erreur lors de la synchronisation');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          <FileText className="w-10 h-10 text-primary" />
          Blog SEO AI
        </h1>
        <p className="text-muted-foreground text-lg">
          Créez des articles optimisés avec l'IA
        </p>
      </div>

      {/* Articles Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-100 dark:bg-cyan-900 rounded-lg">
            <PenSquare className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold">Articles de Blog</h2>
            <p className="text-sm text-muted-foreground">
              Gérez et publiez vos articles de blog
            </p>
          </div>
          <Button size="lg" onClick={handleCreateArticle} disabled={loading}>
            <Sparkles className="w-5 h-5 mr-2" />
            {loading ? 'Génération...' : 'Créer Article IA'}
          </Button>
        </div>

        <Card className="p-6">
          {articles.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">Aucun article</p>
              <Button onClick={handleCreateArticle} disabled={loading}>
                <Plus className="w-5 h-5 mr-2" />
                Créer votre premier article
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {articles.map((article) => (
                <Card key={article.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{article.title}</h3>
                        <Badge variant={article.status === 'published' ? 'default' : 'secondary'}>
                          {article.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(article.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    {article.status === 'draft' && (
                      <Button
                        size="sm"
                        onClick={() => handleSyncArticle(article.id)}
                      >
                        Publier sur Shopify
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Campaigns Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
            <CalendarClock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold">Campagnes Auto</h2>
            <p className="text-sm text-muted-foreground">
              Automatisez la création de contenu avec des campagnes
            </p>
          </div>
          <Button size="lg">
            <Plus className="w-5 h-5 mr-2" />
            Créer Campagne
          </Button>
        </div>

        <Card className="p-6">
          {campaigns.length === 0 ? (
            <div className="text-center py-12">
              <CalendarClock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">Aucune campagne</p>
              <Button>
                <Plus className="w-5 h-5 mr-2" />
                Créer campagne automatique
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <Card key={campaign.id} className="p-4">
                  <h3 className="font-semibold">{campaign.name}</h3>
                  <Badge variant={campaign.is_active ? 'default' : 'secondary'}>
                    {campaign.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </Card>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
