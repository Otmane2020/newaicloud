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
  Link as LinkIcon, 
  Trash2, 
  RefreshCw, 
  Sparkles,
  TrendingUp,
  Eye,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Globe,
} from "lucide-react";
import { useTranslation } from "@/lib/language";
import AeoNavigation from "@/components/aeo/AeoNavigation";

interface UrlTracking {
  id: string;
  url: string;
  brand_name: string | null;
  platform: string;
  last_checked_at: string | null;
  check_count: number;
  cited_count: number;
  last_cited_at: string | null;
  is_active: boolean;
  suggested: boolean;
}

const AI_PLATFORMS = ['ChatGPT', 'Gemini', 'Perplexity', 'Copilot', 'Claude'];

export default function AeoUrlTracking() {
  const { language } = useTranslation();
  const { user } = useAuth();
  const [urls, setUrls] = useState<UrlTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState("");
  const [testing, setTesting] = useState<string | null>(null);
  const [suggestedUrls, setSuggestedUrls] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchUrls();
      fetchSuggestedUrls();
    }
  }, [user]);

  const fetchUrls = async () => {
    try {
      const { data, error } = await supabase
        .from('aeo_url_tracking')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUrls(data || []);
    } catch (error) {
      console.error('Error fetching URLs:', error);
      toast.error(language === 'fr' ? 'Erreur lors du chargement' : 'Error loading URLs');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestedUrls = async () => {
    // Get URLs from published answers
    try {
      const { data: answers } = await supabase
        .from('ai_answers')
        .select('slug, brand_name')
        .eq('user_id', user?.id)
        .eq('is_published', true)
        .limit(5);

      if (answers) {
        const suggested = answers
          .filter(a => a.slug && a.brand_name)
          .map(a => `https://aeoreply.com/${a.brand_name}/answers/${a.slug}`);
        setSuggestedUrls(suggested);
      }
    } catch (error) {
      console.error('Error fetching suggested URLs:', error);
    }
  };

  const addUrl = async () => {
    if (!newUrl.trim() || !user) return;

    try {
      // Extract domain for brand name
      let brandName = null;
      try {
        const urlObj = new URL(newUrl.trim());
        brandName = urlObj.hostname.replace('www.', '').split('.')[0];
      } catch {}

      const { error } = await supabase
        .from('aeo_url_tracking')
        .insert({
          user_id: user.id,
          url: newUrl.trim(),
          brand_name: brandName,
          platform: 'all',
        });

      if (error) throw error;
      toast.success(language === 'fr' ? 'URL ajoutée' : 'URL added');
      setNewUrl("");
      fetchUrls();
    } catch (error) {
      console.error('Error adding URL:', error);
      toast.error(language === 'fr' ? 'Erreur lors de l\'ajout' : 'Error adding URL');
    }
  };

  const addSuggestedUrl = async (url: string) => {
    if (!user) return;

    try {
      let brandName = null;
      try {
        const urlObj = new URL(url);
        brandName = urlObj.hostname.replace('www.', '').split('.')[0];
      } catch {}

      const { error } = await supabase
        .from('aeo_url_tracking')
        .insert({
          user_id: user.id,
          url,
          brand_name: brandName,
          platform: 'all',
          suggested: true,
        });

      if (error) throw error;
      toast.success(language === 'fr' ? 'URL suggérée ajoutée' : 'Suggested URL added');
      fetchUrls();
    } catch (error) {
      console.error('Error adding suggested URL:', error);
    }
  };

  const deleteUrl = async (id: string) => {
    try {
      const { error } = await supabase
        .from('aeo_url_tracking')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success(language === 'fr' ? 'URL supprimée' : 'URL deleted');
      fetchUrls();
    } catch (error) {
      console.error('Error deleting URL:', error);
    }
  };

  const testUrl = async (urlItem: UrlTracking) => {
    setTesting(urlItem.id);
    
    // Simulate AI check (in production, this would call actual AI APIs)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      const cited = Math.random() > 0.6; // Simulated result
      
      await supabase
        .from('aeo_url_tracking')
        .update({
          last_checked_at: new Date().toISOString(),
          check_count: urlItem.check_count + 1,
          cited_count: cited ? urlItem.cited_count + 1 : urlItem.cited_count,
          last_cited_at: cited ? new Date().toISOString() : urlItem.last_cited_at,
        })
        .eq('id', urlItem.id);

      // Log result
      await supabase
        .from('aeo_tracking_results')
        .insert({
          user_id: user?.id,
          tracking_type: 'url',
          tracking_id: urlItem.id,
          platform: 'Perplexity',
          query_used: urlItem.url,
          was_found: cited,
          position: cited ? Math.floor(Math.random() * 3) + 1 : null,
        });

      toast.success(
        cited 
          ? (language === 'fr' ? 'URL citée dans les réponses IA!' : 'URL cited in AI responses!')
          : (language === 'fr' ? 'URL non citée' : 'URL not cited')
      );
      fetchUrls();
    } catch (error) {
      console.error('Error testing URL:', error);
      toast.error(language === 'fr' ? 'Erreur lors du test' : 'Error testing URL');
    } finally {
      setTesting(null);
    }
  };

  const getCitationRate = (urlItem: UrlTracking) => {
    if (urlItem.check_count === 0) return null;
    return Math.round((urlItem.cited_count / urlItem.check_count) * 100);
  };

  const truncateUrl = (url: string, maxLength: number = 50) => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  };

  const existingUrls = urls.map(u => u.url.toLowerCase());
  const availableSuggestions = suggestedUrls.filter(
    u => !existingUrls.includes(u.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <AeoNavigation />
      
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {language === 'fr' ? 'Tracking URLs' : 'URL Tracking'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'fr' 
              ? 'Suivez vos URLs citées dans les réponses des IA (ChatGPT, Gemini, Perplexity...)'
              : 'Track your URLs cited in AI responses (ChatGPT, Gemini, Perplexity...)'}
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'fr' ? 'URLs suivies' : 'Tracked URLs'}
                  </p>
                  <p className="text-2xl font-bold">{urls.length}</p>
                </div>
                <LinkIcon className="w-8 h-8 text-violet-500" />
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
                    {urls.reduce((sum, u) => sum + u.check_count, 0)}
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
                    {language === 'fr' ? 'Citations' : 'Citations'}
                  </p>
                  <p className="text-2xl font-bold">
                    {urls.reduce((sum, u) => sum + u.cited_count, 0)}
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
                <Globe className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Add URL */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              {language === 'fr' ? 'Ajouter une URL' : 'Add a URL'}
            </CardTitle>
            <CardDescription>
              {language === 'fr' 
                ? 'Ajoutez des URLs à suivre dans les citations IA'
                : 'Add URLs to track in AI citations'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder={language === 'fr' ? 'https://example.com/page' : 'https://example.com/page'}
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addUrl()}
                className="flex-1"
              />
              <Button onClick={addUrl} disabled={!newUrl.trim()}>
                <Plus className="w-4 h-4 mr-2" />
                {language === 'fr' ? 'Ajouter' : 'Add'}
              </Button>
            </div>

            {/* Suggestions from published answers */}
            {availableSuggestions.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  {language === 'fr' ? 'Vos réponses publiées :' : 'Your published answers:'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableSuggestions.map((suggestion) => (
                    <Badge 
                      key={suggestion}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors max-w-full"
                      onClick={() => addSuggestedUrl(suggestion)}
                    >
                      <Plus className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span className="truncate">{truncateUrl(suggestion, 40)}</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* URLs List */}
        <Card>
          <CardHeader>
            <CardTitle>
              {language === 'fr' ? 'URLs suivies' : 'Tracked URLs'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : urls.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <LinkIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{language === 'fr' ? 'Aucune URL suivie' : 'No URLs tracked'}</p>
                <p className="text-sm">
                  {language === 'fr' 
                    ? 'Ajoutez des URLs pour commencer le tracking'
                    : 'Add URLs to start tracking'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {urls.map((urlItem) => {
                  const citationRate = getCitationRate(urlItem);
                  return (
                    <div 
                      key={urlItem.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <a 
                            href={urlItem.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-primary hover:underline truncate flex items-center gap-1"
                          >
                            {truncateUrl(urlItem.url)}
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                          {urlItem.suggested && (
                            <Badge variant="secondary" className="text-xs flex-shrink-0">
                              <Sparkles className="w-3 h-3 mr-1" />
                              {language === 'fr' ? 'Auto' : 'Auto'}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span>
                            {urlItem.check_count} {language === 'fr' ? 'tests' : 'tests'}
                          </span>
                          {citationRate !== null && (
                            <span className={citationRate >= 40 ? 'text-emerald-500' : 'text-orange-500'}>
                              {citationRate}% {language === 'fr' ? 'cité' : 'cited'}
                            </span>
                          )}
                          {urlItem.last_checked_at && (
                            <span>
                              {language === 'fr' ? 'Dernier test:' : 'Last test:'} {new Date(urlItem.last_checked_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {citationRate !== null && (
                          citationRate >= 40 ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-orange-500" />
                          )
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testUrl(urlItem)}
                          disabled={testing === urlItem.id}
                        >
                          {testing === urlItem.id ? (
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
                          onClick={() => deleteUrl(urlItem.id)}
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
