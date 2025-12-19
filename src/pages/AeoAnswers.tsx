import { useState, useEffect } from "react";
import { useTranslation } from "@/lib/language";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  MessageSquare, Search, Copy, Check, TrendingUp, 
  Sparkles, FileText, RefreshCw, ExternalLink, Share2, Globe
} from "lucide-react";
import { toast } from "sonner";

interface AeoAnswer {
  id: string;
  question: string;
  direct_answer: string;
  platform: string;
  citation_potential: number;
  query_type: string;
  status: string;
  created_at: string;
  article_id: string | null;
  slug: string | null;
  brand_name: string | null;
  is_published: boolean | null;
}

export default function AeoAnswers() {
  const { language } = useTranslation();
  const { user } = useAuth();
  
  const [answers, setAnswers] = useState<AeoAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchAnswers();
    }
  }, [user]);

  const fetchAnswers = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_answers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnswers(data || []);
    } catch (error) {
      console.error('Error fetching answers:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (question: string): string => {
    let slug = question.toLowerCase();
    slug = slug.replace(/[àáâãäå]/g, 'a');
    slug = slug.replace(/[èéêë]/g, 'e');
    slug = slug.replace(/[ìíîï]/g, 'i');
    slug = slug.replace(/[òóôõö]/g, 'o');
    slug = slug.replace(/[ùúûü]/g, 'u');
    slug = slug.replace(/[ç]/g, 'c');
    slug = slug.replace(/[^a-z0-9\s-]/g, '');
    slug = slug.replace(/\s+/g, '-');
    slug = slug.replace(/-+/g, '-');
    slug = slug.replace(/^-|-$/g, '');
    return slug.slice(0, 100);
  };

  const publishAnswer = async (answer: AeoAnswer) => {
    if (!user) return;
    
    setPublishingId(answer.id);
    try {
      // Get user's brand name from profile or use email prefix
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      
      const brandName = profile?.full_name?.toLowerCase().replace(/\s+/g, '-') || 
                        user.email?.split('@')[0] || 'aeoreply';
      const slug = generateSlug(answer.question);
      
      const { error } = await supabase
        .from('ai_answers')
        .update({
          is_published: true,
          published_at: new Date().toISOString(),
          brand_name: brandName,
          slug: slug
        })
        .eq('id', answer.id);

      if (error) throw error;
      
      toast.success(language === 'fr' ? "Réponse publiée !" : "Answer published!");
      fetchAnswers();
    } catch (error) {
      console.error('Error publishing answer:', error);
      toast.error(language === 'fr' ? "Erreur lors de la publication" : "Error publishing");
    } finally {
      setPublishingId(null);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success(language === 'fr' ? "Réponse copiée !" : "Answer copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyPublicUrl = async (answer: AeoAnswer) => {
    const url = `${window.location.origin}/${answer.brand_name}/answers/${answer.slug}`;
    await navigator.clipboard.writeText(url);
    toast.success(language === 'fr' ? "Lien public copié !" : "Public URL copied!");
  };

  const openPublicUrl = (answer: AeoAnswer) => {
    const url = `/${answer.brand_name}/answers/${answer.slug}`;
    window.open(url, '_blank');
  };

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      chatgpt: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      gemini: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      claude: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      perplexity: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
      copilot: "bg-blue-600/20 text-blue-400 border-blue-600/30",
    };
    return colors[platform.toLowerCase()] || "bg-violet-500/20 text-violet-400 border-violet-500/30";
  };

  const filteredAnswers = answers.filter(answer => 
    answer.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    answer.direct_answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">
            {language === 'fr' ? "Réponses AEO" : "AEO Answers"}
          </h1>
          <p className="text-white/60 mt-1">
            {language === 'fr' 
              ? "Vos réponses optimisées pour les assistants IA"
              : "Your answers optimized for AI assistants"}
          </p>
        </div>
        <Button 
          onClick={fetchAnswers}
          variant="outline" 
          className="border-violet-500/50 text-white hover:bg-violet-500/10"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          {language === 'fr' ? "Actualiser" : "Refresh"}
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <Input 
          placeholder={language === 'fr' ? "Rechercher une réponse..." : "Search answers..."}
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
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{answers.length}</p>
              <p className="text-xs text-white/50">{language === 'fr' ? "Total réponses" : "Total answers"}</p>
            </div>
          </div>
        </Card>
        <Card className="bg-slate-900/50 border-violet-500/20 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{answers.filter(a => a.is_published).length}</p>
              <p className="text-xs text-white/50">{language === 'fr' ? "Publiées" : "Published"}</p>
            </div>
          </div>
        </Card>
        <Card className="bg-slate-900/50 border-violet-500/20 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {answers.length > 0 
                  ? Math.round(answers.reduce((sum, a) => sum + a.citation_potential, 0) / answers.length)
                  : 0}%
              </p>
              <p className="text-xs text-white/50">{language === 'fr' ? "Score moyen" : "Avg score"}</p>
            </div>
          </div>
        </Card>
        <Card className="bg-slate-900/50 border-violet-500/20 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{answers.filter(a => a.citation_potential >= 80).length}</p>
              <p className="text-xs text-white/50">{language === 'fr' ? "Haute citation" : "High citation"}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Answers List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 text-violet-400 animate-spin" />
        </div>
      ) : filteredAnswers.length === 0 ? (
        <Card className="bg-slate-900/50 border-violet-500/20 p-12 text-center">
          <MessageSquare className="w-12 h-12 text-violet-400/50 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            {language === 'fr' ? "Aucune réponse" : "No answers yet"}
          </h3>
          <p className="text-white/60 mb-6">
            {language === 'fr' 
              ? "Générez des opportunités AEO pour créer vos premières réponses."
              : "Generate AEO opportunities to create your first answers."}
          </p>
          <Button className="bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 text-white">
            <Sparkles className="w-4 h-4 mr-2" />
            {language === 'fr' ? "Lancer l'assistant" : "Start wizard"}
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAnswers.map((answer) => (
            <Card key={answer.id} className="bg-slate-900/50 border-violet-500/20 p-6 hover:border-violet-500/40 transition-all">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-5 h-5 text-violet-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-white text-lg">{answer.question}</h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge className={getPlatformColor(answer.platform)}>
                          {answer.platform}
                        </Badge>
                        <Badge variant="outline" className="border-violet-500/30 text-violet-400">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          {answer.citation_potential}%
                        </Badge>
                        {answer.is_published && (
                          <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
                            <Globe className="w-3 h-3 mr-1" />
                            {language === 'fr' ? "Publié" : "Published"}
                          </Badge>
                        )}
                        {answer.article_id && (
                          <Badge variant="outline" className="border-blue-500/30 text-blue-400">
                            <FileText className="w-3 h-3 mr-1" />
                            {language === 'fr' ? "Article lié" : "Linked article"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4 ml-13">
                    <p className="text-white/80 text-sm leading-relaxed">{answer.direct_answer}</p>
                  </div>
                  
                  {/* Public URL display if published */}
                  {answer.is_published && answer.slug && answer.brand_name && (
                    <div className="flex items-center gap-2 ml-13 mt-2">
                      <span className="text-xs text-white/40">URL:</span>
                      <code className="text-xs text-violet-400 bg-slate-800/50 px-2 py-1 rounded">
                        /{answer.brand_name}/answers/{answer.slug}
                      </code>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => copyPublicUrl(answer)}
                        className="h-6 px-2 text-white/50 hover:text-white"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => openPublicUrl(answer)}
                        className="h-6 px-2 text-white/50 hover:text-white"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!answer.is_published ? (
                    <Button 
                      size="sm"
                      onClick={() => publishAnswer(answer)}
                      disabled={publishingId === answer.id}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {publishingId === answer.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Globe className="w-4 h-4 mr-1" />
                          {language === 'fr' ? "Publier" : "Publish"}
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => openPublicUrl(answer)}
                      className="border-violet-500/50 text-white hover:bg-violet-500/10"
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      {language === 'fr' ? "Voir" : "View"}
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => copyToClipboard(answer.direct_answer, answer.id)}
                    className="text-white/60 hover:text-white"
                  >
                    {copiedId === answer.id ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
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
