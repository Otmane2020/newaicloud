import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/language";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowRight,
  ArrowLeft,
  Globe,
  Building,
  Users,
  Palette,
  Loader2,
  Check,
  X,
  Sparkles,
  Zap,
} from "lucide-react";

interface WizardData {
  websiteUrl: string;
  language: string;
  description: string;
  targetAudiences: string[];
  competitors: string[];
  brandColor: string;
  articleUrlForVoice: string;
  brandName: string;
}

const LANGUAGES = [
  { value: "fr", label: "Français", flag: "🇫🇷", audience: "430 million" },
  { value: "en", label: "English", flag: "🇬🇧", audience: "1.5 billion" },
  { value: "es", label: "Español", flag: "🇪🇸", audience: "550 million" },
  { value: "de", label: "Deutsch", flag: "🇩🇪", audience: "130 million" },
  { value: "it", label: "Italiano", flag: "🇮🇹", audience: "85 million" },
  { value: "pt", label: "Português", flag: "🇵🇹", audience: "260 million" },
];

export default function AeoSetupWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language: appLanguage } = useTranslation();
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [competitorInput, setCompetitorInput] = useState("");
  const [audienceInput, setAudienceInput] = useState("");

  const [data, setData] = useState<WizardData>({
    websiteUrl: "",
    language: "fr",
    description: "",
    targetAudiences: [],
    competitors: [],
    brandColor: "#6366f1",
    articleUrlForVoice: "",
    brandName: "",
  });

  const totalSteps = 5;
  const progress = (step / totalSteps) * 100;

  // Auto-analyze URL when user enters it
  const handleAnalyzeUrl = async () => {
    if (!data.websiteUrl) return;
    
    setIsAnalyzing(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        toast.error("Session expirée");
        return;
      }

      const { data: result, error } = await supabase.functions.invoke("analyze-website-for-aeo", {
        body: { url: data.websiteUrl },
        headers: { Authorization: `Bearer ${session.session.access_token}` },
      });

      if (error) throw error;

      if (result) {
        setData(prev => ({
          ...prev,
          description: result.description || prev.description,
          competitors: result.competitors || prev.competitors,
          brandName: result.brandName || prev.brandName,
          targetAudiences: result.targetAudiences || prev.targetAudiences,
        }));
        toast.success(appLanguage === "fr" ? "Analyse terminée !" : "Analysis complete!");
      }
    } catch (error) {
      console.error("Error analyzing URL:", error);
      toast.error(appLanguage === "fr" ? "Erreur lors de l'analyse" : "Analysis error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const addCompetitor = () => {
    if (competitorInput.trim() && !data.competitors.includes(competitorInput.trim())) {
      // Clean URL
      let url = competitorInput.trim().toLowerCase();
      url = url.replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/$/, "");
      setData(prev => ({ ...prev, competitors: [...prev.competitors, url] }));
      setCompetitorInput("");
    }
  };

  const removeCompetitor = (comp: string) => {
    setData(prev => ({ ...prev, competitors: prev.competitors.filter(c => c !== comp) }));
  };

  const addAudience = () => {
    if (audienceInput.trim() && !data.targetAudiences.includes(audienceInput.trim())) {
      setData(prev => ({ ...prev, targetAudiences: [...prev.targetAudiences, audienceInput.trim()] }));
      setAudienceInput("");
    }
  };

  const removeAudience = (aud: string) => {
    setData(prev => ({ ...prev, targetAudiences: prev.targetAudiences.filter(a => a !== aud) }));
  };

  const handleComplete = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      // Create or update the AEO project
      const { error } = await supabase.from("aeo_projects").upsert({
        user_id: user.id,
        brand_name: data.brandName || new URL(`https://${data.websiteUrl.replace(/^https?:\/\//, "")}`).hostname.split(".")[0],
        website_url: data.websiteUrl.startsWith("http") ? data.websiteUrl : `https://${data.websiteUrl}`,
        language: data.language,
        description: data.description,
        target_audiences: data.targetAudiences,
        competitors: data.competitors,
        brand_color: data.brandColor,
        article_url_for_voice: data.articleUrlForVoice || null,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id",
      });

      if (error) throw error;

      // Mark profile onboarding as complete
      await supabase.from("profiles").update({
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      }).eq("id", user.id);

      // Trigger auto-generation of AEO opportunities in the background
      try {
        const { data: session } = await supabase.auth.getSession();
        if (session?.session?.access_token) {
          // Fire and forget - don't block navigation
          supabase.functions.invoke("auto-generate-aeo", {
            body: { 
              websiteUrl: data.websiteUrl,
              language: data.language,
              competitors: data.competitors,
            },
            headers: { Authorization: `Bearer ${session.session.access_token}` },
          }).catch(err => console.log("Auto-generate AEO started in background:", err));
        }
      } catch (e) {
        console.log("Auto-generation will happen later:", e);
      }

      toast.success(appLanguage === "fr" ? "Configuration terminée ! Génération en cours..." : "Setup complete! Generating...");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error saving:", error);
      toast.error(appLanguage === "fr" ? "Erreur lors de la sauvegarde" : "Save error");
    } finally {
      setIsSaving(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return data.websiteUrl.length > 3;
      case 2: return !!data.language;
      case 3: return data.description.length > 10 && data.targetAudiences.length >= 1;
      case 4: return true; // Optional
      case 5: return true; // Optional
      default: return false;
    }
  };

  const selectedLang = LANGUAGES.find(l => l.value === data.language);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg">AEOReply</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 max-w-lg">
        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-1 rounded-full bg-primary" />
              <span className="font-medium text-primary">
                {step === 5 ? (appLanguage === "fr" ? "Étape 5 (Optionnel)" : "Step 5 (Optional)") 
                  : step === 4 ? (appLanguage === "fr" ? "Étape 4 (Optionnel)" : "Step 4 (Optional)")
                  : (appLanguage === "fr" ? `Étape ${step}` : `Step ${step}`)}
              </span>
            </div>
            <span className="text-muted-foreground">
              {appLanguage === "fr" ? `Étape ${step} sur ${totalSteps}` : `Step ${step} of ${totalSteps}`}
            </span>
          </div>
          <Progress value={progress} className="h-1" />
        </div>

        {/* Step 1: Website URL */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">
                {appLanguage === "fr" ? "Entrez l'URL de votre site" : "Insert Your Website URL"}
              </h1>
              <p className="text-muted-foreground">
                {appLanguage === "fr" 
                  ? "Entrez l'URL du site que vous souhaitez optimiser."
                  : "Enter website URL which you want to grow."}
              </p>
            </div>

            <div className="space-y-2">
              <Input
                type="url"
                placeholder={appLanguage === "fr" ? "example.com" : "example.com"}
                value={data.websiteUrl}
                onChange={(e) => setData(prev => ({ ...prev, websiteUrl: e.target.value }))}
                className="h-14 text-lg rounded-full px-6 border-2"
              />
            </div>
          </div>
        )}

        {/* Step 2: Language */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">
                {appLanguage === "fr" ? "Choisissez votre langue" : "Choose Your Language"}
              </h1>
              <p className="text-muted-foreground">
                {appLanguage === "fr" 
                  ? "Sélectionnez la langue de vos articles en fonction de votre audience cible."
                  : "Select the language of your articles based on your target audience."}
              </p>
            </div>

            <div className="rounded-2xl border-2 p-4">
              <Select value={data.language} onValueChange={(v) => setData(prev => ({ ...prev, language: v }))}>
                <SelectTrigger className="h-14 text-lg border-0 bg-transparent">
                  <SelectValue>
                    {selectedLang && (
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{selectedLang.flag}</span>
                        <span>{selectedLang.label}</span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map(lang => (
                    <SelectItem key={lang.value} value={lang.value}>
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{lang.flag}</span>
                        <span>{lang.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedLang && (
                <div className="flex items-center gap-2 mt-3 text-sm text-blue-600">
                  <Check className="w-4 h-4" />
                  <span>
                    {appLanguage === "fr" 
                      ? `Audience potentielle ${selectedLang.audience}` 
                      : `Potential audience ${selectedLang.audience}`}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Business Description */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">
                {appLanguage === "fr" ? "Décrivez votre activité" : "Describe Your Business"}
              </h1>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{appLanguage === "fr" ? "Description" : "Description"}</Label>
                <Textarea
                  placeholder={appLanguage === "fr" 
                    ? "Décrivez votre entreprise, vos produits et services..."
                    : "Describe your business, products and services..."}
                  value={data.description}
                  onChange={(e) => setData(prev => ({ ...prev, description: e.target.value }))}
                  className="min-h-[150px] rounded-2xl border-2 p-4"
                />
                {isAnalyzing && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {appLanguage === "fr" ? "Analyse en cours..." : "Analyzing..."}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>
                    {appLanguage === "fr" ? "Audience cible (min 2)" : "Target Audience (min 2)"}
                  </Label>
                  <Users className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder={appLanguage === "fr" ? "ex: propriétaires de maison" : "e.g. business owners in Florida"}
                    value={audienceInput}
                    onChange={(e) => setAudienceInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAudience())}
                    className="flex-1 rounded-full border-2"
                  />
                  <Button 
                    type="button"
                    onClick={addAudience}
                    size="icon"
                    className="rounded-full bg-primary shrink-0"
                  >
                    <span className="text-xl">+</span>
                  </Button>
                </div>
                {data.targetAudiences.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {data.targetAudiences.map((aud) => (
                      <Badge 
                        key={aud}
                        variant="secondary"
                        className="rounded-full px-4 py-2 text-sm bg-slate-800 text-white flex items-center gap-2"
                      >
                        {aud}
                        <button onClick={() => removeAudience(aud)} className="hover:text-red-300">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Competitors */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">
                {appLanguage === "fr" ? "Sélectionnez vos concurrents" : "Select your competitors"}
              </h1>
              <p className="text-muted-foreground">
                {appLanguage === "fr" 
                  ? "Cette étape est optionnelle. Vous pouvez toujours ajouter des concurrents plus tard."
                  : "This step is optional. You can always add competitors later in settings."}
              </p>
            </div>

            <div className="rounded-2xl border-2 p-4 bg-slate-50">
              <p className="text-sm text-muted-foreground mb-3">
                {appLanguage === "fr" 
                  ? "Si vous ajoutez des concurrents, nous pourrons mieux :"
                  : "If you add competitors, we can better:"}
              </p>
              <ul className="text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>
                    <strong>{appLanguage === "fr" ? "Trouver des sujets tendance" : "Find trending topics"}</strong>
                    {" "}{appLanguage === "fr" ? "et des lacunes de contenu pour garder une longueur d'avance." : "and content gaps to stay ahead of the competition."}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>
                    <strong>{appLanguage === "fr" ? "Identifier les mots-clés du secteur" : "Identify industry keywords"}</strong>
                    {" "}{appLanguage === "fr" ? "pour comprendre le langage de votre domaine." : "to understand the language of your domain."}
                  </span>
                </li>
              </ul>
              <p className="text-sm text-primary mt-3 italic">
                {appLanguage === "fr" 
                  ? "Vous pouvez toujours ajouter des concurrents plus tard dans les paramètres."
                  : "You can always add competitors later in settings."}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder={appLanguage === "fr" ? "Tapez un domaine concurrent (ex: competitor.com)" : "Type competitor domain (e.g. competitor.com)"}
                  value={competitorInput}
                  onChange={(e) => setCompetitorInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCompetitor())}
                  className="flex-1 rounded-full border-2"
                />
                <Button 
                  type="button"
                  onClick={addCompetitor}
                  size="icon"
                  className="rounded-full bg-primary shrink-0"
                >
                  <span className="text-xl">+</span>
                </Button>
              </div>
              {data.competitors.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {data.competitors.map((comp) => (
                    <Badge 
                      key={comp}
                      variant="secondary"
                      className="rounded-full px-4 py-2 text-sm bg-slate-100 text-slate-800 flex items-center gap-2"
                    >
                      <Globe className="w-3 h-3 text-blue-500" />
                      {comp}
                      <button onClick={() => removeCompetitor(comp)} className="hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 5: Brand */}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">
                {appLanguage === "fr" ? "Personnalisez votre marque" : "Let us know your brand"}
              </h1>
            </div>

            <div className="rounded-2xl border-2 p-4 bg-slate-50">
              <ul className="text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>
                    <strong>{appLanguage === "fr" ? "La couleur de marque" : "Brand color"}</strong>
                    {" "}{appLanguage === "fr" ? "est utilisée pour styliser les articles" : "is used to style the articles"}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>
                    <strong>{appLanguage === "fr" ? "L'article exemple" : "Example article"}</strong>
                    {" "}{appLanguage === "fr" ? "est utilisé pour correspondre à votre style et ton d'écriture" : "is used to match your writing style and tone"}
                  </span>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>{appLanguage === "fr" ? "Couleur de marque (optionnel)" : "Brand Color (optional)"}</Label>
                  <Palette className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex items-center gap-3 rounded-full border-2 p-3">
                  <input
                    type="color"
                    value={data.brandColor}
                    onChange={(e) => setData(prev => ({ ...prev, brandColor: e.target.value }))}
                    className="w-10 h-10 rounded-lg cursor-pointer border-0"
                  />
                  <Input
                    value={data.brandColor}
                    onChange={(e) => setData(prev => ({ ...prev, brandColor: e.target.value }))}
                    className="flex-1 border-0 bg-transparent text-lg font-mono"
                    placeholder="#000000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>{appLanguage === "fr" ? "URL d'article pour la voix de marque (optionnel)" : "Article URL for brand voice (optional)"}</Label>
                  <Building className="w-4 h-4 text-muted-foreground" />
                </div>
                <Input
                  placeholder="https://yourwebsite.com/article-title"
                  value={data.articleUrlForVoice}
                  onChange={(e) => setData(prev => ({ ...prev, articleUrlForVoice: e.target.value }))}
                  className="rounded-full border-2 h-12"
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="sticky bottom-0 bg-white border-t p-4">
        <div className="container mx-auto max-w-lg flex gap-3">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              className="rounded-full"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          
          <Button
            className="flex-1 h-14 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-lg font-medium"
            disabled={!canProceed() || isSaving || isAnalyzing}
            onClick={() => {
              if (step === 1 && !data.description) {
                // Auto-analyze when leaving step 1
                handleAnalyzeUrl();
              }
              if (step < totalSteps) {
                setStep(step + 1);
              } else {
                handleComplete();
              }
            }}
          >
            {isSaving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {step < totalSteps 
                  ? (appLanguage === "fr" ? "Continuer" : "Continue")
                  : (appLanguage === "fr" ? "Terminer" : "Finish")}
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      </footer>
    </div>
  );
}
