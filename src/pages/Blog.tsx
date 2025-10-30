import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Sparkles, FileText, CalendarClock, PenSquare, Lightbulb, Link, Settings } from 'lucide-react';

import { NetlinkingTable } from '@/components/blog/NetlinkingTable';
import { OpportunitiesSettings } from '@/components/blog/OpportunitiesSettings';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { BlogWizard } from '@/components/blog/BlogWizard';
import { BlogOpportunities } from '@/components/blog/BlogOpportunities';
import { CampaignWizard } from '@/components/blog/CampaignWizard';
import { cn } from '@/lib/utils';

export default function Blog() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeSubtab, setActiveSubtab] = useState(searchParams.get('subtab') || 'articles');
  const [articles, setArticles] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [showCampaignWizard, setShowCampaignWizard] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const subtab = searchParams.get('subtab');
    
    if (subtab && ['articles', 'create-article', 'campaigns', 'opportunities', 'netlinking', 'settings'].includes(subtab)) {
      setActiveSubtab(subtab);
    }
  }, [searchParams]);

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

      // Load categories
      const { data: productsData } = await supabase
        .from('shopify_products')
        .select('category')
        .not('category', 'is', null);
      
      const uniqueCategories = [...new Set(productsData?.map(p => p.category).filter(Boolean))];
      setCategories(uniqueCategories as string[]);
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

  const blogSubmenu = [
    { 
      id: 'articles', 
      label: 'Gestion Articles', 
      icon: FileText, 
      description: 'Liste de vos articles' 
    },
    { 
      id: 'create-article', 
      label: 'Articles IA', 
      icon: Sparkles, 
      description: 'Créer un article avec l\'IA' 
    },
    { 
      id: 'campaigns', 
      label: 'Campagnes IA', 
      icon: CalendarClock, 
      description: 'Automatisation programmée' 
    },
    { 
      id: 'opportunities', 
      label: 'Opportunités', 
      icon: Lightbulb, 
      description: 'Idées de contenu'
    },
    { 
      id: 'netlinking', 
      label: 'Netlinking', 
      icon: Link, 
      description: 'Gestion des liens'
    },
    { 
      id: 'settings', 
      label: 'Paramètres', 
      icon: Settings, 
      description: 'Configuration'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          Blog SEO AI
        </h1>
        <p className="text-muted-foreground text-base md:text-lg">
          Créez des articles optimisés avec l'IA
        </p>
      </div>

      {/* Content */}
      {activeSubtab === 'articles' && (
        <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-100 dark:bg-cyan-900 rounded-lg">
            <FileText className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold">Gestion Articles</h2>
            <p className="text-sm text-muted-foreground">
              Consultez et gérez tous vos articles de blog
            </p>
          </div>
        </div>

        <Card className="p-6">
          {articles.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">Aucun article créé</p>
              <p className="text-sm text-muted-foreground">
                Utilisez "Articles IA" pour créer votre premier article
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article) => (
                <Card key={article.id} className="overflow-hidden hover:shadow-lg transition-all hover:scale-[1.02]">
                  <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                    <FileText className="w-16 h-16 text-primary" />
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={article.status === 'published' ? 'default' : 'secondary'}>
                        {article.status}
                      </Badge>
                      {article.meta_description && (
                        <Badge variant="outline" className="text-xs">
                          <Sparkles className="w-3 h-3 mr-1" />
                          SEO
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-lg mb-2 line-clamp-2">{article.title}</h3>
                    {article.meta_description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {article.meta_description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                      <span>{new Date(article.created_at).toLocaleDateString('fr-FR')}</span>
                      {article.keywords && article.keywords.length > 0 && (
                        <span>{article.keywords.length} mots-clés</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => window.open(`/article-landing/${article.id}`, '_blank')}
                      >
                        Voir
                      </Button>
                      {article.status === 'draft' && (
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleSyncArticle(article.id)}
                        >
                          Publier
                        </Button>
                      )}
                       {!article.meta_description && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="flex-1"
                          onClick={async () => {
                            try {
                              const { error } = await supabase.functions.invoke('generate-article-seo', {
                                body: { article_id: article.id }
                              });
                              if (error) throw error;
                              toast.success('SEO généré avec succès !');
                              loadData();
                            } catch (error: any) {
                              toast.error(error.message || 'Erreur lors de la génération SEO');
                            }
                          }}
                        >
                          <Sparkles className="w-3 h-3 mr-1" />
                          SEO
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>
        </div>
      )}

      {/* Articles IA - Création manuelle */}
      {activeSubtab === 'create-article' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">Créer un Article IA</h2>
              <p className="text-sm text-muted-foreground">
                Générez un article optimisé SEO en quelques clics avec l'intelligence artificielle
              </p>
            </div>
          </div>

          <Card className="p-8">
            <div className="max-w-2xl mx-auto text-center space-y-6">
              <div className="p-4 bg-primary/5 rounded-lg inline-block">
                <Sparkles className="w-16 h-16 text-primary mx-auto" />
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-2">
                  Assistant de Création d'Articles
                </h3>
                <p className="text-muted-foreground">
                  Notre IA vous guide pour créer un article optimisé en 3 étapes : 
                  choix du sujet, génération du contenu, et optimisation SEO
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-primary mb-2">1</div>
                  <div className="font-medium mb-1">Sujet & Mots-clés</div>
                  <div className="text-xs text-muted-foreground">
                    Définissez votre thématique
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-primary mb-2">2</div>
                  <div className="font-medium mb-1">Génération IA</div>
                  <div className="text-xs text-muted-foreground">
                    L'IA rédige votre article
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-primary mb-2">3</div>
                  <div className="font-medium mb-1">Publication</div>
                  <div className="text-xs text-muted-foreground">
                    Publiez sur Shopify
                  </div>
                </div>
              </div>

              <Button 
                size="lg" 
                onClick={() => setShowWizard(true)} 
                disabled={loading}
                className="mt-6"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Lancer l'Assistant de Création
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Opportunités */}
      {activeSubtab === 'opportunities' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                  <Lightbulb className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold">Opportunités de Contenu</h2>
                  <p className="text-sm text-muted-foreground">
                    Idées d'articles détectées automatiquement basées sur votre catalogue
                  </p>
                </div>
              </div>
              <BlogOpportunities />
            </div>
          )}

      {/* Netlinking */}
      {activeSubtab === 'netlinking' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Link className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold">Netlinking</h2>
                  <p className="text-sm text-muted-foreground">
                    Gérez vos liens internes et générez des articles optimisés
                  </p>
                </div>
              </div>
              <NetlinkingTable />
            </div>
          )}

      {/* Paramètres */}
      {activeSubtab === 'settings' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-900 rounded-lg">
                  <Settings className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold">Paramètres Blog</h2>
                  <p className="text-sm text-muted-foreground">
                    Configurez la génération automatique d'opportunités
                  </p>
                </div>
              </div>
              <OpportunitiesSettings />
            </div>
          )}

      {activeSubtab === 'campaigns' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <CalendarClock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">Campagnes IA Automatiques</h2>
              <p className="text-sm text-muted-foreground">
                Programmez la création automatique d'articles selon un calendrier défini
              </p>
            </div>
            <Button size="lg" onClick={() => setShowCampaignWizard(true)}>
              <Plus className="w-5 h-5 mr-2" />
              Créer Campagne
            </Button>
          </div>

          <Card className="p-6">
            {campaigns.length === 0 ? (
              <div className="text-center py-12">
                <CalendarClock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">Aucune campagne créée</p>
                <Button onClick={() => setShowCampaignWizard(true)}>
                  <Plus className="w-5 h-5 mr-2" />
                  Créer votre première campagne
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {campaigns.map((campaign) => (
                  <Card key={campaign.id} className="p-4 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{campaign.name}</h3>
                        <p className="text-sm text-muted-foreground">{campaign.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                            {campaign.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {campaign.frequency} • {campaign.articles_generated} articles
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Blog Wizard Modal */}
      {showWizard && (
        <BlogWizard
          onClose={() => {
            setShowWizard(false);
            loadData();
          }}
          categories={categories}
        />
      )}

      {/* Campaign Wizard Modal */}
      <CampaignWizard
        open={showCampaignWizard}
        onOpenChange={setShowCampaignWizard}
        onSuccess={loadData}
      />
    </div>
  );
}
