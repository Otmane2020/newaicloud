import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/lib/language";
import { aeoTranslations } from "@/lib/translations/aeo";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  Zap, ArrowRight, ArrowLeft, Search, Tag, FileText, 
  Globe, Users, Building, Check, Sparkles, Link
} from "lucide-react";

interface AeoOnboardingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

type InputType = 'url' | 'keywords' | 'pages';

interface WizardData {
  inputType: InputType | null;
  url: string;
  keywords: string[];
  businessType: string;
  industry: string;
  targetAudience: string;
  language: string;
}

export function AeoOnboardingWizard({ open, onOpenChange, onComplete }: AeoOnboardingWizardProps) {
  const navigate = useNavigate();
  const { language } = useTranslation();
  const { user } = useAuth();
  const t = aeoTranslations[language] || aeoTranslations.fr;
  
  const [step, setStep] = useState(1);
  const [keywordInput, setKeywordInput] = useState("");
  const [data, setData] = useState<WizardData>({
    inputType: null,
    url: "",
    keywords: [],
    businessType: "",
    industry: "",
    targetAudience: "",
    language: language,
  });

  const inputTypes = [
    {
      type: 'url' as InputType,
      title: language === 'fr' ? "Analyser une URL" : "Analyze a URL",
      description: language === 'fr' ? "Entrez une URL pour identifier les opportunités AEO" : "Enter a URL to identify AEO opportunities",
      icon: Search,
      color: "from-violet-500 to-purple-500"
    },
    {
      type: 'keywords' as InputType,
      title: language === 'fr' ? "Mots-clés" : "Keywords",
      description: language === 'fr' ? "Générez des questions et réponses à partir de mots-clés" : "Generate questions and answers from keywords",
      icon: Tag,
      color: "from-blue-500 to-cyan-500"
    },
    {
      type: 'pages' as InputType,
      title: language === 'fr' ? "Pages spécifiques" : "Specific pages",
      description: language === 'fr' ? "Analysez des pages produits via une intégration" : "Analyze product pages via an integration",
      icon: FileText,
      color: "from-emerald-500 to-teal-500",
      requiresIntegration: true
    },
  ];

  const businessTypes = [
    { value: "ecommerce", label: language === 'fr' ? "E-commerce" : "E-commerce" },
    { value: "saas", label: "SaaS" },
    { value: "blog", label: language === 'fr' ? "Blog / Média" : "Blog / Media" },
    { value: "consulting", label: language === 'fr' ? "Consulting / Services" : "Consulting / Services" },
    { value: "agency", label: language === 'fr' ? "Agence" : "Agency" },
    { value: "other", label: language === 'fr' ? "Autre" : "Other" },
  ];

  const industries = [
    { value: "tech", label: language === 'fr' ? "Technologie" : "Technology" },
    { value: "fashion", label: language === 'fr' ? "Mode" : "Fashion" },
    { value: "health", label: language === 'fr' ? "Santé" : "Health" },
    { value: "finance", label: language === 'fr' ? "Finance" : "Finance" },
    { value: "education", label: language === 'fr' ? "Éducation" : "Education" },
    { value: "food", label: language === 'fr' ? "Alimentation" : "Food" },
    { value: "travel", label: language === 'fr' ? "Voyage" : "Travel" },
    { value: "home", label: language === 'fr' ? "Maison / Déco" : "Home / Decor" },
    { value: "other", label: language === 'fr' ? "Autre" : "Other" },
  ];

  const targetAudiences = [
    { value: "b2c", label: "B2C" },
    { value: "b2b", label: "B2B" },
    { value: "both", label: language === 'fr' ? "Les deux" : "Both" },
  ];

  const languages = [
    { value: "fr", label: "Français" },
    { value: "en", label: "English" },
    { value: "es", label: "Español" },
    { value: "de", label: "Deutsch" },
    { value: "it", label: "Italiano" },
  ];

  const addKeyword = () => {
    if (keywordInput.trim() && !data.keywords.includes(keywordInput.trim())) {
      setData(prev => ({ ...prev, keywords: [...prev.keywords, keywordInput.trim()] }));
      setKeywordInput("");
    }
  };

  const removeKeyword = (keyword: string) => {
    setData(prev => ({ ...prev, keywords: prev.keywords.filter(k => k !== keyword) }));
  };

  const canProceedStep1 = data.inputType !== null;
  const canProceedStep2 = data.businessType && data.industry && data.targetAudience && data.language;
  const canProceedStep3 = (data.inputType === 'url' && data.url) || 
                          (data.inputType === 'keywords' && data.keywords.length > 0) ||
                          (data.inputType === 'pages');

  const handleComplete = async () => {
    // Mark onboarding as complete
    if (user) {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);
    }
    onComplete();
    navigate('/wizard');
  };

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-slate-950 border-violet-500/20 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-white text-xl">
                {language === 'fr' ? "Bienvenue sur Aeoreply" : "Welcome to Aeoreply"}
              </DialogTitle>
              <DialogDescription className="text-white/60">
                {language === 'fr' 
                  ? "Configurez votre première analyse AEO en quelques étapes"
                  : "Set up your first AEO analysis in a few steps"}
              </DialogDescription>
            </div>
          </div>
          <Progress value={progress} className="h-1 bg-slate-800 mt-4" />
          <div className="flex justify-between text-xs text-white/40 mt-1">
            <span>{language === 'fr' ? `Étape ${step} sur ${totalSteps}` : `Step ${step} of ${totalSteps}`}</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </DialogHeader>

        <div className="py-6">
          {/* Step 1: Choose Input Type */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-white mb-2">
                  {language === 'fr' ? "Comment voulez-vous commencer ?" : "How do you want to start?"}
                </h3>
                <p className="text-white/60 text-sm">
                  {language === 'fr' 
                    ? "Choisissez votre méthode d'analyse préférée"
                    : "Choose your preferred analysis method"}
                </p>
              </div>
              <div className="grid gap-4">
                {inputTypes.map((input) => (
                  <Card 
                    key={input.type}
                    className={`p-4 cursor-pointer transition-all border-2 ${
                      data.inputType === input.type 
                        ? 'border-violet-500 bg-violet-500/10' 
                        : 'border-slate-700 bg-slate-900/50 hover:border-violet-500/50'
                    } ${input.requiresIntegration ? 'opacity-60' : ''}`}
                    onClick={() => !input.requiresIntegration && setData(prev => ({ ...prev, inputType: input.type }))}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${input.color} flex items-center justify-center shadow-lg`}>
                        <input.icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-white">{input.title}</h4>
                          {input.requiresIntegration && (
                            <Badge variant="outline" className="text-xs border-violet-500/50 text-violet-400">
                              <Link className="w-3 h-3 mr-1" />
                              {language === 'fr' ? "Intégration requise" : "Integration required"}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-white/60">{input.description}</p>
                      </div>
                      {data.inputType === input.type && (
                        <Check className="w-5 h-5 text-violet-400" />
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Context */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-white mb-2">
                  {language === 'fr' ? "Parlez-nous de votre activité" : "Tell us about your business"}
                </h3>
                <p className="text-white/60 text-sm">
                  {language === 'fr' 
                    ? "Ces informations nous aideront à optimiser vos résultats"
                    : "This information will help us optimize your results"}
                </p>
              </div>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label className="text-white/80 flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    {language === 'fr' ? "Type d'activité" : "Business type"}
                  </Label>
                  <Select value={data.businessType} onValueChange={(v) => setData(prev => ({ ...prev, businessType: v }))}>
                    <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
                      <SelectValue placeholder={language === 'fr' ? "Sélectionnez..." : "Select..."} />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {businessTypes.map(bt => (
                        <SelectItem key={bt.value} value={bt.value} className="text-white">{bt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-white/80 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    {language === 'fr' ? "Secteur" : "Industry"}
                  </Label>
                  <Select value={data.industry} onValueChange={(v) => setData(prev => ({ ...prev, industry: v }))}>
                    <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
                      <SelectValue placeholder={language === 'fr' ? "Sélectionnez..." : "Select..."} />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {industries.map(ind => (
                        <SelectItem key={ind.value} value={ind.value} className="text-white">{ind.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-white/80 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {language === 'fr' ? "Audience cible" : "Target audience"}
                  </Label>
                  <Select value={data.targetAudience} onValueChange={(v) => setData(prev => ({ ...prev, targetAudience: v }))}>
                    <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
                      <SelectValue placeholder={language === 'fr' ? "Sélectionnez..." : "Select..."} />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {targetAudiences.map(ta => (
                        <SelectItem key={ta.value} value={ta.value} className="text-white">{ta.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-white/80 flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    {language === 'fr' ? "Langue du contenu" : "Content language"}
                  </Label>
                  <Select value={data.language} onValueChange={(v) => setData(prev => ({ ...prev, language: v }))}>
                    <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {languages.map(lang => (
                        <SelectItem key={lang.value} value={lang.value} className="text-white">{lang.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Input Data */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-white mb-2">
                  {data.inputType === 'url' 
                    ? (language === 'fr' ? "Entrez votre URL" : "Enter your URL")
                    : (language === 'fr' ? "Ajoutez vos mots-clés" : "Add your keywords")}
                </h3>
                <p className="text-white/60 text-sm">
                  {data.inputType === 'url'
                    ? (language === 'fr' ? "Nous analyserons cette page pour trouver des opportunités AEO" : "We'll analyze this page to find AEO opportunities")
                    : (language === 'fr' ? "Nous générerons des questions basées sur ces mots-clés" : "We'll generate questions based on these keywords")}
                </p>
              </div>

              {data.inputType === 'url' && (
                <div className="space-y-2">
                  <Label className="text-white/80">{language === 'fr' ? "URL à analyser" : "URL to analyze"}</Label>
                  <Input 
                    type="url"
                    placeholder="https://example.com/page"
                    value={data.url}
                    onChange={(e) => setData(prev => ({ ...prev, url: e.target.value }))}
                    className="bg-slate-900/50 border-slate-700 text-white"
                  />
                </div>
              )}

              {data.inputType === 'keywords' && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input 
                      placeholder={language === 'fr' ? "Entrez un mot-clé" : "Enter a keyword"}
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                      className="bg-slate-900/50 border-slate-700 text-white"
                    />
                    <Button onClick={addKeyword} variant="secondary" className="bg-violet-500 hover:bg-violet-600 text-white">
                      {language === 'fr' ? "Ajouter" : "Add"}
                    </Button>
                  </div>
                  {data.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {data.keywords.map((kw) => (
                        <Badge 
                          key={kw}
                          variant="secondary" 
                          className="bg-violet-500/20 text-violet-300 border-violet-500/30 cursor-pointer hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/30"
                          onClick={() => removeKeyword(kw)}
                        >
                          {kw} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-between pt-4 border-t border-slate-800">
          {step > 1 ? (
            <Button variant="ghost" onClick={() => setStep(step - 1)} className="text-white/70 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {language === 'fr' ? "Retour" : "Back"}
            </Button>
          ) : (
            <div />
          )}
          
          {step < 3 ? (
            <Button 
              onClick={() => setStep(step + 1)} 
              disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
              className="bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 text-white"
            >
              {language === 'fr' ? "Continuer" : "Continue"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleComplete} 
              disabled={!canProceedStep3}
              className="bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 text-white"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {language === 'fr' ? "Générer mes opportunités" : "Generate my opportunities"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
