import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Sparkles, FileText, CalendarClock, PenSquare, Lightbulb, Link, Settings } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'articles');
  const [activeSubtab, setActiveSubtab] = useState(searchParams.get('subtab') || 'opportunities');
  const [articles, setArticles] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [showCampaignWizard, setShowCampaignWizard] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    const subtab = searchParams.get('subtab');
    
    if (tab && ['articles', 'campaigns', 'blog'].includes(tab)) {
      setActiveTab(tab);
      
      // Si on est sur l'onglet "blog", gérer le sous-onglet
      if (tab === 'blog' && subtab && ['opportunities', 'netlinking', 'settings'].includes(subtab)) {
        setActiveSubtab(subtab);
      }
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

  const tabs = [
    { 
      id: 'articles', 
      label: 'Articles', 
      icon: PenSquare, 
      description: 'Gérer vos articles' 
    },
    { 
      id: 'campaigns', 
      label: 'Campagnes', 
      icon: CalendarClock, 
      description: 'Automatiser le blog' 
    },
    { 
      id: 'blog', 
      label: 'Blog SEO', 
      icon: Sparkles, 
      description: 'Outils SEO avancés',
      hasSubmenu: true
    }
  ];

  const blogSubmenu = [
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

      {/* Tab Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <Card
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.hasSubmenu) {
                  setSearchParams({ tab: tab.id, subtab: 'opportunities' });
                } else {
                  setSearchParams({ tab: tab.id });
                }
              }}
              className={cn(
                "p-4 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105",
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg border-primary ring-2 ring-primary"
                  : "hover:bg-muted border-2 border-transparent hover:border-primary/20"
              )}
            >
              <div className="flex flex-col items-center text-center gap-2">
                <Icon className={cn(
                  "w-6 h-6 md:w-7 md:h-7 transition-transform",
                  isActive && "animate-scale-in"
                )} />
                <div>
                  <div className="font-semibold text-sm md:text-base">{tab.label}</div>
                  <div className={cn(
                    "text-xs mt-1",
                    isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                  )}>
                    {tab.description}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Sous-menu horizontal pour l'onglet Blog */}
      {activeTab === 'blog' && (
        <Card className="p-1">
          <Tabs value={activeSubtab} onValueChange={(value) => {
            setActiveSubtab(value);
            setSearchParams({ tab: 'blog', subtab: value });
          }}>
            <TabsList className="w-full justify-start bg-transparent h-auto p-0 gap-1">
              {blogSubmenu.map((subtab) => {
                const Icon = subtab.icon;
                return (
                  <TabsTrigger
                    key={subtab.id}
                    value={subtab.id}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 rounded-md transition-all",
                      "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
                      "data-[state=active]:shadow-md hover:bg-muted"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium">{subtab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </Card>
      )}

      {/* Tab Content */}
      {activeTab === 'articles' && (
        <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-100 dark:bg-cyan-900 rounded-lg">
            <PenSquare className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold">Articles de Blog</h2>
            <p className="text-sm text-muted-foreground">
              Gérez et publiez vos articles de blog avec SEO optimisé
            </p>
          </div>
          <Button size="lg" onClick={() => setShowWizard(true)} disabled={loading}>
            <Sparkles className="w-5 h-5 mr-2" />
            Créer Article IA
          </Button>
        </div>

        <Card className="p-6">
          {articles.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">Aucun article</p>
              <Button onClick={() => setShowWizard(true)} disabled={loading}>
                <Plus className="w-5 h-5 mr-2" />
                Créer votre premier article
              </Button>
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

      {/* Contenu pour l'onglet Blog avec sous-sections */}
      {activeTab === 'blog' && (
        <>
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
        </>
      )}

      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <CalendarClock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">Campagnes Automatiques</h2>
              <p className="text-sm text-muted-foreground">
                Automatisez la création d'articles selon un calendrier défini
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
