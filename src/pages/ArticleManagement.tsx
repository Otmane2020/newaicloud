import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  FileText, 
  Trash2, 
  ExternalLink,
  Eye,
  Sparkles,
  Plus,
  Search,
  Check,
  X,
  ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BlogWizard } from '@/components/blog/BlogWizard';
import { ResultsDialog } from '@/components/seo/SeoWorkflowDialogs';
import { useAuth } from '@/contexts/AuthContext';
import { calculateDetailedSeoScore, getConfidenceBadgeColor } from '@/lib/seoQuality';
import { ArticleFeaturedImageDialog } from '@/components/blog/ArticleFeaturedImageDialog';

interface Article {
  id: string;
  title: string;
  content: string;
  meta_description: string | null;
  keywords: string[] | null;
  status: string;
  published_at: string | null;
  shopify_blog_id: string | null;
  created_at: string;
  updated_at: string;
  source: string | null;
  featured_image: string | null;
}

export default function ArticleManagement() {
  const { user } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticles, setSelectedArticles] = useState<string[]>([]);
  const [showWizard, setShowWizard] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [showOptimizationResults, setShowOptimizationResults] = useState(false);
  const [optimizedArticles, setOptimizedArticles] = useState<any[]>([]);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [selectedArticleForImage, setSelectedArticleForImage] = useState<Article | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [syncFilter, setSyncFilter] = useState('all');

  useEffect(() => {
    loadArticles();
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const { data } = await supabase
        .from('shopify_products')
        .select('category')
        .not('category', 'is', null);
      
      const uniqueCategories = [...new Set(data?.map(p => p.category).filter(Boolean))];
      setCategories(uniqueCategories as string[]);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadArticles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('blog_articles')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setArticles((data || []) as unknown as Article[]);
    } catch (error) {
      console.error('Error loading articles:', error);
      toast.error('Error loading articles');
    } finally {
      setLoading(false);
    }
  };

  const filteredArticles = articles.filter(article => {
    const matchesSearch = !searchQuery || 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.meta_description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || article.status === statusFilter;
    
    const matchesSource = sourceFilter === 'all' || 
      (sourceFilter === 'ai' && article.source === 'ai_generated') ||
      (sourceFilter === 'shopify' && article.source === 'shopify_import');
    
    const matchesSync = syncFilter === 'all' || 
      (syncFilter === 'synced' && article.shopify_blog_id) ||
      (syncFilter === 'not_synced' && !article.shopify_blog_id);
    
    return matchesSearch && matchesStatus && matchesSource && matchesSync;
  });

  const stats = {
    total: articles.length,
    ai: articles.filter(a => a.source === 'ai_generated').length,
    shopify: articles.filter(a => a.source === 'shopify_import').length,
    published: articles.filter(a => a.status === 'published').length,
    synced: articles.filter(a => a.shopify_blog_id).length,
    seoOptimized: articles.filter(a => a.meta_description).length,
  };

  const deleteArticle = async (articleId: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return;

    try {
      const { error } = await supabase
        .from('blog_articles')
        .delete()
        .eq('id', articleId);

      if (error) throw error;
      
      toast.success('Article deleted');
      loadArticles();
    } catch (error) {
      console.error('Error deleting article:', error);
      toast.error('Error deleting article');
    }
  };

  const optimizeArticles = async (articleIds: string[]) => {
    try {
      toast.info('SEO optimization in progress...');
      
      const { data, error } = await supabase.functions.invoke('generate-article-seo', {
        body: { article_ids: articleIds }
      });

      if (error) throw error;
      
      // Get optimized articles from database
      const { data: articles, error: articlesError } = await supabase
        .from('blog_articles')
        .select('id, title, meta_description')
        .in('id', articleIds);

      if (articlesError) throw articlesError;

      // Show dialog with results
      setOptimizedArticles(articles || []);
      setShowOptimizationResults(true);
      
      toast.success(`${data.success_count || articleIds.length} article(s) optimized!`);
      loadArticles();
    } catch (error) {
      console.error('Error optimizing:', error);
      toast.error('Error during optimization');
    }
  };

  const syncToShopify = async (articleIds: string[]) => {
    for (const articleId of articleIds) {
      try {
        toast.loading(`📤 Syncing article ${articleId.substring(0, 8)}...`, { id: `sync-${articleId}` });
        
        const { error } = await supabase.functions.invoke('sync-blog-to-shopify', {
          body: { articleId }
        });

        if (error) {
          toast.error(`Sync error ${articleId.substring(0, 8)}`, { id: `sync-${articleId}` });
        } else {
          toast.success(`✅ Article synced!`, { id: `sync-${articleId}` });
        }
      } catch (error) {
        console.error('Error syncing:', error);
        toast.error(`Sync error ${articleId.substring(0, 8)}`, { id: `sync-${articleId}` });
      }
    }
    loadArticles();
    setSelectedArticles([]);
  };

  const bulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedArticles.length} articles?`)) return;

    try {
      const { error } = await supabase
        .from('blog_articles')
        .delete()
        .in('id', selectedArticles);

      if (error) throw error;
      
      toast.success(`${selectedArticles.length} articles deleted`);
      setSelectedArticles([]);
      loadArticles();
    } catch (error) {
      console.error('Error bulk deleting:', error);
      toast.error('Error during deletion');
    }
  };

  const toggleSelectAll = () => {
    if (selectedArticles.length === filteredArticles.length) {
      setSelectedArticles([]);
    } else {
      setSelectedArticles(filteredArticles.map(a => a.id));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Articles SEO Management</h1>
            <p className="text-muted-foreground mt-1">Optimize SEO title and meta description for your articles</p>
          </div>
          <Button onClick={() => setShowWizard(true)} size="lg" className="w-full sm:w-auto">
            <Plus className="w-5 h-5 mr-2" />
            Create Article
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-xl sm:text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-xl sm:text-2xl font-bold text-blue-600">{stats.ai}</div>
            <div className="text-xs text-muted-foreground">AI</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.shopify}</div>
            <div className="text-xs text-muted-foreground">Shopify</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-xl sm:text-2xl font-bold text-purple-600">{stats.published}</div>
            <div className="text-xs text-muted-foreground">Published</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-xl sm:text-2xl font-bold text-cyan-600">{stats.synced}</div>
            <div className="text-xs text-muted-foreground">Synced</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-xl sm:text-2xl font-bold text-orange-600">{stats.seoOptimized}</div>
            <div className="text-xs text-muted-foreground">SEO Optimized</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  <SelectItem value="ai">AI NewAI</SelectItem>
                  <SelectItem value="shopify">Shopify</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>

              <Select value={syncFilter} onValueChange={setSyncFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Synchronization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="synced">Synced</SelectItem>
                  <SelectItem value="not_synced">Not synced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedArticles.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-4 pt-4 border-t">
              <span className="text-sm text-muted-foreground mb-2 sm:mb-0">
                {selectedArticles.length} selected
              </span>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => optimizeArticles(selectedArticles)}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Optimize SEO
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => syncToShopify(selectedArticles)}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Sync
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={bulkDelete}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Articles Table */}
      {filteredArticles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No articles found</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="p-3 text-left">
                      <Checkbox
                        checked={selectedArticles.length === filteredArticles.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    <th className="p-3 text-left hidden sm:table-cell">Image</th>
                    <th className="p-3 text-left">Article Title</th>
                    <th className="p-3 text-left hidden lg:table-cell">SEO Title</th>
                    <th className="p-3 text-left hidden md:table-cell">SEO Meta Description</th>
                    <th className="p-3 text-left hidden xl:table-cell">SEO Score</th>
                    <th className="p-3 text-left hidden sm:table-cell">Source</th>
                    <th className="p-3 text-left hidden md:table-cell">Published on Shopify</th>
                    <th className="p-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredArticles.map((article) => (
                    <tr key={article.id} className="border-b hover:bg-muted/30">
                      <td className="p-3">
                        <Checkbox
                          checked={selectedArticles.includes(article.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedArticles([...selectedArticles, article.id]);
                            } else {
                              setSelectedArticles(selectedArticles.filter(id => id !== article.id));
                            }
                          }}
                        />
                      </td>
                      <td className="p-3 hidden sm:table-cell">
                        {article.featured_image ? (
                          <img
                            src={article.featured_image}
                            alt={article.title}
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover cursor-pointer hover:scale-110 transition-transform"
                            onClick={() => {
                              setSelectedArticleForImage(article);
                              setShowImageDialog(true);
                            }}
                          />
                        ) : (
                          <div 
                            className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 rounded-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform border-2 border-dashed border-indigo-300"
                            onClick={() => {
                              setSelectedArticleForImage(article);
                              setShowImageDialog(true);
                            }}
                            title="Cliquer pour ajouter une image de couverture"
                          >
                            <ImageIcon className="w-4 h-4 sm:w-6 sm:h-6 text-indigo-600 dark:text-indigo-400" />
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="max-w-[150px] sm:max-w-xs">
                          <p 
                            className="font-medium line-clamp-2 cursor-pointer hover:text-primary transition-colors text-sm sm:text-base"
                            onClick={() => window.open(`/article-landing/${article.id}`, '_blank')}
                          >
                            {article.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(article.created_at), 'PP', { locale: fr })}
                          </p>
                        </div>
                      </td>
                      <td className="p-3 hidden lg:table-cell">
                        <div className="max-w-xs">
                          {article.meta_description ? (
                            <p className="text-sm line-clamp-2 font-medium">
                              {article.title}
                            </p>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              <X className="w-3 h-3 mr-1" />
                              Not defined
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-3 hidden md:table-cell">
                        <div className="max-w-xs">
                          {article.meta_description ? (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {article.meta_description}
                            </p>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              <X className="w-3 h-3 mr-1" />
                              Not optimized
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-3 hidden xl:table-cell">
                        {(() => {
                          const seoScore = article.meta_description 
                            ? calculateDetailedSeoScore(article.title, article.meta_description).score
                            : 0;
                          const badgeColor = getConfidenceBadgeColor(seoScore);
                          
                          return (
                            <Badge 
                              variant="outline" 
                              className={`${badgeColor} text-xs border`}
                            >
                              <Sparkles className="w-3 h-3 mr-1" />
                              {seoScore}/100
                            </Badge>
                          );
                        })()}
                      </td>
                      <td className="p-3 hidden sm:table-cell">
                        <Badge 
                          variant={article.source === 'ai_generated' ? 'default' : 'secondary'}
                          className={article.source === 'ai_generated' ? 'bg-blue-600' : 'bg-green-600'}
                        >
                          {article.source === 'ai_generated' ? 'AI NewAI' : 'Shopify'}
                        </Badge>
                      </td>
                      <td className="p-3 hidden md:table-cell">
                        {article.shopify_blog_id ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <Check className="w-3 h-3 mr-1" />
                            Yes
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            <X className="w-3 h-3 mr-1" />
                            No
                          </Badge>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(`/article-landing/${article.id}`, '_blank')}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                          {!article.meta_description && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => optimizeArticles([article.id])}
                              className="h-8 w-8 p-0"
                            >
                              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
                            </Button>
                          )}
                          {!article.shopify_blog_id && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => syncToShopify([article.id])}
                              className="h-8 w-8 p-0"
                            >
                              <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteArticle(article.id)}
                            className="h-8 w-8 p-0 text-destructive"
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Blog Wizard */}
      {showWizard && (
        <BlogWizard
          onClose={() => {
            setShowWizard(false);
            loadArticles();
          }}
          categories={categories}
        />
      )}

      {/* Optimization Results Dialog */}
      <ResultsDialog
        open={showOptimizationResults}
        onOpenChange={setShowOptimizationResults}
        type="seo"
        items={optimizedArticles.map(article => ({
          id: article.id,
          title: article.title,
          seo_title: article.title,
          seo_description: article.meta_description
        }))}
        onSyncClick={() => {
          const articleIds = optimizedArticles.map(a => a.id);
          setShowOptimizationResults(false);
          syncToShopify(articleIds);
        }}
        onClose={() => {
          setShowOptimizationResults(false);
          setSelectedArticles([]);
        }}
      />

      {/* Featured Image Dialog */}
      {selectedArticleForImage && (
        <ArticleFeaturedImageDialog
          open={showImageDialog}
          onOpenChange={setShowImageDialog}
          article={selectedArticleForImage}
          onImageUpdated={loadArticles}
        />
      )}
    </div>
  );
}