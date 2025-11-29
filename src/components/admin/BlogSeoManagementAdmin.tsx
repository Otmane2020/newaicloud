import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/language";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  FileText, Plus, Sparkles, Calendar, Eye, Edit, Trash2, 
  ExternalLink, Search, RefreshCw, Loader2, Lightbulb, 
  TrendingUp, Clock, CheckCircle, XCircle, Globe
} from "lucide-react";
import { format } from "date-fns";

interface PromotionalArticle {
  id: string;
  title: string;
  slug: string;
  meta_description: string | null;
  excerpt: string | null;
  content: string;
  category: string;
  featured_image: string | null;
  read_time: number | null;
  published: boolean;
  views: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

interface SuggestedTopic {
  title: string;
  description: string;
  category: string;
  keywords: string[];
}

const CATEGORIES = [
  "SEO",
  "Google Merchant",
  "AI Assistant",
  "E-commerce",
  "Shopify",
  "Product Optimization",
  "Landing Pages",
  "Blog Automation"
];

export function BlogSeoManagementAdmin() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("articles");
  const [articles, setArticles] = useState<PromotionalArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSuggestDialogOpen, setIsSuggestDialogOpen] = useState(false);
  const [suggestedTopics, setSuggestedTopics] = useState<SuggestedTopic[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [isCreatingArticle, setIsCreatingArticle] = useState(false);
  
  const [articleForm, setArticleForm] = useState({
    title: "",
    slug: "",
    meta_description: "",
    excerpt: "",
    content: "",
    category: "SEO",
    featured_image: "",
    read_time: 5,
    published: false
  });

  const [editingArticle, setEditingArticle] = useState<PromotionalArticle | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('promotional_articles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setArticles(data || []);
    } catch (error: unknown) {
      console.error('Error loading articles:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur inconnue",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleTitleChange = (title: string) => {
    setArticleForm(prev => ({
      ...prev,
      title,
      slug: generateSlug(title)
    }));
  };

  const generateTopicSuggestions = async () => {
    try {
      setIsGeneratingSuggestions(true);
      
      const { data, error } = await supabase.functions.invoke('generate-blog-seo-topics', {
        body: { count: 10 }
      });

      if (error) throw error;

      setSuggestedTopics(data.topics || []);
      setIsSuggestDialogOpen(true);
    } catch (error: unknown) {
      console.error('Error generating suggestions:', error);
      toast({
        title: "Erreur lors de la génération",
        description: error instanceof Error ? error.message : "Erreur inconnue",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  const selectSuggestedTopic = (topic: SuggestedTopic) => {
    setArticleForm({
      title: topic.title,
      slug: generateSlug(topic.title),
      meta_description: topic.description,
      excerpt: topic.description,
      content: "",
      category: topic.category,
      featured_image: "",
      read_time: 5,
      published: false
    });
    setIsSuggestDialogOpen(false);
    setIsCreateDialogOpen(true);
  };

  const generateArticleContent = async () => {
    if (!articleForm.title) {
      toast({
        title: "Titre requis",
        description: "Entrez d'abord un titre",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsCreatingArticle(true);
      
      const { data, error } = await supabase.functions.invoke('generate-promotional-article', {
        body: { 
          title: articleForm.title,
          category: articleForm.category,
          keywords: articleForm.meta_description
        }
      });

      if (error) throw error;

      setArticleForm(prev => ({
        ...prev,
        content: data.content || "",
        meta_description: data.meta_description || prev.meta_description,
        excerpt: data.excerpt || prev.excerpt,
        read_time: data.read_time || 5
      }));

      toast({
        title: "Contenu généré",
        description: "Vérifiez avant de publier"
      });
    } catch (error: unknown) {
      console.error('Error generating content:', error);
      toast({
        title: "Erreur lors de la génération",
        description: error instanceof Error ? error.message : "Erreur inconnue",
        variant: "destructive"
      });
    } finally {
      setIsCreatingArticle(false);
    }
  };

  const createArticle = async () => {
    if (!articleForm.title || !articleForm.content) {
      toast({
        title: "Champs requis",
        description: "Le titre et le contenu sont requis",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsCreatingArticle(true);

      const { error } = await supabase
        .from('promotional_articles')
        .insert({
          title: articleForm.title,
          slug: articleForm.slug,
          meta_description: articleForm.meta_description,
          excerpt: articleForm.excerpt,
          content: articleForm.content,
          category: articleForm.category,
          featured_image: articleForm.featured_image || null,
          read_time: articleForm.read_time,
          published: articleForm.published,
          published_at: articleForm.published ? new Date().toISOString() : null
        });

      if (error) throw error;

      toast({
        title: "Article créé",
        description: articleForm.published ? "Article publié avec succès" : "Article enregistré en brouillon"
      });

      setIsCreateDialogOpen(false);
      resetForm();
      loadArticles();
    } catch (error: unknown) {
      console.error('Error creating article:', error);
      toast({
        title: "Erreur lors de la création",
        description: error instanceof Error ? error.message : "Erreur inconnue",
        variant: "destructive"
      });
    } finally {
      setIsCreatingArticle(false);
    }
  };

  const updateArticle = async () => {
    if (!editingArticle) return;

    try {
      setIsCreatingArticle(true);

      const { error } = await supabase
        .from('promotional_articles')
        .update({
          title: articleForm.title,
          slug: articleForm.slug,
          meta_description: articleForm.meta_description,
          excerpt: articleForm.excerpt,
          content: articleForm.content,
          category: articleForm.category,
          featured_image: articleForm.featured_image || null,
          read_time: articleForm.read_time,
          published: articleForm.published,
          published_at: articleForm.published && !editingArticle.published_at 
            ? new Date().toISOString() 
            : editingArticle.published_at
        })
        .eq('id', editingArticle.id);

      if (error) throw error;

      toast({
        title: "Article mis à jour",
        description: "Modifications enregistrées"
      });

      setIsEditDialogOpen(false);
      setEditingArticle(null);
      resetForm();
      loadArticles();
    } catch (error: unknown) {
      console.error('Error updating article:', error);
      toast({
        title: "Erreur lors de la mise à jour",
        description: error instanceof Error ? error.message : "Erreur inconnue",
        variant: "destructive"
      });
    } finally {
      setIsCreatingArticle(false);
    }
  };

  const deleteArticle = async (articleId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet article ?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('promotional_articles')
        .delete()
        .eq('id', articleId);

      if (error) throw error;

      toast({
        title: "Article supprimé",
        description: "Article supprimé avec succès"
      });

      loadArticles();
    } catch (error: unknown) {
      console.error('Error deleting article:', error);
      toast({
        title: "Erreur lors de la suppression",
        description: error instanceof Error ? error.message : "Erreur inconnue",
        variant: "destructive"
      });
    }
  };

  const togglePublish = async (article: PromotionalArticle) => {
    try {
      const { error } = await supabase
        .from('promotional_articles')
        .update({
          published: !article.published,
          published_at: !article.published ? new Date().toISOString() : article.published_at
        })
        .eq('id', article.id);

      if (error) throw error;

      toast({
        title: article.published ? "Article dépublié" : "Article publié",
        description: article.published ? "L'article est maintenant un brouillon" : "L'article est maintenant en ligne"
      });

      loadArticles();
    } catch (error: unknown) {
      console.error('Error toggling publish:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur inconnue",
        variant: "destructive"
      });
    }
  };

  const startEdit = (article: PromotionalArticle) => {
    setEditingArticle(article);
    setArticleForm({
      title: article.title,
      slug: article.slug,
      meta_description: article.meta_description || "",
      excerpt: article.excerpt || "",
      content: article.content,
      category: article.category,
      featured_image: article.featured_image || "",
      read_time: article.read_time || 5,
      published: article.published
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setArticleForm({
      title: "",
      slug: "",
      meta_description: "",
      excerpt: "",
      content: "",
      category: "SEO",
      featured_image: "",
      read_time: 5,
      published: false
    });
  };

  const filteredArticles = articles.filter(article => {
    const matchesSearch = !searchTerm || 
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || article.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const stats = {
    total: articles.length,
    published: articles.filter(a => a.published).length,
    drafts: articles.filter(a => !a.published).length,
    totalViews: articles.reduce((sum, a) => sum + (a.views || 0), 0)
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Globe className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Blog SEO NewAI</h1>
            <p className="text-sm text-muted-foreground">
              Gérer les articles promotionnels pour newai.sale/blog-NewAI
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={generateTopicSuggestions}
            disabled={isGeneratingSuggestions}
          >
            {isGeneratingSuggestions ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Lightbulb className="h-4 w-4 mr-2" />
            )}
            Suggérer des sujets
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Créer un article
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total articles</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.published}</p>
                <p className="text-xs text-muted-foreground">Publiés</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{stats.drafts}</p>
                <p className="text-xs text-muted-foreground">Brouillons</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Eye className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Vues totales</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="articles">
            <FileText className="h-4 w-4 mr-2" />
            Articles
          </TabsTrigger>
          <TabsTrigger value="campaigns">
            <TrendingUp className="h-4 w-4 mr-2" />
            Campagnes IA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="articles">
          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher des articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterCategory || "all"} onValueChange={(v) => setFilterCategory(v === "all" ? null : v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Toutes catégories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes catégories</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadArticles}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
          </div>

          {/* Articles List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredArticles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Aucun article trouvé</h3>
                <p className="text-muted-foreground mb-4">
                  Créez votre premier article pour améliorer le SEO
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer un article
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredArticles.map(article => (
                <Card key={article.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={article.published ? "default" : "secondary"}>
                            {article.published ? "Publié" : "Brouillon"}
                          </Badge>
                          <Badge variant="outline">{article.category}</Badge>
                        </div>
                        <h3 className="text-lg font-semibold mb-1">{article.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {article.excerpt || article.meta_description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(article.created_at), 'dd MMM yyyy')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {article.views} vues
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {article.read_time || 5} min
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/blog-newai/${article.slug}`, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(article)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => togglePublish(article)}
                        >
                          {article.published ? (
                            <XCircle className="h-4 w-4" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteArticle(article.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <CardTitle>Campagnes de contenu IA</CardTitle>
              <CardDescription>
                Planifiez la génération automatique d'articles pour les différentes fonctionnalités de NewAI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Sparkles className="h-12 w-12 mx-auto text-primary mb-4" />
                <p className="text-muted-foreground mb-4">
                  Campagnes IA bientôt disponibles. Utilisez 'Suggérer des sujets' pour générer des idées d'articles maintenant.
                </p>
                <Button onClick={generateTopicSuggestions} disabled={isGeneratingSuggestions}>
                  {isGeneratingSuggestions ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Lightbulb className="h-4 w-4 mr-2" />
                  )}
                  Générer des idées
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Suggest Topics Dialog */}
      <Dialog open={isSuggestDialogOpen} onOpenChange={setIsSuggestDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sujets suggérés</DialogTitle>
            <DialogDescription>
              Sélectionnez un sujet pour créer un article
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {suggestedTopics.map((topic, index) => (
              <Card 
                key={index} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => selectSuggestedTopic(topic)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Badge variant="outline" className="mb-2">{topic.category}</Badge>
                      <h4 className="font-semibold mb-1">{topic.title}</h4>
                      <p className="text-sm text-muted-foreground">{topic.description}</p>
                      {topic.keywords && topic.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {topic.keywords.slice(0, 5).map((keyword, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">{keyword}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button size="sm" variant="ghost">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Article Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setIsEditDialogOpen(false);
          setEditingArticle(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingArticle ? "Modifier l'article" : "Créer un nouvel article"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Titre</Label>
                <Input
                  value={articleForm.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Entrez le titre de l'article..."
                />
              </div>
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select value={articleForm.category} onValueChange={(v) => setArticleForm(prev => ({ ...prev, category: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={articleForm.slug}
                onChange={(e) => setArticleForm(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="article-url-slug"
              />
            </div>

            <div className="space-y-2">
              <Label>Meta Description</Label>
              <Textarea
                value={articleForm.meta_description}
                onChange={(e) => setArticleForm(prev => ({ ...prev, meta_description: e.target.value }))}
                placeholder="Meta description SEO..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Extrait</Label>
              <Textarea
                value={articleForm.excerpt}
                onChange={(e) => setArticleForm(prev => ({ ...prev, excerpt: e.target.value }))}
                placeholder="Court extrait pour les cartes d'articles..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Contenu (HTML)</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateArticleContent}
                  disabled={isCreatingArticle || !articleForm.title}
                >
                  {isCreatingArticle ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Générer avec l'IA
                </Button>
              </div>
              <Textarea
                value={articleForm.content}
                onChange={(e) => setArticleForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Contenu de l'article au format HTML..."
                rows={10}
                className="font-mono text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>URL de l'image principale</Label>
                <Input
                  value={articleForm.featured_image}
                  onChange={(e) => setArticleForm(prev => ({ ...prev, featured_image: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label>Temps de lecture (minutes)</Label>
                <Input
                  type="number"
                  value={articleForm.read_time}
                  onChange={(e) => setArticleForm(prev => ({ ...prev, read_time: parseInt(e.target.value) || 5 }))}
                  min={1}
                  max={60}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="published"
                  checked={articleForm.published}
                  onChange={(e) => setArticleForm(prev => ({ ...prev, published: e.target.checked }))}
                  className="h-4 w-4"
                />
                <Label htmlFor="published">Publier immédiatement</Label>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setIsEditDialogOpen(false);
                    setEditingArticle(null);
                    resetForm();
                  }}
                >
                  Annuler
                </Button>
                <Button
                  onClick={editingArticle ? updateArticle : createArticle}
                  disabled={isCreatingArticle}
                >
                  {isCreatingArticle ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  {editingArticle ? "Enregistrer" : "Créer l'article"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
