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
        {/* Hero Banner */}
        <Card className="bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 dark:from-cyan-950 dark:via-blue-950 dark:to-indigo-950 border-2 border-cyan-200 p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="w-6 h-6 text-cyan-600" />
                <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                  Gestion Articles
                </h2>
              </div>
              <p className="text-muted-foreground text-lg max-w-2xl">
                Consultez, éditez et publiez tous vos articles de blog. Gérez votre contenu SEO en un seul endroit.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-cyan-600" />
                  <span className="font-medium">Articles centralisés</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span className="font-medium">SEO optimisé</span>
                </div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-cyan-600">{articles.length}</div>
              <div className="text-sm text-muted-foreground">Articles</div>
            </div>
          </div>
        </Card>

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
          {/* Hero Banner */}
          <Card className="bg-gradient-to-br from-purple-50 via-pink-50 to-fuchsia-50 dark:from-purple-950 dark:via-pink-950 dark:to-fuchsia-950 border-2 border-purple-200 p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Créer un Article IA
                  </h2>
                </div>
                <p className="text-muted-foreground text-lg max-w-2xl">
                  Générez un article optimisé SEO en quelques clics avec l'intelligence artificielle. Contenu de qualité en moins de 5 minutes.
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span className="font-medium">IA puissante</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <PenSquare className="w-4 h-4 text-pink-600" />
                    <span className="font-medium">Rédaction pro</span>
                  </div>
                </div>
              </div>
              <Button size="lg" onClick={() => setShowWizard(true)} disabled={loading}>
                <Sparkles className="mr-2 h-5 w-5" />
                Créer maintenant
              </Button>
            </div>
          </Card>

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
              {/* Hero Banner */}
              <Card className="bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 dark:from-yellow-950 dark:via-amber-950 dark:to-orange-950 border-2 border-yellow-200 p-8">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="w-6 h-6 text-yellow-600" />
                      <h2 className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                        Opportunités de Contenu
                      </h2>
                    </div>
                    <p className="text-muted-foreground text-lg max-w-2xl">
                      Découvrez des idées d'articles détectées automatiquement. L'IA analyse votre catalogue pour vous suggérer du contenu pertinent.
                    </p>
                    <div className="flex flex-wrap gap-3 pt-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Lightbulb className="w-4 h-4 text-yellow-600" />
                        <span className="font-medium">Détection auto</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        <span className="font-medium">Analyse IA</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
              <BlogOpportunities />
            </div>
          )}

      {/* Netlinking */}
      {activeSubtab === 'netlinking' && (
            <div className="space-y-6">
              {/* Hero Banner */}
              <Card className="bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 dark:from-blue-950 dark:via-sky-950 dark:to-cyan-950 border-2 border-blue-200 p-8">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <Link className="w-6 h-6 text-blue-600" />
                      <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                        Netlinking
                      </h2>
                    </div>
                    <p className="text-muted-foreground text-lg max-w-2xl">
                      Gérez vos liens internes et boostez votre maillage SEO. Créez des articles optimisés avec un netlinking stratégique.
                    </p>
                    <div className="flex flex-wrap gap-3 pt-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Link className="w-4 h-4 text-blue-600" />
                        <span className="font-medium">Maillage intelligent</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Sparkles className="w-4 h-4 text-sky-600" />
                        <span className="font-medium">SEO avancé</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
              <NetlinkingTable />
            </div>
          )}

      {/* Paramètres */}
      {activeSubtab === 'settings' && (
            <div className="space-y-6">
              {/* Hero Banner */}
              <Card className="bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 dark:from-slate-950 dark:via-gray-950 dark:to-zinc-950 border-2 border-slate-200 p-8">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <Settings className="w-6 h-6 text-slate-600" />
                      <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-600 to-gray-600 bg-clip-text text-transparent">
                        Paramètres Blog
                      </h2>
                    </div>
                    <p className="text-muted-foreground text-lg max-w-2xl">
                      Configurez la génération automatique d'opportunités. Personnalisez les paramètres pour optimiser votre stratégie de contenu.
                    </p>
                    <div className="flex flex-wrap gap-3 pt-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Settings className="w-4 h-4 text-slate-600" />
                        <span className="font-medium">Configuration avancée</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Sparkles className="w-4 h-4 text-gray-600" />
                        <span className="font-medium">Automatisation</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
              <OpportunitiesSettings />
            </div>
          )}

      {activeSubtab === 'campaigns' && (
        <div className="space-y-4">
          {/* Hero Banner */}
          <Card className="bg-gradient-to-br from-indigo-50 via-purple-50 to-violet-50 dark:from-indigo-950 dark:via-purple-950 dark:to-violet-950 border-2 border-indigo-200 p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <CalendarClock className="w-6 h-6 text-indigo-600" />
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Campagnes IA Automatiques
                  </h2>
                </div>
                <p className="text-muted-foreground text-lg max-w-2xl">
                  Programmez la création automatique d'articles selon un calendrier défini. L'IA génère du contenu régulièrement pour vous.
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarClock className="w-4 h-4 text-indigo-600" />
                    <span className="font-medium">Planification flexible</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span className="font-medium">Génération auto</span>
                  </div>
                </div>
              </div>
              <Button size="lg" onClick={() => setShowCampaignWizard(true)}>
                <Plus className="w-5 h-5 mr-2" />
                Créer Campagne
              </Button>
            </div>
          </Card>

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
