import { useState, useEffect } from "react";
import { useTranslation } from "@/lib/language";
import { aeoTranslations } from "@/lib/translations/aeo";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { 
  FileText, Search, Eye, Edit, Trash2, RefreshCw, 
  Calendar, TrendingUp, Sparkles, ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";

interface AeoArticle {
  id: string;
  title: string;
  content: string;
  meta_description: string | null;
  keywords: string[] | null;
  status: string | null;
  created_at: string;
  published_at: string | null;
  featured_image: string | null;
}

export default function AeoArticles() {
  const { language } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const t = aeoTranslations[language] || aeoTranslations.fr;
  
  const [articles, setArticles] = useState<AeoArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (user) {
      fetchArticles();
    }
  }, [user]);

  const fetchArticles = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('blog_articles')
        .select('*')
        .eq('user_id', user.id)
        .eq('source', 'aeo')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string | null) => {
    const colors: Record<string, string> = {
      draft: "bg-slate-500/20 text-slate-400 border-slate-500/30",
      published: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      scheduled: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    };
    return colors[status || 'draft'] || colors.draft;
  };

  const filteredArticles = articles.filter(article => 
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.meta_description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const deleteArticle = async (id: string) => {
    if (!confirm(language === 'fr' ? "Supprimer cet article ?" : "Delete this article?")) return;
    
    try {
      const { error } = await supabase
        .from('blog_articles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setArticles(prev => prev.filter(a => a.id !== id));
      toast.success(language === 'fr' ? "Article supprimé" : "Article deleted");
    } catch (error) {
      toast.error(language === 'fr' ? "Erreur lors de la suppression" : "Error deleting article");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">
            {language === 'fr' ? "Articles AEO" : "AEO Articles"}
          </h1>
          <p className="text-white/60 mt-1">
            {language === 'fr' 
              ? "Vos articles optimisés pour les assistants IA"
              : "Your articles optimized for AI assistants"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={fetchArticles}
            variant="outline" 
            className="border-violet-500/50 text-white hover:bg-violet-500/10"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {language === 'fr' ? "Actualiser" : "Refresh"}
          </Button>
          <Button 
            onClick={() => navigate('/wizard')}
            className="bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 text-white"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {language === 'fr' ? "Nouveau" : "New"}
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <Input 
          placeholder={language === 'fr' ? "Rechercher un article..." : "Search articles..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-slate-900/50 border-slate-700 text-white"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900/50 border-violet-500/20 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{articles.length}</p>
              <p className="text-xs text-white/50">{language === 'fr' ? "Total articles" : "Total articles"}</p>
            </div>
          </div>
        </Card>
        <Card className="bg-slate-900/50 border-violet-500/20 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {articles.filter(a => a.status === 'published').length}
              </p>
              <p className="text-xs text-white/50">{language === 'fr' ? "Publiés" : "Published"}</p>
            </div>
          </div>
        </Card>
        <Card className="bg-slate-900/50 border-violet-500/20 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center">
              <Edit className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {articles.filter(a => a.status === 'draft' || !a.status).length}
              </p>
              <p className="text-xs text-white/50">{language === 'fr' ? "Brouillons" : "Drafts"}</p>
            </div>
          </div>
        </Card>
        <Card className="bg-slate-900/50 border-violet-500/20 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {articles.filter(a => {
                  const date = new Date(a.created_at);
                  const now = new Date();
                  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                }).length}
              </p>
              <p className="text-xs text-white/50">{language === 'fr' ? "Ce mois" : "This month"}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Articles List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 text-violet-400 animate-spin" />
        </div>
      ) : filteredArticles.length === 0 ? (
        <Card className="bg-slate-900/50 border-violet-500/20 p-12 text-center">
          <FileText className="w-12 h-12 text-violet-400/50 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            {language === 'fr' ? "Aucun article AEO" : "No AEO articles yet"}
          </h3>
          <p className="text-white/60 mb-6">
            {language === 'fr' 
              ? "Créez des articles optimisés pour les assistants IA."
              : "Create articles optimized for AI assistants."}
          </p>
          <Button 
            onClick={() => navigate('/wizard')}
            className="bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 text-white"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {language === 'fr' ? "Créer mon premier article" : "Create my first article"}
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredArticles.map((article) => (
            <Card key={article.id} className="bg-slate-900/50 border-violet-500/20 p-6 hover:border-violet-500/40 transition-all">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-start gap-3">
                    {article.featured_image && (
                      <img 
                        src={article.featured_image} 
                        alt={article.title}
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-white text-lg line-clamp-1">{article.title}</h3>
                      {article.meta_description && (
                        <p className="text-white/60 text-sm line-clamp-2 mt-1">{article.meta_description}</p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge className={getStatusColor(article.status)}>
                          {article.status === 'published' 
                            ? (language === 'fr' ? "Publié" : "Published")
                            : (language === 'fr' ? "Brouillon" : "Draft")}
                        </Badge>
                        <Badge variant="outline" className="border-slate-600 text-slate-400">
                          <Calendar className="w-3 h-3 mr-1" />
                          {format(new Date(article.created_at), 'dd MMM yyyy', { 
                            locale: language === 'fr' ? fr : enUS 
                          })}
                        </Badge>
                        {article.keywords && article.keywords.length > 0 && (
                          <Badge variant="outline" className="border-violet-500/30 text-violet-400">
                            {article.keywords.length} {language === 'fr' ? "mots-clés" : "keywords"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-white/60 hover:text-white"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-white/60 hover:text-white"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => deleteArticle(article.id)}
                    className="text-white/60 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
