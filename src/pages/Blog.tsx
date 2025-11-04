import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Sparkles, FileText, CalendarClock, PenSquare, Lightbulb, Link, Settings, Zap } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { NetlinkingTable } from '@/components/blog/NetlinkingTable';
import { OpportunitiesSettings } from '@/components/blog/OpportunitiesSettings';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { BlogWizard } from '@/components/blog/BlogWizard';
import { BlogOpportunities } from '@/components/blog/BlogOpportunities';
import { CampaignWizard } from '@/components/blog/CampaignWizard';
import { ArticleManagement } from '@/components/blog/ArticleManagement';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/language';

export default function Blog() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const [activeSubtab, setActiveSubtab] = useState(searchParams.get('subtab') || 'articles');
  const [articles, setArticles] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [showCampaignWizard, setShowCampaignWizard] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

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
      // Count total articles
      const { count } = await supabase
        .from('blog_articles')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);
      
      // Load articles with pagination
      const { data: articlesData, error: articlesError } = await supabase
        .from('blog_articles')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);

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
      toast.error(t.blog.management.messages.errorLoading);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateArticle = async () => {
    try {
      setLoading(true);
      toast.info(t.blog.management.messages.generating);

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
        toast.success(t.blog.management.messages.generationSuccess);
        loadData();
      } else {
        throw new Error(data?.error || 'Error during generation');
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || t.blog.management.messages.generationError);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncArticle = async (articleId: string) => {
    try {
      toast.info(t.blog.management.messages.syncing);

      const { data, error } = await supabase.functions.invoke('sync-blog-to-shopify', {
        body: { articleId }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(t.blog.management.messages.syncSuccess);
        loadData();
      } else {
        throw new Error(data?.error || 'Error during synchronization');
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || t.blog.management.messages.syncError);
    }
  };

  const blogSubmenu = [
    { 
      id: 'articles', 
      label: t.blog.submenu.articles, 
      icon: FileText, 
      description: t.blog.submenu.articlesDesc 
    },
    { 
      id: 'create-article', 
      label: t.blog.submenu.aiArticles, 
      icon: Sparkles, 
      description: t.blog.submenu.aiArticlesDesc 
    },
    // Campaigns hidden temporarily
    // { 
    //   id: 'campaigns', 
    //   label: t.blog.submenu.campaigns, 
    //   icon: CalendarClock, 
    //   description: t.blog.submenu.campaignsDesc 
    // },
    { 
      id: 'opportunities', 
      label: t.blog.submenu.opportunities, 
      icon: Lightbulb, 
      description: t.blog.submenu.opportunitiesDesc
    },
    { 
      id: 'netlinking', 
      label: t.blog.submenu.netlinking, 
      icon: Link, 
      description: t.blog.submenu.netlinkingDesc
    },
    { 
      id: 'settings', 
      label: t.blog.submenu.settings, 
      icon: Settings, 
      description: t.blog.submenu.settingsDesc
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
          {t.blog.title}
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base md:text-lg">
          {t.blog.description}
        </p>
      </div>

      {/* Dynamic Hero Banner based on active subtab */}
      {activeSubtab === 'articles' && (
        <Card className="bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 dark:from-cyan-950 dark:via-blue-950 dark:to-indigo-950 border-2 border-cyan-200 dark:border-cyan-800 p-6 sm:p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                  {t.blog.submenu.articles}
                </h2>
              </div>
              <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl">
                {t.blog.hero.articles.description}
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <FileText className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <span className="font-medium">{articles.length} {t.blog.hero.articles.count}</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="font-medium">{t.blog.hero.articles.seoReady}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Button size="lg" onClick={() => setActiveSubtab('create-article')} className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                {t.blog.createNew}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {activeSubtab === 'create-article' && (
        <Card className="bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 dark:from-purple-950 dark:via-pink-950 dark:to-rose-950 border-2 border-purple-200 dark:border-purple-800 p-6 sm:p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  AI Article Generator
                </h2>
              </div>
              <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl">
                Let our AI create SEO-optimized articles in minutes. Just choose your topic and keywords, and watch the magic happen.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="font-medium">AI-Powered</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <FileText className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                  <span className="font-medium">SEO Optimized</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Button size="lg" onClick={() => setShowWizard(true)} className="w-full sm:w-auto">
                <Sparkles className="w-4 h-4 mr-2" />
                Start Creating
              </Button>
            </div>
          </div>
        </Card>
      )}

      {activeSubtab === 'campaigns' && (
        <Card className="bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 dark:from-violet-950 dark:via-purple-950 dark:to-fuchsia-950 border-2 border-violet-200 dark:border-violet-800 p-6 sm:p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                  Automated Content Campaigns
                </h2>
              </div>
              <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl">
                Schedule and automate your content creation. Set up campaigns to publish articles regularly and maintain a consistent presence.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <CalendarClock className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  <span className="font-medium">{campaigns.length} Campaigns</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <Zap className="w-4 h-4 text-fuchsia-600 dark:text-fuchsia-400" />
                  <span className="font-medium">Automated</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Button size="lg" onClick={() => setShowCampaignWizard(true)} className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                New Campaign
              </Button>
            </div>
          </div>
        </Card>
      )}

      {activeSubtab === 'opportunities' && (
        <Card className="bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 dark:from-yellow-950 dark:via-amber-950 dark:to-orange-950 border-2 border-yellow-200 dark:border-yellow-800 p-6 sm:p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                  Content Opportunities
                </h2>
              </div>
              <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl">
                Discover trending topics and content ideas based on your product catalog. AI analyzes your store to suggest the best articles to write.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <Lightbulb className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  <span className="font-medium">Smart Suggestions</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <Sparkles className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  <span className="font-medium">AI-Driven</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Button size="lg" onClick={() => setActiveSubtab('settings')} variant="outline" className="w-full sm:w-auto">
                <Settings className="w-4 h-4 mr-2" />
                Configure
              </Button>
            </div>
          </div>
        </Card>
      )}

      {activeSubtab === 'netlinking' && (
        <Card className="bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 dark:from-blue-950 dark:via-sky-950 dark:to-cyan-950 border-2 border-blue-200 dark:border-blue-800 p-6 sm:p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <Link className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  Internal Linking Strategy
                </h2>
              </div>
              <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl">
                Boost your SEO with smart internal linking. Manage product links within articles and create content optimized for link building.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <Link className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="font-medium">Link Management</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <span className="font-medium">SEO Boost</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Button size="lg" onClick={() => setActiveSubtab('create-article')} className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Create Linking Article
              </Button>
            </div>
          </div>
        </Card>
      )}

      {activeSubtab === 'settings' && (
        <Card className="bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 dark:from-slate-950 dark:via-gray-950 dark:to-zinc-950 border-2 border-slate-200 dark:border-slate-800 p-6 sm:p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <Settings className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-600 to-zinc-600 bg-clip-text text-transparent">
                  Blog Configuration
                </h2>
              </div>
              <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl">
                Configure automatic content opportunity generation, set preferences, and customize how AI creates articles for your store.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <Settings className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <span className="font-medium">Automation Settings</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <Zap className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                  <span className="font-medium">Optimize Performance</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

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
      {activeSubtab === 'articles' && <ArticleManagement />}

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