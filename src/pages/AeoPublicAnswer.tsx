import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Helmet } from "react-helmet-async";
import { 
  MessageSquare, TrendingUp, ArrowLeft, 
  ExternalLink, Share2, Copy, Check 
} from "lucide-react";
import { toast } from "sonner";

interface AeoAnswerData {
  id: string;
  question: string;
  direct_answer: string;
  platform: string;
  citation_potential: number;
  brand_name: string;
  slug: string;
  created_at: string;
  keywords: string[] | null;
  category: string | null;
}

export default function AeoPublicAnswer() {
  const { brand, slug } = useParams<{ brand: string; slug: string }>();
  const [answer, setAnswer] = useState<AeoAnswerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (brand && slug) {
      fetchAnswer();
      incrementViewCount();
    }
  }, [brand, slug]);

  const fetchAnswer = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_answers')
        .select('*')
        .eq('brand_name', brand)
        .eq('slug', slug)
        .eq('is_published', true)
        .single();

      if (error) throw error;
      setAnswer(data);
    } catch (error) {
      console.error('Error fetching answer:', error);
    } finally {
      setLoading(false);
    }
  };

  const incrementViewCount = async () => {
    // View count will be incremented via separate mechanism
    // Avoiding RPC call for now to simplify
    console.log('View tracked for:', brand, slug);
  };

  const copyToClipboard = async () => {
    if (!answer) return;
    await navigator.clipboard.writeText(answer.direct_answer);
    setCopied(true);
    toast.success("Réponse copiée !");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareAnswer = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: answer?.question,
          text: answer?.direct_answer,
          url
        });
      } catch (error) {
        await navigator.clipboard.writeText(url);
        toast.success("Lien copié !");
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Lien copié !");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950/20 to-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!answer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950/20 to-slate-950 flex items-center justify-center">
        <Card className="bg-slate-900/80 border-violet-500/20 p-8 text-center max-w-md">
          <MessageSquare className="w-12 h-12 text-violet-400/50 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Réponse non trouvée</h1>
          <p className="text-white/60 mb-6">Cette réponse AEO n'existe pas ou n'est plus disponible.</p>
          <Link to="/landing">
            <Button className="bg-violet-600 hover:bg-violet-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour à Aeoreply
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  // JSON-LD structured data for AEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [{
      "@type": "Question",
      "name": answer.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": answer.direct_answer
      }
    }],
    "publisher": {
      "@type": "Organization",
      "name": answer.brand_name || "Aeoreply",
      "url": `https://aeoreply.com/${answer.brand_name}`
    }
  };

  return (
    <>
      <Helmet>
        <title>{answer.question} | {answer.brand_name} - Aeoreply</title>
        <meta name="description" content={answer.direct_answer.slice(0, 160)} />
        <meta property="og:title" content={answer.question} />
        <meta property="og:description" content={answer.direct_answer.slice(0, 160)} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://aeoreply.com/${answer.brand_name}/answers/${answer.slug}`} />
        <link rel="canonical" href={`https://aeoreply.com/${answer.brand_name}/answers/${answer.slug}`} />
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950/20 to-slate-950">
        {/* Header */}
        <header className="border-b border-violet-500/20 bg-slate-900/50 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/landing" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="font-semibold text-white">Aeoreply</span>
            </Link>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={shareAnswer} className="text-white/70 hover:text-white">
                <Share2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={copyToClipboard} className="text-white/70 hover:text-white">
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 py-12">
          {/* Brand Badge */}
          <div className="mb-6">
            <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30">
              {answer.brand_name}
            </Badge>
          </div>

          {/* Question (H1) */}
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-8 leading-tight">
            {answer.question}
          </h1>

          {/* Answer Card - THE AEO ANSWER */}
          <Card className="bg-slate-900/80 border-violet-500/30 p-8 mb-8">
            <p className="text-lg md:text-xl text-white/90 leading-relaxed aeo-answer">
              {answer.direct_answer}
            </p>
          </Card>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-4 mb-12">
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
              <TrendingUp className="w-3 h-3 mr-1" />
              Score AEO: {answer.citation_potential}%
            </Badge>
            <Badge variant="outline" className="border-blue-500/30 text-blue-400">
              {answer.platform}
            </Badge>
            {answer.category && (
              <Badge variant="outline" className="border-violet-500/30 text-violet-400">
                {answer.category}
              </Badge>
            )}
          </div>

          {/* Keywords */}
          {answer.keywords && answer.keywords.length > 0 && (
            <div className="mb-12">
              <h2 className="text-sm font-medium text-white/50 mb-3">Mots-clés associés</h2>
              <div className="flex flex-wrap gap-2">
                {answer.keywords.map((keyword, i) => (
                  <Badge key={i} variant="secondary" className="bg-slate-800 text-white/70">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Source Attribution */}
          <div className="border-t border-violet-500/20 pt-8">
            <p className="text-white/50 text-sm">
              Source : <strong className="text-white/70">{answer.brand_name}</strong> via Aeoreply
            </p>
            <p className="text-white/40 text-xs mt-2">
              Publié le {new Date(answer.created_at).toLocaleDateString('fr-FR', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
        </main>

        {/* Footer CTA */}
        <footer className="border-t border-violet-500/20 bg-slate-900/50 py-8">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <p className="text-white/60 mb-4">
              Optimisez votre visibilité sur les assistants IA
            </p>
            <Link to="/auth?mode=signup">
              <Button className="bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600">
                Créer vos réponses AEO
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </footer>
      </div>
    </>
  );
}
