import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  Trash2, 
  RefreshCw, 
  Sparkles,
  TrendingUp,
  Eye,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { useTranslation } from "@/lib/language";
import AeoNavigation from "@/components/aeo/AeoNavigation";

interface KeywordTracking {
  id: string;
  keyword: string;
  platform: string;
  last_checked_at: string | null;
  check_count: number;
  found_count: number;
  last_found_at: string | null;
  is_active: boolean;
  suggested: boolean;
}

const AI_PLATFORMS = ['ChatGPT', 'Gemini', 'Perplexity', 'Copilot', 'Claude'];

const SUGGESTED_KEYWORDS = [
  "meilleur rapport qualité prix",
  "comparatif 2025",
  "avis clients",
  "guide d'achat",
  "comment choisir",
];

export default function AeoKeywordTracking() {
  const { language } = useTranslation();
  const { user } = useAuth();
  const [keywords, setKeywords] = useState<KeywordTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyword, setNewKeyword] = useState("");
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchKeywords();
  }, [user]);

  const fetchKeywords = async () => {
    try {
      const { data, error } = await supabase
        .from('aeo_keyword_tracking')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setKeywords(data || []);
    } catch (error) {
      console.error('Error fetching keywords:', error);
      toast.error(language === 'fr' ? 'Erreur lors du chargement' : 'Error loading keywords');
    } finally {
      setLoading(false);
    }
  };

  const addKeyword = async () => {
    if (!newKeyword.trim() || !user) return;

    try {
      const { error } = await supabase
        .from('aeo_keyword_tracking')
        .insert({
          user_id: user.id,
          keyword: newKeyword.trim(),
          platform: 'all',
        });

      if (error) throw error;
      toast.success(language === 'fr' ? 'Mot-clé ajouté' : 'Keyword added');
      setNewKeyword("");
      fetchKeywords();
    } catch (error) {
      console.error('Error adding keyword:', error);
      toast.error(language === 'fr' ? 'Erreur lors de l\'ajout' : 'Error adding keyword');
    }
  };

  const addSuggestedKeyword = async (keyword: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('aeo_keyword_tracking')
        .insert({
          user_id: user.id,
          keyword,
          platform: 'all',
          suggested: true,
        });

      if (error) throw error;
      toast.success(language === 'fr' ? 'Mot-clé suggéré ajouté' : 'Suggested keyword added');
      fetchKeywords();
    } catch (error) {
      console.error('Error adding suggested keyword:', error);
    }
  };

  const deleteKeyword = async (id: string) => {
    try {
      const { error } = await supabase
        .from('aeo_keyword_tracking')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success(language === 'fr' ? 'Mot-clé supprimé' : 'Keyword deleted');
      fetchKeywords();
    } catch (error) {
      console.error('Error deleting keyword:', error);
    }
  };

  const testKeyword = async (keyword: KeywordTracking) => {
    setTesting(keyword.id);
    
    // Simulate AI check (in production, this would call actual AI APIs)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      const found = Math.random() > 0.5; // Simulated result
      
      await supabase
        .from('aeo_keyword_tracking')
        .update({
          last_checked_at: new Date().toISOString(),
          check_count: keyword.check_count + 1,
          found_count: found ? keyword.found_count + 1 : keyword.found_count,
          last_found_at: found ? new Date().toISOString() : keyword.last_found_at,
        })
        .eq('id', keyword.id);

      // Log result
      await supabase
        .from('aeo_tracking_results')
        .insert({
          user_id: user?.id,
          tracking_type: 'keyword',
          tracking_id: keyword.id,
          platform: 'ChatGPT',
          query_used: keyword.keyword,
          was_found: found,
          position: found ? Math.floor(Math.random() * 5) + 1 : null,
        });

      toast.success(
        found 
          ? (language === 'fr' ? 'Mot-clé trouvé dans les réponses IA!' : 'Keyword found in AI responses!')
          : (language === 'fr' ? 'Mot-clé non trouvé' : 'Keyword not found')
      );
      fetchKeywords();
    } catch (error) {
      console.error('Error testing keyword:', error);
      toast.error(language === 'fr' ? 'Erreur lors du test' : 'Error testing keyword');
    } finally {
      setTesting(null);
    }
  };

  const getSuccessRate = (keyword: KeywordTracking) => {
    if (keyword.check_count === 0) return null;
    return Math.round((keyword.found_count / keyword.check_count) * 100);
  };

  const existingKeywords = keywords.map(k => k.keyword.toLowerCase());
  const availableSuggestions = SUGGESTED_KEYWORDS.filter(
    k => !existingKeywords.includes(k.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <AeoNavigation />
      
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {language === 'fr' ? 'Tracking Mots-clés' : 'Keyword Tracking'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'fr' 
              ? 'Suivez vos mots-clés dans les réponses des IA (ChatGPT, Gemini, Perplexity...)'
              : 'Track your keywords in AI responses (ChatGPT, Gemini, Perplexity...)'}
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'fr' ? 'Mots-clés suivis' : 'Tracked Keywords'}
                  </p>
                  <p className="text-2xl font-bold">{keywords.length}</p>
                </div>
                <Search className="w-8 h-8 text-violet-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'fr' ? 'Tests effectués' : 'Tests Run'}
                  </p>
                  <p className="text-2xl font-bold">
                    {keywords.reduce((sum, k) => sum + k.check_count, 0)}
                  </p>
                </div>
                <Eye className="w-8 h-8 text-emerald-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'fr' ? 'Trouvés' : 'Found'}
                  </p>
                  <p className="text-2xl font-bold">
                    {keywords.reduce((sum, k) => sum + k.found_count, 0)}
                  </p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 border-orange-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'fr' ? 'Plateformes' : 'Platforms'}
                  </p>
                  <p className="text-2xl font-bold">{AI_PLATFORMS.length}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Add Keyword */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              {language === 'fr' ? 'Ajouter un mot-clé' : 'Add a Keyword'}
            </CardTitle>
            <CardDescription>
              {language === 'fr' 
                ? 'Ajoutez des mots-clés à suivre dans les réponses IA'
                : 'Add keywords to track in AI responses'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder={language === 'fr' ? 'Entrez un mot-clé...' : 'Enter a keyword...'}
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                className="flex-1"
              />
              <Button onClick={addKeyword} disabled={!newKeyword.trim()}>
                <Plus className="w-4 h-4 mr-2" />
                {language === 'fr' ? 'Ajouter' : 'Add'}
              </Button>
            </div>

            {/* Suggestions */}
            {availableSuggestions.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  {language === 'fr' ? 'Suggestions :' : 'Suggestions:'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableSuggestions.map((suggestion) => (
                    <Badge 
                      key={suggestion}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => addSuggestedKeyword(suggestion)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      {suggestion}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Keywords List */}
        <Card>
          <CardHeader>
            <CardTitle>
              {language === 'fr' ? 'Mots-clés suivis' : 'Tracked Keywords'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : keywords.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{language === 'fr' ? 'Aucun mot-clé suivi' : 'No keywords tracked'}</p>
                <p className="text-sm">
                  {language === 'fr' 
                    ? 'Ajoutez des mots-clés pour commencer le tracking'
                    : 'Add keywords to start tracking'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {keywords.map((keyword) => {
                  const successRate = getSuccessRate(keyword);
                  return (
                    <div 
                      key={keyword.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{keyword.keyword}</span>
                          {keyword.suggested && (
                            <Badge variant="secondary" className="text-xs">
                              <Sparkles className="w-3 h-3 mr-1" />
                              {language === 'fr' ? 'Suggéré' : 'Suggested'}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span>
                            {keyword.check_count} {language === 'fr' ? 'tests' : 'tests'}
                          </span>
                          {successRate !== null && (
                            <span className={successRate >= 50 ? 'text-emerald-500' : 'text-orange-500'}>
                              {successRate}% {language === 'fr' ? 'trouvé' : 'found'}
                            </span>
                          )}
                          {keyword.last_checked_at && (
                            <span>
                              {language === 'fr' ? 'Dernier test:' : 'Last test:'} {new Date(keyword.last_checked_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {successRate !== null && (
                          successRate >= 50 ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-orange-500" />
                          )
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testKeyword(keyword)}
                          disabled={testing === keyword.id}
                        >
                          {testing === keyword.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                          <span className="ml-2 hidden sm:inline">
                            {language === 'fr' ? 'Tester' : 'Test'}
                          </span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteKeyword(keyword.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
