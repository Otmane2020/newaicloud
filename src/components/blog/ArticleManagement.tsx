import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { calculateDescriptionScore } from '@/lib/seoQuality';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  RefreshCw,
  Sparkles,
  Upload,
  Loader2,
  FileText,
  Eye,
  ExternalLink,
  Filter,
  Grid3x3,
  List,
  CheckCircle,
  Clock,
  AlertCircle,
  ImageIcon
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { VisionAIBanner } from '../seo/VisionAIBanner';
import { ArticleFeaturedImageDialog } from './ArticleFeaturedImageDialog';

interface Article {
  id: string;
  title: string;
  content: string;
  meta_description: string;
  keywords: string[];
  status: string;
  published_at: string | null;
  shopify_blog_id: string;
  source: string;
  created_at: string;
  updated_at: string;
  optimization_count?: number;
  last_optimization_at?: string | null;
  featured_image?: string | null;
  last_synced_at?: string | null;
}

type QuickFilterTab = 'all' | 'draft' | 'published' | 'shopify-synced';

export function ArticleManagement() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<QuickFilterTab>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [optimizing, setOptimizing] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [selectedArticleForImage, setSelectedArticleForImage] = useState<Article | null>(null);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('blog_articles')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      console.error('Error fetching articles:', error);
      toast.error('Failed to load articles');
    } finally {
      setLoading(false);
    }
  };

  const calculateArticleSeoScore = (article: Article): number => {
    const detailedScore = calculateDescriptionScore(
      article.meta_description,
      undefined,
      undefined,
      article.title
    );
    
    let score = detailedScore.score;
    
    // Penalty if no featured image (15%)
    if (!article.featured_image) {
      score = Math.round(score * 0.85);
    }
    
    // Bonus for optimization
    if (article.optimization_count && article.optimization_count > 0) {
      score = Math.min(100, score + 10);
    }
    
    return score;
  };

  const getSeoScoreBadge = (score: number) => {
    if (score >= 80) return { variant: 'default' as const, label: 'Excellent', color: 'text-green-600' };
    if (score >= 60) return { variant: 'secondary' as const, label: 'Bon', color: 'text-blue-600' };
    if (score >= 40) return { variant: 'outline' as const, label: 'Moyen', color: 'text-yellow-600' };
    return { variant: 'outline' as const, label: 'Faible', color: 'text-red-600' };
  };

  const handleSyncArticle = async (articleId: string) => {
    try {
      setSyncing(true);
      toast.info('Syncing with Shopify...');

      const { data, error } = await supabase.functions.invoke('sync-blog-to-shopify', {
        body: { articleId }
      });

      if (error) throw error;

      if (data?.success) {
        const article = articles.find(a => a.id === articleId);
        if (article) {
          toast.success('Article published to Shopify', {
            description: (
              <>
                <span className="font-medium">{article.title}</span>
                <br />
                <span className="text-xs text-muted-foreground">
                  View in your Shopify admin
                </span>
              </>
            ),
          });
        }
        await fetchArticles();
      } else {
        throw new Error(data?.error || 'Sync error');
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Sync error');
    } finally {
      setSyncing(false);
    }
  };

  const handleImportArticles = async () => {
    try {
      setSyncing(true);
      const toastId = toast.loading('Importing articles from Shopify...');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data: storeData } = await supabase
        .from('shopify_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!storeData) {
        toast.error("Aucune connexion Shopify active", { id: toastId });
        return;
      }

      const { data, error } = await supabase.functions.invoke('import-shopify-articles', {
        body: { 
          shopName: storeData.store_url.replace('.myshopify.com', ''),
          authToken: storeData.access_token,
          storeId: storeData.id
        }
      });

      if (error) throw error;

      const totalArticles = data?.count || 0;
      const totalImages = data?.images || 0;
      toast.success(`✅ ${totalArticles} articles et ${totalImages} images importés`, { id: toastId });
      await fetchArticles();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to import articles');
    } finally {
      setSyncing(false);
    }
  };

  const handleOptimizeArticles = async () => {
    if (selectedArticles.size === 0) {
      toast.error("Sélectionnez au moins un article");
      return;
    }

    try {
      setOptimizing(true);
      const toastId = toast.loading(`Optimisation SEO de ${selectedArticles.size} article(s)...`);

      const { data, error } = await supabase.functions.invoke('generate-article-seo', {
        body: { article_ids: Array.from(selectedArticles) }
      });

      if (error) throw error;

      const successCount = data?.success_count || 0;
      const errorCount = data?.error_count || 0;

      if (successCount > 0) {
        toast.success(`✅ ${successCount} article(s) optimisé(s)`, { id: toastId });
        await fetchArticles();
        setSelectedArticles(new Set());
      } else {
        toast.error(`Échec de l'optimisation`, { id: toastId });
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to optimize articles');
    } finally {
      setOptimizing(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedArticles.size === filteredArticles.length) {
      setSelectedArticles(new Set());
    } else {
      setSelectedArticles(new Set(filteredArticles.map(a => a.id)));
    }
  };

  const handleSelectArticle = (articleId: string) => {
    const newSelected = new Set(selectedArticles);
    if (newSelected.has(articleId)) {
      newSelected.delete(articleId);
    } else {
      newSelected.add(articleId);
    }
    setSelectedArticles(newSelected);
  };

  const getFilteredArticles = () => {
    let filtered = [...articles];

    // Apply quick filter
    switch (activeTab) {
      case 'draft':
        filtered = filtered.filter(a => a.status === 'draft');
        break;
      case 'published':
        filtered = filtered.filter(a => a.status === 'published');
        break;
      case 'shopify-synced':
        filtered = filtered.filter(a => a.shopify_blog_id);
        break;
    }

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a => 
        a.title?.toLowerCase().includes(term) ||
        a.content?.toLowerCase().includes(term) ||
        a.meta_description?.toLowerCase().includes(term)
      );
    }

    return filtered;
  };

  const filteredArticles = getFilteredArticles();
  
  // Calculate global SEO score
  const globalSeoScore = articles.length > 0
    ? Math.round(articles.reduce((sum, article) => sum + calculateArticleSeoScore(article), 0) / articles.length)
    : 0;
  
  const stats = {
    total: articles.length,
    draft: articles.filter(a => a.status === 'draft').length,
    published: articles.filter(a => a.status === 'published').length,
    synced: articles.filter(a => a.shopify_blog_id).length,
  };

  const quickFilters = [
    { id: 'all' as QuickFilterTab, label: 'All', count: stats.total, icon: FileText },
    { id: 'draft' as QuickFilterTab, label: 'Draft', count: stats.draft, icon: Clock },
    { id: 'published' as QuickFilterTab, label: 'Published', count: stats.published, icon: CheckCircle },
    { id: 'shopify-synced' as QuickFilterTab, label: 'Synced', count: stats.synced, icon: Upload },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Vision AI Banner */}
      <VisionAIBanner />
      
      {/* Global SEO Score Card */}
      <Card className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950 dark:via-indigo-950 dark:to-purple-950 border-2 border-blue-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1">Score SEO Global des Articles</h3>
            <p className="text-sm text-muted-foreground">
              Moyenne des scores SEO de tous les articles
            </p>
          </div>
          <div className="text-center">
            <div className={`text-4xl font-bold ${
              globalSeoScore >= 80 ? 'text-green-600' : 
              globalSeoScore >= 60 ? 'text-blue-600' : 
              globalSeoScore >= 40 ? 'text-yellow-600' : 
              'text-red-600'
            }`}>
              {globalSeoScore}/100
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {articles.length} article{articles.length > 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </Card>
      
      {/* Quick Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickFilters.map((filter) => {
          const Icon = filter.icon;
          return (
            <Card
              key={filter.id}
              className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                activeTab === filter.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setActiveTab(filter.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-5 h-5 ${activeTab === filter.id ? 'text-primary' : 'text-muted-foreground'}`} />
                <Badge variant={activeTab === filter.id ? 'default' : 'secondary'}>
                  {filter.count}
                </Badge>
              </div>
              <div className="text-sm font-medium">{filter.label}</div>
            </Card>
          );
        })}
      </div>

      {/* Toolbar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1 w-full md:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-2 items-center w-full md:w-auto">
            {selectedArticles.size > 0 && (
              <Button
                variant="default"
                size="sm"
                onClick={handleOptimizeArticles}
                disabled={optimizing || syncing}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Optimiser SEO ({selectedArticles.size})
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleImportArticles}
              disabled={syncing || optimizing}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Shopify
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            >
              {viewMode === 'list' ? <Grid3x3 className="w-4 h-4" /> : <List className="w-4 h-4" />}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={fetchArticles}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Articles Table/Grid */}
      {filteredArticles.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No articles found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? 'Try adjusting your search' : 'Create your first article with AI'}
          </p>
        </Card>
      ) : viewMode === 'list' ? (
        <Card className="overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto">
          <Table>
            {/* Article Table Headers - Updated structure */}
            <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedArticles.size === filteredArticles.length}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-20">Image</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="min-w-[200px]">Meta Description</TableHead>
                <TableHead className="w-32">SEO Score</TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead className="w-40">Sync Status</TableHead>
                <TableHead className="w-32 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredArticles.map((article) => {
                const seoScore = calculateArticleSeoScore(article);
                const scoreBadge = getSeoScoreBadge(seoScore);
                const truncatedTitle = article.title.length > 50 
                  ? article.title.substring(0, 50) + '...' 
                  : article.title;
                
                return (
                  <TableRow key={article.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedArticles.has(article.id)}
                        onCheckedChange={() => handleSelectArticle(article.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div 
                        className="w-16 h-16 rounded-md bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 flex items-center justify-center overflow-hidden cursor-pointer hover:scale-110 transition-transform border-2 border-dashed border-purple-300 group relative"
                        onClick={() => {
                          setSelectedArticleForImage(article);
                          setShowImageDialog(true);
                        }}
                        title="Cliquer pour générer une image avec Gemini AI"
                      >
                        {article.featured_image ? (
                          <img 
                            src={article.featured_image} 
                            alt={article.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <>
                            <ImageIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center">
                              <Sparkles className="w-3 h-3 text-white" />
                            </div>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px]">
                        <p className="font-medium line-clamp-2">{article.title}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[250px]">
                        {article.meta_description ? (
                          <p className="text-sm line-clamp-2 text-muted-foreground">{article.meta_description}</p>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Not optimized
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={scoreBadge.variant} className="whitespace-nowrap">
                          <span className={scoreBadge.color}>{seoScore}/100</span>
                        </Badge>
                        {article.optimization_count && article.optimization_count > 0 && (
                          <Sparkles className="w-3 h-3 text-primary flex-shrink-0" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={article.status === 'published' ? 'default' : 'secondary'}>
                        {article.status === 'published' ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Published
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 mr-1" />
                            Draft
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {article.last_synced_at ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="default" className="bg-green-600 hover:bg-green-700 cursor-help">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Synced
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">
                                Last synced: {new Date(article.last_synced_at).toLocaleString()}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : article.shopify_blog_id ? (
                        <Badge variant="secondary" className="bg-yellow-600 text-white">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Not synced
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            setOptimizing(true);
                            try {
                              const { error } = await supabase.functions.invoke('generate-article-seo', {
                                body: { article_ids: [article.id] }
                              });
                              if (error) throw error;
                              toast.success('Article optimisé !');
                              await fetchArticles();
                            } catch (error: any) {
                              toast.error(error.message || 'Erreur lors de l\'optimisation');
                            } finally {
                              setOptimizing(false);
                            }
                          }}
                          disabled={optimizing}
                          title="Optimize"
                          className="hover:bg-blue-50"
                        >
                          <Sparkles className="w-5 h-5 text-blue-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(`/article-landing/${article.id}`, '_blank')}
                          className="hover:bg-gray-50"
                        >
                          <Eye className="w-5 h-5" />
                        </Button>
                        {article.status === 'draft' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSyncArticle(article.id)}
                            disabled={syncing}
                            className="hover:bg-green-50"
                          >
                            <Upload className="w-5 h-5 text-green-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredArticles.map((article) => (
            <Card key={article.id} className="overflow-hidden hover:shadow-lg transition-all">
              <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                <FileText className="w-16 h-16 text-primary" />
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={article.status === 'published' ? 'default' : 'secondary'}>
                    {article.status}
                  </Badge>
                  {article.shopify_blog_id && (
                    <Badge variant="outline" className="text-xs">
                      <Upload className="w-3 h-3 mr-1" />
                      Synced
                    </Badge>
                  )}
                </div>
                <h3 className="font-semibold text-lg mb-2 line-clamp-2">{article.title}</h3>
                {article.meta_description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {article.meta_description}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => window.open(`/article-landing/${article.id}`, '_blank')}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  {article.status === 'draft' && (
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleSyncArticle(article.id)}
                      disabled={syncing}
                    >
                      <Upload className="w-4 h-4 mr-1" />
                      Publish
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      
      {/* Featured Image Dialog */}
      {selectedArticleForImage && (
        <ArticleFeaturedImageDialog
          open={showImageDialog}
          onOpenChange={setShowImageDialog}
          article={selectedArticleForImage}
          onImageUpdated={fetchArticles}
        />
      )}
    </div>
  );
}