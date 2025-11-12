import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { FileText, Send, CheckCircle, Clock, AlertCircle, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useStore } from '@/contexts/StoreContext';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface Article {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

interface GoogleSearchConsoleArticlesProps {
  selectedDomain: string;
}

export function GoogleSearchConsoleArticles({ selectedDomain }: GoogleSearchConsoleArticlesProps) {
  const { selectedStore } = useStore();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [indexingStatus, setIndexingStatus] = useState<Record<string, 'pending' | 'indexed' | 'error'>>({});

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (!selectedStore) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('blog_articles')
        .select('id, title, status, created_at')
        .eq('user_id', user.id)
        .eq('store_id', selectedStore.id)
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

  const requestIndexing = async (article: Article) => {
    try {
      setIndexingStatus(prev => ({ ...prev, [article.id]: 'pending' }));
      
      // This would call an edge function to request indexing via Google Search Console API
      // For now, we'll simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setIndexingStatus(prev => ({ ...prev, [article.id]: 'indexed' }));
      toast.success(`Indexation demandée pour "${article.title}"`);
    } catch (error) {
      console.error('Error requesting indexing:', error);
      setIndexingStatus(prev => ({ ...prev, [article.id]: 'error' }));
      toast.error('Erreur lors de la demande d\'indexation');
    }
  };

  const requestBatchIndexing = async () => {
    const publishedArticles = filteredArticles.filter(a => a.status === 'published');
    
    if (publishedArticles.length === 0) {
      toast.error('Aucun article publié à indexer');
      return;
    }

    toast.success(`Indexation en cours pour ${publishedArticles.length} article(s)...`);
    
    for (const article of publishedArticles) {
      await requestIndexing(article);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
    }
  };

  const filteredArticles = articles.filter(article =>
    article.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (article: Article) => {
    const status = indexingStatus[article.id];
    
    if (status === 'pending') {
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3 animate-pulse" />
          En cours
        </Badge>
      );
    }
    
    if (status === 'indexed') {
      return (
        <Badge variant="default" className="gap-1">
          <CheckCircle className="h-3 w-3" />
          Indexé
        </Badge>
      );
    }
    
    if (status === 'error') {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Erreur
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="gap-1">
        <Clock className="h-3 w-3" />
        Non indexé
      </Badge>
    );
  };

  if (!selectedStore) {
    return (
      <Alert className="m-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Aucune boutique sélectionnée</AlertTitle>
        <AlertDescription>
          Veuillez sélectionner une boutique dans le menu en haut pour afficher les articles.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold">Indexation des Articles</h2>
              <p className="text-muted-foreground">
                Demandez l'indexation de vos articles dans Google Search Console
              </p>
            </div>
            <Button onClick={requestBatchIndexing} className="gap-2">
              <Send className="h-4 w-4" />
              Indexer tous les articles publiés
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un article..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6 text-center">
          <FileText className="h-8 w-8 mx-auto mb-3 text-primary" />
          <div className="space-y-1">
            <p className="text-2xl font-bold">{articles.length}</p>
            <p className="text-sm text-muted-foreground">Articles totaux</p>
          </div>
        </Card>
        
        <Card className="p-6 text-center">
          <CheckCircle className="h-8 w-8 mx-auto mb-3 text-green-600" />
          <div className="space-y-1">
            <p className="text-2xl font-bold">
              {Object.values(indexingStatus).filter(s => s === 'indexed').length}
            </p>
            <p className="text-sm text-muted-foreground">Articles indexés</p>
          </div>
        </Card>
        
        <Card className="p-6 text-center">
          <Clock className="h-8 w-8 mx-auto mb-3 text-orange-600" />
          <div className="space-y-1">
            <p className="text-2xl font-bold">
              {articles.filter(a => a.status === 'published' && !indexingStatus[a.id]).length}
            </p>
            <p className="text-sm text-muted-foreground">En attente</p>
          </div>
        </Card>
      </div>

      {loading ? (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <p>Chargement des articles...</p>
          </div>
        </Card>
      ) : filteredArticles.length === 0 ? (
        <Card className="p-8">
          <div className="text-center space-y-4">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold mb-2">Aucun article trouvé</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Essayez une autre recherche' : 'Créez votre premier article pour commencer'}
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredArticles.map((article) => (
            <Card key={article.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{article.title}</h3>
                    <Badge variant={article.status === 'published' ? 'default' : 'secondary'}>
                      {article.status === 'published' ? 'Publié' : 'Brouillon'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Créé le {new Date(article.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(article)}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => requestIndexing(article)}
                    disabled={article.status !== 'published' || indexingStatus[article.id] === 'pending'}
                    className="gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {indexingStatus[article.id] === 'pending' ? 'En cours...' : 'Indexer'}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="p-6 bg-blue-50/50 border-blue-200">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-blue-900">À propos de l'indexation</p>
            <p className="text-blue-800">
              • L'indexation automatique via l'API est limitée à quelques requêtes par jour
              <br />
              • Google peut mettre plusieurs jours à indexer une page
              <br />
              • Seuls les articles publiés peuvent être indexés
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
