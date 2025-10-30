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
      toast.error('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateArticle = async () => {
    try {
      setLoading(true);
      toast.info('Generating article...');

      const { data, error } = await supabase.functions.invoke('generate-blog-article', {
        body: {
          user_id: user?.id,
          title: 'Complete Guide to Choose Well',
          keywords: ['guide', 'comparison', 'advice'],
          mode: 'manual'
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Article generated successfully!');
        loadData();
      } else {
        throw new Error(data?.error || 'Error during generation');
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Error during generation');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncArticle = async (articleId: string) => {
    try {
      toast.info('Syncing with Shopify...');

      const { data, error } = await supabase.functions.invoke('sync-blog-to-shopify', {
        body: { articleId }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Article published on Shopify!');
        loadData();
      } else {
        throw new Error(data?.error || 'Error during synchronization');
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Error during synchronization');
    }
  };

  const blogSubmenu = [
    { 
      id: 'articles', 
      label: 'Article Management', 
      icon: FileText, 
      description: 'List of your articles' 
    },
    { 
      id: 'create-article', 
      label: 'AI Articles', 
      icon: Sparkles, 
      description: 'Create an article with AI' 
    },
    { 
      id: 'campaigns', 
      label: 'AI Campaigns', 
      icon: CalendarClock, 
      description: 'Scheduled automation' 
    },
    { 
      id: 'opportunities', 
      label: 'Opportunities', 
      icon: Lightbulb, 
      description: 'Content ideas'
    },
    { 
      id: 'netlinking', 
      label: 'Netlinking', 
      icon: Link, 
      description: 'Link management'
    },
    { 
      id: 'settings', 
      label: 'Settings', 
      icon: Settings, 
      description: 'Configuration'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
          SEO AI Blog
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base md:text-lg">
          Create optimized articles with AI
        </p>
      </div>

      {/* Horizontal submenu */}
      <Card className="p-1">
        <Tabs value={activeSubtab} onValueChange={(value) => {
          setActiveSubtab(value);
          setSearchParams({ subtab: value });
        }}>
          <TabsList className="w-full grid grid-cols-2 sm:flex sm:flex-wrap sm:justify-start bg-transparent h-auto p-0 gap-1">
            {blogSubmenu.map((subtab) => {
              const Icon = subtab.icon;
              return (
                <TabsTrigger
                  key={subtab.id}
                  value={subtab.id}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-3 rounded-md transition-all text-xs sm:text-sm",
                    "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
                    "data-[state=active]:shadow-md hover:bg-muted flex-1 sm:flex-none justify-center"
                  )}
                >
                  <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="font-medium hidden xs:inline">{subtab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </Card>

      {/* Tab Content */}
      {activeSubtab === 'articles' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-100 dark:bg-cyan-900 rounded-lg">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-bold">Article Management</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                View and manage all your blog articles
              </p>
            </div>
          </div>

          <Card className="p-4 sm:p-6">
            {articles.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No articles created</p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Use "AI Articles" to create your first article
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {articles.map((article) => (
                  <Card key={article.id} className="overflow-hidden hover:shadow-lg transition-all hover:scale-[1.02]">
                    <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                      <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-primary" />
                    </div>
                    <div className="p-3 sm:p-4">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge variant={article.status === 'published' ? 'default' : 'secondary'} className="text-xs">
                          {article.status}
                        </Badge>
                        {article.meta_description && (
                          <Badge variant="outline" className="text-xs">
                            <Sparkles className="w-3 h-3 mr-1" />
                            SEO
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-semibold text-sm sm:text-lg mb-2 line-clamp-2">{article.title}</h3>
                      {article.meta_description && (
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-3">
                          {article.meta_description}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                        <span>{new Date(article.created_at).toLocaleDateString('en-US')}</span>
                        {article.keywords && article.keywords.length > 0 && (
                          <span>{article.keywords.length} keywords</span>
                        )}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 min-w-[60px] text-xs"
                          onClick={() => window.open(`/article-landing/${article.id}`, '_blank')}
                        >
                          View
                        </Button>
                        {article.status === 'draft' && (
                          <Button
                            size="sm"
                            className="flex-1 min-w-[60px] text-xs"
                            onClick={() => handleSyncArticle(article.id)}
                          >
                            Publish
                          </Button>
                        )}
                        {!article.meta_description && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="flex-1 min-w-[60px] text-xs"
                            onClick={async () => {
                              try {
                                const { error } = await supabase.functions.invoke('generate-article-seo', {
                                  body: { article_id: article.id }
                                });
                                if (error) throw error;
                                toast.success('SEO generated successfully!');
                                loadData();
                              } catch (error: any) {
                                toast.error(error.message || 'Error generating SEO');
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

      {/* AI Articles - Manual creation */}
      {activeSubtab === 'create-article' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-bold">Create AI Article</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Generate an SEO-optimized article in a few clicks with artificial intelligence
              </p>
            </div>
          </div>

          <Card className="p-4 sm:p-6 md:p-8">
            <div className="max-w-2xl mx-auto text-center space-y-4 sm:space-y-6">
              <div className="p-3 sm:p-4 bg-primary/5 rounded-lg inline-block">
                <Sparkles className="w-12 h-12 sm:w-16 sm:h-16 text-primary mx-auto" />
              </div>
              
              <div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2">
                  Article Creation Assistant
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Our AI guides you to create an optimized article in 3 steps: 
                  topic selection, content generation, and SEO optimization
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-4">
                <div className="p-3 sm:p-4 border rounded-lg">
                  <div className="text-xl sm:text-2xl font-bold text-primary mb-2">1</div>
                  <div className="font-medium mb-1 text-sm sm:text-base">Topic & Keywords</div>
                  <div className="text-xs text-muted-foreground">
                    Define your theme
                  </div>
                </div>
                <div className="p-3 sm:p-4 border rounded-lg">
                  <div className="text-xl sm:text-2xl font-bold text-primary mb-2">2</div>
                  <div className="font-medium mb-1 text-sm sm:text-base">AI Generation</div>
                  <div className="text-xs text-muted-foreground">
                    AI writes your article
                  </div>
                </div>
                <div className="p-3 sm:p-4 border rounded-lg">
                  <div className="text-xl sm:text-2xl font-bold text-primary mb-2">3</div>
                  <div className="font-medium mb-1 text-sm sm:text-base">Publication</div>
                  <div className="text-xs text-muted-foreground">
                    Publish on Shopify
                  </div>
                </div>
              </div>

              <Button 
                size="lg" 
                onClick={() => setShowWizard(true)} 
                disabled={loading}
                className="mt-4 sm:mt-6 w-full sm:w-auto"
              >
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Launch Creation Assistant
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Opportunities */}
      {activeSubtab === 'opportunities' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <Lightbulb className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-bold">Content Opportunities</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Article ideas automatically detected based on your catalog
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
              <Link className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-bold">Netlinking</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Manage your internal links and generate optimized articles
              </p>
            </div>
          </div>
          <NetlinkingTable />
        </div>
      )}

      {/* Settings */}
      {activeSubtab === 'settings' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 dark:bg-gray-900 rounded-lg">
              <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-gray-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-bold">Blog Settings</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Configure automatic opportunity generation
              </p>
            </div>
          </div>
          <OpportunitiesSettings />
        </div>
      )}

      {activeSubtab === 'campaigns' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <CalendarClock className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl sm:text-2xl font-bold">AI Campaigns</h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Schedule automatic article creation according to a defined calendar
                </p>
              </div>
            </div>
            <Button size="lg" onClick={() => setShowCampaignWizard(true)} className="w-full sm:w-auto">
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Create Campaign
            </Button>
          </div>

          <Card className="p-4 sm:p-6">
            {campaigns.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <CalendarClock className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No campaigns created</p>
                <Button onClick={() => setShowCampaignWizard(true)} className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Create your first campaign
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {campaigns.map((campaign) => (
                  <Card key={campaign.id} className="p-3 sm:p-4 hover:shadow-lg transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-base sm:text-lg">{campaign.name}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground">{campaign.description}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'} className="text-xs">
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