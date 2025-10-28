import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  FileText, 
  Trash2, 
  Eye,
  ExternalLink,
  Calendar,
  Sparkles,
  RefreshCw,
  Upload,
  Search,
  Filter,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { BlogWizard } from '@/components/blog/BlogWizard';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  source: string;
}

export default function ArticleManagement() {
  const { user } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticles, setSelectedArticles] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [syncFilter, setSyncFilter] = useState<string>('all');
  const [optimizing, setOptimizing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      loadArticles();
    }
  }, [user]);

  const loadArticles = async () => {
    try {
      setLoading(true);
      if (!user) return;

      const { data, error } = await supabase
        .from('blog_articles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setArticles(data || []);

      // Load categories for wizard
      const { data: productsData } = await supabase
        .from('shopify_products')
        .select('category')
        .not('category', 'is', null);
      
      const uniqueCategories = [...new Set(productsData?.map(p => p.category).filter(Boolean))];
      setCategories(uniqueCategories as string[]);
    } catch (error) {
      console.error('Error loading articles:', error);
      toast.error('Erreur lors du chargement des articles');
    } finally {
      setLoading(false);
    }
  };

  const importFromShopify = async () => {
    try {
      setImporting(true);
      toast.info('Import des articles Shopify en cours...');
      
      const { data, error } = await supabase.functions.invoke('import-shopify-articles');
      
      if (error) throw error;
      
      if (data?.imported > 0) {
        toast.success(`${data.imported} article(s) importé(s) avec succès`);
      } else if (data?.skipped > 0) {
        toast.info(`Tous les articles sont déjà importés (${data.skipped} ignorés)`);
      } else {
        toast.info('Aucun article trouvé sur Shopify');
      }
      
      loadArticles();
    } catch (error: any) {
      console.error('Error importing from Shopify:', error);
      toast.error(error.message || 'Erreur lors de l\'import');
    } finally {
      setImporting(false);
    }
  };

  const optimizeArticles = async (articleIds: string[]) => {
    if (articleIds.length === 0) {
      toast.error('Sélectionnez au moins un article');
      return;
    }

    try {
      setOptimizing(true);
      toast.info(`Optimisation de ${articleIds.length} article(s)...`);
      
      const { data, error } = await supabase.functions.invoke('generate-article-seo', {
        body: { article_ids: articleIds }
      });

      if (error) throw error;
      
      toast.success('Articles optimisés avec succès');
      loadArticles();
      setSelectedArticles([]);
    } catch (error) {
      console.error('Error optimizing articles:', error);
      toast.error('Erreur lors de l\'optimisation');
    } finally {
      setOptimizing(false);
    }
  };

  const syncToShopify = async (articleIds: string[]) => {
    if (articleIds.length === 0) {
      toast.error('Sélectionnez au moins un article');
      return;
    }

    try {
      setSyncing(true);
      toast.info(`Synchronisation de ${articleIds.length} article(s)...`);
      
      const { data, error } = await supabase.functions.invoke('sync-blog-to-shopify', {
        body: { article_ids: articleIds }
      });

      if (error) throw error;
      
      toast.success('Articles synchronisés avec Shopify');
      loadArticles();
      setSelectedArticles([]);
    } catch (error) {
      console.error('Error syncing to Shopify:', error);
      toast.error('Erreur lors de la synchronisation');
    } finally {
      setSyncing(false);
    }
  };

  const deleteArticles = async (articleIds: string[]) => {
    if (articleIds.length === 0) return;
    
    if (!confirm(`Supprimer ${articleIds.length} article(s) ?`)) return;

    try {
      const { error } = await supabase
        .from('blog_articles')
        .delete()
        .in('id', articleIds);

      if (error) throw error;
      
      toast.success('Articles supprimés');
      loadArticles();
      setSelectedArticles([]);
    } catch (error) {
      console.error('Error deleting articles:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const toggleArticleSelection = (articleId: string) => {
    setSelectedArticles(prev => 
      prev.includes(articleId)
        ? prev.filter(id => id !== articleId)
        : [...prev, articleId]
    );
  };

  const toggleAllArticles = () => {
    if (selectedArticles.length === filteredArticles.length) {
      setSelectedArticles([]);
    } else {
      setSelectedArticles(filteredArticles.map(a => a.id));
    }
  };

  const filteredArticles = articles
    .filter(article => 
      searchQuery === "" || 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.meta_description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter(article => 
      statusFilter === "all" || article.status === statusFilter
    )
    .filter(article => 
      sourceFilter === "all" || article.source === sourceFilter
    )
    .filter(article => {
      if (syncFilter === "all") return true;
      if (syncFilter === "synced") return article.shopify_blog_id !== null;
      if (syncFilter === "not_synced") return article.shopify_blog_id === null;
      return true;
    });

  const stats = {
    total: articles.length,
    ai: articles.filter(a => a.source === 'ai_generated').length,
    shopify: articles.filter(a => a.source === 'shopify_import').length,
    published: articles.filter(a => a.status === 'published').length,
    synced: articles.filter(a => a.shopify_blog_id !== null).length,
    optimized: articles.filter(a => a.meta_description && a.keywords?.length > 0).length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Blog SEO</h1>
        <p className="text-muted-foreground">Importez, optimisez et synchronisez vos articles de blog</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Articles</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-500">{stats.ai}</div>
            <p className="text-xs text-muted-foreground">Articles IA</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-500">{stats.shopify}</div>
            <p className="text-xs text-muted-foreground">Articles Shopify</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-500">{stats.published}</div>
            <p className="text-xs text-muted-foreground">Publiés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-500">{stats.synced}</div>
            <p className="text-xs text-muted-foreground">Synchronisés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-pink-500">{stats.optimized}</div>
            <p className="text-xs text-muted-foreground">Optimisés SEO</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un article..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Origine" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes origines</SelectItem>
                  <SelectItem value="ai_generated">IA</SelectItem>
                  <SelectItem value="shopify_import">Shopify</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous statuts</SelectItem>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="published">Publié</SelectItem>
                  <SelectItem value="syncing">Synchronisation</SelectItem>
                  <SelectItem value="error">Erreur</SelectItem>
                </SelectContent>
              </Select>

              <Select value={syncFilter} onValueChange={setSyncFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Sync" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="synced">Synchronisés</SelectItem>
                  <SelectItem value="not_synced">Non sync</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowWizard(true)}>
                <Sparkles className="w-4 h-4 mr-2" />
                Créer un article
              </Button>
              <Button onClick={importFromShopify} disabled={importing} variant="outline">
                <Upload className="w-4 h-4 mr-2" />
                {importing ? 'Import...' : 'Importer Shopify'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedArticles.length > 0 && (
        <Card className="mb-6 border-primary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {selectedArticles.length} article(s) sélectionné(s)
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => optimizeArticles(selectedArticles)}
                  disabled={optimizing}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {optimizing ? 'Optimisation...' : 'Optimiser SEO'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => syncToShopify(selectedArticles)}
                  disabled={syncing}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {syncing ? 'Sync...' : 'Sync Shopify'}
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => deleteArticles(selectedArticles)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Articles List */}
      {filteredArticles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              {articles.length === 0 ? 'Aucun article créé' : 'Aucun résultat'}
            </p>
            {articles.length === 0 && (
              <Button onClick={importFromShopify}>
                <Upload className="w-4 h-4 mr-2" />
                Importer de Shopify
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Select All */}
          <div className="flex items-center gap-2 px-2">
            <Checkbox
              checked={selectedArticles.length === filteredArticles.length}
              onCheckedChange={toggleAllArticles}
            />
            <span className="text-sm text-muted-foreground">
              Tout sélectionner ({filteredArticles.length})
            </span>
          </div>

          {/* Articles Grid */}
          <div className="grid grid-cols-1 gap-4">
            {filteredArticles.map((article) => (
              <Card key={article.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex gap-4">
                    <div className="flex items-start pt-1">
                      <Checkbox
                        checked={selectedArticles.includes(article.id)}
                        onCheckedChange={() => toggleArticleSelection(article.id)}
                      />
                    </div>
                    
                    {/* Article Icon/Image */}
                    <div className="flex-shrink-0">
                      <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                        <FileText className="w-10 h-10 text-primary" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold mb-2 truncate">
                            {article.title}
                          </h3>
                          {article.meta_description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                              {article.meta_description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        {article.source === 'ai_generated' ? (
                          <Badge variant="default" className="bg-blue-500">
                            <Sparkles className="w-3 h-3 mr-1" />
                            IA
                          </Badge>
                        ) : (
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Shopify
                          </Badge>
                        )}
                        <Badge variant={article.status === 'published' ? 'default' : 'secondary'}>
                          {article.status}
                        </Badge>
                        {article.shopify_blog_id && article.status === 'published' && (
                          <Badge variant="outline" className="bg-green-50">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Sync OK
                          </Badge>
                        )}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(article.created_at), 'PP', { locale: fr })}
                        </div>
                      </div>

                      {article.keywords && article.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {article.keywords.slice(0, 5).map((keyword, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                          {article.keywords.length > 5 && (
                            <Badge variant="secondary" className="text-xs">
                              +{article.keywords.length - 5}
                            </Badge>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/article-landing/${article.id}`, '_blank')}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Voir
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => optimizeArticles([article.id])}
                          disabled={optimizing}
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Optimiser
                        </Button>
                        {!article.shopify_blog_id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => syncToShopify([article.id])}
                            disabled={syncing}
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Publier
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Blog Wizard Modal */}
      {showWizard && (
        <BlogWizard
          onClose={() => {
            setShowWizard(false);
            loadArticles();
          }}
          categories={categories}
        />
      )}
    </div>
  );
}
