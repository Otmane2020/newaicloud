import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Trash2, 
  Edit, 
  Share2, 
  ExternalLink,
  Calendar,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

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
}

export default function ArticleManagement() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('blog_articles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      console.error('Error loading articles:', error);
      toast.error('Erreur lors du chargement des articles');
    } finally {
      setLoading(false);
    }
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

  const publishToShopify = async (articleId: string) => {
    try {
      toast.info('Publication sur Shopify en cours...');
      
      const { data, error } = await supabase.functions.invoke('sync-blog-to-shopify', {
        body: { article_ids: [articleId] }
      });

      if (error) throw error;
      
      toast.success('Article publié sur Shopify');
      loadArticles();
    } catch (error) {
      console.error('Error publishing to Shopify:', error);
      toast.error('Erreur lors de la publication');
    }
  };

  const shareArticle = async (article: Article) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: article.meta_description || '',
          url: window.location.href
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Lien copié dans le presse-papiers');
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Gestion des articles</h1>
        <p className="text-muted-foreground">Gérez, modifiez et publiez vos articles de blog</p>
      </div>

      {articles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Aucun article créé</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {articles.map((article) => (
            <Card key={article.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">{article.title}</CardTitle>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(article.created_at), 'PP', { locale: fr })}
                      </div>
                      <Badge variant={article.status === 'published' ? 'default' : 'secondary'}>
                        {article.status}
                      </Badge>
                      {article.shopify_blog_id && (
                        <Badge variant="outline" className="bg-green-50">
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Shopify
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {article.meta_description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {article.meta_description}
                  </p>
                )}
                
                {article.keywords && article.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {article.keywords.slice(0, 5).map((keyword, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/article/${article.id}`, '_blank')}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Prévisualiser
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => shareArticle(article)}
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Partager
                  </Button>
                  {!article.shopify_blog_id && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => publishToShopify(article.id)}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Publier sur Shopify
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteArticle(article.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
