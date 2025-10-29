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
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BlogWizard } from '@/components/blog/BlogWizard';
import { OptimizationResultsDialog } from '@/components/seo/OptimizationResultsDialog';
import { useAuth } from '@/contexts/AuthContext';

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
      toast.error('Erreur lors du chargement des articles');
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
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) return;

    try {
      const { error } = await supabase
        .from('blog_articles')
        .delete()
        .eq('id', articleId);

      if (error) throw error;
      
      toast.success('Article supprimé');
      loadArticles();
    } catch (error) {
      console.error('Error deleting article:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const optimizeArticles = async (articleIds: string[]) => {
    try {
      toast.info('Optimisation SEO en cours...');
      
      const { data, error } = await supabase.functions.invoke('generate-article-seo', {
        body: { article_ids: articleIds }
      });

      if (error) throw error;
      
      // Récupérer les articles optimisés depuis la base de données
      const { data: articles, error: articlesError } = await supabase
        .from('blog_articles')
        .select('id, title, meta_description')
        .in('id', articleIds);

      if (articlesError) throw articlesError;

      // Afficher le dialog avec les résultats
      setOptimizedArticles(articles || []);
      setShowOptimizationResults(true);
      
      toast.success(`${data.success_count || articleIds.length} article(s) optimisé(s) !`);
      loadArticles();
    } catch (error) {
      console.error('Error optimizing:', error);
      toast.error('Erreur lors de l\'optimisation');
    }
  };

  const syncToShopify = async (articleIds: string[]) => {
    try {
      toast.info('Synchronisation sur Shopify en cours...');
      
      const { data, error } = await supabase.functions.invoke('sync-blog-to-shopify', {
        body: { article_ids: articleIds }
      });

      if (error) throw error;
      
      toast.success(`${data.success_count || articleIds.length} article(s) synchronisé(s) !`);
      loadArticles();
      setSelectedArticles([]);
    } catch (error) {
      console.error('Error syncing:', error);
      toast.error('Erreur lors de la synchronisation');
    }
  };

  const bulkDelete = async () => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${selectedArticles.length} articles ?`)) return;

    try {
      const { error } = await supabase
        .from('blog_articles')
        .delete()
        .in('id', selectedArticles);

      if (error) throw error;
      
      toast.success(`${selectedArticles.length} articles supprimés`);
      setSelectedArticles([]);
      loadArticles();
    } catch (error) {
      console.error('Error bulk deleting:', error);
      toast.error('Erreur lors de la suppression');
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
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">Gestion des Articles</h1>
          <Button onClick={() => setShowWizard(true)} size="lg">
            <Plus className="w-5 h-5 mr-2" />
            Créer un Article
          </Button>
        </div>
        <p className="text-muted-foreground">Gérez, modifiez et publiez vos articles de blog</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.ai}</div>
            <div className="text-xs text-muted-foreground">IA</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.shopify}</div>
            <div className="text-xs text-muted-foreground">Shopify</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">{stats.published}</div>
            <div className="text-xs text-muted-foreground">Publiés</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-cyan-600">{stats.synced}</div>
            <div className="text-xs text-muted-foreground">Synchronisés</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.seoOptimized}</div>
            <div className="text-xs text-muted-foreground">SEO Optimisé</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par titre ou description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Origine" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes origines</SelectItem>
                <SelectItem value="ai">IA NewAI</SelectItem>
                <SelectItem value="shopify">Shopify</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="draft">Brouillon</SelectItem>
                <SelectItem value="published">Publié</SelectItem>
              </SelectContent>
            </Select>

            <Select value={syncFilter} onValueChange={setSyncFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Synchronisation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="synced">Synchronisés</SelectItem>
                <SelectItem value="not_synced">Non synchronisés</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions */}
          {selectedArticles.length > 0 && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t">
              <span className="text-sm text-muted-foreground">
                {selectedArticles.length} sélectionné(s)
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => optimizeArticles(selectedArticles)}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Optimiser SEO
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => syncToShopify(selectedArticles)}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Synchroniser
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={bulkDelete}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Articles Table */}
      {filteredArticles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Aucun article trouvé</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="p-4 text-left">
                      <Checkbox
                        checked={selectedArticles.length === filteredArticles.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    <th className="p-4 text-left">Image</th>
                    <th className="p-4 text-left">Titre</th>
                    <th className="p-4 text-left">Titre SEO</th>
                    <th className="p-4 text-left">Meta Description</th>
                    <th className="p-4 text-left">Origine</th>
                    <th className="p-4 text-left">Statut</th>
                    <th className="p-4 text-left">Synchronisé</th>
                    <th className="p-4 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredArticles.map((article) => (
                    <tr key={article.id} className="border-b hover:bg-muted/30">
                      <td className="p-4">
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
                      <td className="p-4">
                        <div 
                          className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => window.open(`/article-landing/${article.id}`, '_blank')}
                        >
                          <FileText className="w-6 h-6 text-primary" />
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="max-w-xs">
                          <p 
                            className="font-medium line-clamp-2 cursor-pointer hover:text-primary transition-colors"
                            onClick={() => window.open(`/article-landing/${article.id}`, '_blank')}
                          >
                            {article.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(article.created_at), 'PP', { locale: fr })}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="max-w-xs">
                          {article.meta_description ? (
                            <p className="text-sm line-clamp-2 font-medium">
                              {article.title}
                            </p>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              <X className="w-3 h-3 mr-1" />
                              Non défini
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="max-w-xs">
                          {article.meta_description ? (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {article.meta_description}
                            </p>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              <X className="w-3 h-3 mr-1" />
                              Non optimisé
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge 
                          variant={article.source === 'ai_generated' ? 'default' : 'secondary'}
                          className={article.source === 'ai_generated' ? 'bg-blue-600' : 'bg-green-600'}
                        >
                          {article.source === 'ai_generated' ? 'IA NewAI' : 'Shopify'}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge variant={article.status === 'published' ? 'default' : 'secondary'}>
                          {article.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        {article.shopify_blog_id ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <Check className="w-3 h-3 mr-1" />
                            Oui
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            <X className="w-3 h-3 mr-1" />
                            Non
                          </Badge>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(`/article-landing/${article.id}`, '_blank')}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {!article.meta_description && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => optimizeArticles([article.id])}
                            >
                              <Sparkles className="w-4 h-4" />
                            </Button>
                          )}
                          {!article.shopify_blog_id && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => syncToShopify([article.id])}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteArticle(article.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
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
      <OptimizationResultsDialog
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
    </div>
  );
}
