import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Globe, 
  Hash, 
  Link as LinkIcon, 
  Loader2, 
  Sparkles,
  ArrowRight,
  Plus,
  X,
  Building2,
  Info
} from "lucide-react";
import { useTranslation } from "@/lib/language";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { toast } from "sonner";

interface WizardMode {
  id: 'url' | 'keywords' | 'links';
  enabled: boolean;
}

interface AeoProject {
  id: string;
  brand_name: string;
  website_url: string | null;
  language: string;
}

// AI platforms for AEO targeting
const AI_TARGETS = ['chatgpt', 'gemini', 'claude', 'perplexity', 'copilot'] as const;
type AiTarget = typeof AI_TARGETS[number];

interface AeoWizardProps {
  onOpportunitiesGenerated?: () => void;
}

export function AeoWizard({ onOpportunitiesGenerated }: AeoWizardProps) {
  const { language } = useTranslation();
  const { user } = useAuth();
  const { selectedStore } = useStore();
  
  // Project management
  const [projects, setProjects] = useState<AeoProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<AeoProject | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [newWebsiteUrl, setNewWebsiteUrl] = useState("");
  
  const [modes, setModes] = useState<WizardMode[]>([
    { id: 'url', enabled: false },
    { id: 'keywords', enabled: false },
    { id: 'links', enabled: false }
  ]);
  
  const [urlInput, setUrlInput] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [links, setLinks] = useState<string[]>([]);
  const [linkInput, setLinkInput] = useState("");
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string>("");

  // Fetch existing projects
  useEffect(() => {
    if (user?.id) {
      fetchProjects();
    }
  }, [user?.id]);

  const fetchProjects = async () => {
    if (!user?.id) return;
    
    const { data, error } = await supabase
      .from('aeo_projects')
      .select('id, brand_name, website_url, language')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setProjects(data);
      if (data.length > 0 && !selectedProject) {
        setSelectedProject(data[0]);
      }
    }
  };

  const createProject = async () => {
    if (!user?.id || !newBrandName.trim()) return;
    
    const { data, error } = await supabase
      .from('aeo_projects')
      .insert({
        user_id: user.id,
        brand_name: newBrandName.trim(),
        website_url: newWebsiteUrl.trim() || null,
        language: language
      })
      .select()
      .single();
    
    if (!error && data) {
      setProjects(prev => [data, ...prev]);
      setSelectedProject(data);
      setNewBrandName("");
      setNewWebsiteUrl("");
      setIsCreatingProject(false);
      toast.success(language === 'fr' ? 'Projet créé' : 'Project created');
    } else {
      toast.error(language === 'fr' ? 'Erreur lors de la création' : 'Error creating project');
    }
  };

  const modeConfig = {
    url: {
      icon: Globe,
      title: language === 'fr' ? 'URL du site' : 'Website URL',
      description: language === 'fr' 
        ? 'Analysez une URL pour extraire les sujets et intentions' 
        : 'Analyze a URL to extract topics and intents',
      color: 'text-blue-500'
    },
    keywords: {
      icon: Hash,
      title: language === 'fr' ? 'Mots-clés' : 'Keywords',
      description: language === 'fr' 
        ? 'Entrez des mots-clés pour générer des opportunités' 
        : 'Enter keywords to generate opportunities',
      color: 'text-green-500'
    },
    links: {
      icon: LinkIcon,
      title: language === 'fr' ? 'Liens' : 'Links',
      description: language === 'fr' 
        ? 'Analysez des pages produits, articles ou landing pages' 
        : 'Analyze product pages, articles or landing pages',
      color: 'text-purple-500'
    }
  };

  const toggleMode = (modeId: 'url' | 'keywords' | 'links') => {
    setModes(prev => prev.map(m => 
      m.id === modeId ? { ...m, enabled: !m.enabled } : m
    ));
  };

  const addKeyword = () => {
    if (keywordInput.trim() && !keywords.includes(keywordInput.trim())) {
      setKeywords(prev => [...prev, keywordInput.trim()]);
      setKeywordInput("");
    }
  };

  const removeKeyword = (keyword: string) => {
    setKeywords(prev => prev.filter(k => k !== keyword));
  };

  const addLink = () => {
    if (linkInput.trim() && !links.includes(linkInput.trim())) {
      setLinks(prev => [...prev, linkInput.trim()]);
      setLinkInput("");
    }
  };

  const removeLink = (link: string) => {
    setLinks(prev => prev.filter(l => l !== link));
  };

  const hasValidInput = () => {
    if (!selectedProject) return false;
    
    const enabledModes = modes.filter(m => m.enabled);
    if (enabledModes.length === 0) return false;
    
    for (const mode of enabledModes) {
      if (mode.id === 'url' && !urlInput.trim()) return false;
      if (mode.id === 'keywords' && keywords.length === 0) return false;
      if (mode.id === 'links' && links.length === 0) return false;
    }
    return true;
  };

  const handleGenerate = async () => {
    if (!user?.id || !hasValidInput() || !selectedProject) return;
    
    setIsGenerating(true);
    setProgress(0);
    
    try {
      const enabledModes = modes.filter(m => m.enabled);
      const totalSteps = enabledModes.length * 3;
      let currentStepNum = 0;
      
      for (const mode of enabledModes) {
        // Get the current input value for this mode
        const inputValue = mode.id === 'url' ? urlInput 
          : mode.id === 'keywords' ? keywords 
          : links;
        
        // Save source to aeo_sources
        const sourceValue = mode.id === 'url' ? urlInput : 
          mode.id === 'keywords' ? keywords.join(', ') : links[0];
        
        const { data: sourceData } = await supabase
          .from('aeo_sources')
          .insert({
            project_id: selectedProject.id,
            user_id: user.id,
            source_type: mode.id,
            value: sourceValue,
            status: 'pending'
          })
          .select()
          .single();
        
        // Step 1: Analyzing
        setCurrentStep(language === 'fr' 
          ? `Analyse ${modeConfig[mode.id].title}...` 
          : `Analyzing ${modeConfig[mode.id].title}...`);
        currentStepNum++;
        setProgress((currentStepNum / totalSteps) * 100);
        await new Promise(r => setTimeout(r, 500));
        
        // Step 2: Extracting
        setCurrentStep(language === 'fr' 
          ? `Extraction des intentions...` 
          : `Extracting intents...`);
        currentStepNum++;
        setProgress((currentStepNum / totalSteps) * 100);
        await new Promise(r => setTimeout(r, 500));
        
        // Step 3: Generating
        setCurrentStep(language === 'fr' 
          ? `Génération des opportunités AEO...` 
          : `Generating AEO opportunities...`);
        
        // Call the generation function with project context
        const { data, error } = await supabase.functions.invoke("generate-ai-query-opportunities", {
          body: {
            storeId: selectedStore?.id ?? null,
            projectType: 'aeoreply',
            platform: 'aeo',
            targets: AI_TARGETS,
            refresh: true,
            wizardMode: mode.id,
            wizardInput: inputValue,
            // Project context for brand referencing
            projectId: selectedProject.id,
            brandName: selectedProject.brand_name,
            websiteUrl: selectedProject.website_url,
            sourceId: sourceData?.id,
            sourceUrl: mode.id === 'url' ? urlInput : (mode.id === 'links' ? links[0] : null)
          }
        });
        
        if (error) throw error;
        
        // Update source status
        if (sourceData?.id) {
          await supabase
            .from('aeo_sources')
            .update({ status: 'analyzed', analyzed_at: new Date().toISOString() })
            .eq('id', sourceData.id);
        }
        
        currentStepNum++;
        setProgress((currentStepNum / totalSteps) * 100);
      }
      
      setCurrentStep(language === 'fr' ? 'Terminé !' : 'Complete!');
      setProgress(100);
      
      toast.success(language === 'fr' 
        ? `Opportunités AEO générées pour ${selectedProject.brand_name}` 
        : `AEO opportunities generated for ${selectedProject.brand_name}`);
      
      // Reset form
      setUrlInput("");
      setKeywords([]);
      setLinks([]);
      setModes(prev => prev.map(m => ({ ...m, enabled: false })));
      
      onOpportunitiesGenerated?.();
      
    } catch (error) {
      console.error("Error generating opportunities:", error);
      toast.error(language === 'fr' 
        ? 'Erreur lors de la génération' 
        : 'Error generating opportunities');
    } finally {
      setIsGenerating(false);
      setProgress(0);
      setCurrentStep("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">
          {language === 'fr' ? 'Assistant AEO' : 'AEO Wizard'}
        </h2>
        <p className="text-muted-foreground">
          {language === 'fr' 
            ? 'Sélectionnez votre projet et vos sources de données'
            : 'Select your project and data sources'}
        </p>
        
        {/* AI Targets Display */}
        <div className="flex items-center justify-center gap-2 flex-wrap pt-2">
          <span className="text-xs text-muted-foreground">
            {language === 'fr' ? 'Optimisé pour :' : 'Optimized for:'}
          </span>
          {AI_TARGETS.map((target) => (
            <Badge key={target} variant="secondary" className="text-xs capitalize">
              {target}
            </Badge>
          ))}
        </div>
      </div>

      {/* Project Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {language === 'fr' ? 'Projet / Marque' : 'Project / Brand'}
          </CardTitle>
          <CardDescription>
            {language === 'fr' 
              ? 'Les réponses mentionneront cette marque pour que les IA puissent citer votre source'
              : 'Answers will mention this brand so AIs can cite your source'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isCreatingProject ? (
            <>
              {projects.length > 0 ? (
                <Select 
                  value={selectedProject?.id || ""} 
                  onValueChange={(id) => setSelectedProject(projects.find(p => p.id === id) || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'fr' ? 'Sélectionner un projet' : 'Select a project'} />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{project.brand_name}</span>
                          {project.website_url && (
                            <span className="text-xs text-muted-foreground">({project.website_url})</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">
                  {language === 'fr' ? 'Aucun projet. Créez-en un pour commencer.' : 'No projects. Create one to get started.'}
                </p>
              )}
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => setIsCreatingProject(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                {language === 'fr' ? 'Nouveau projet' : 'New project'}
              </Button>
            </>
          ) : (
            <div className="space-y-3">
              <Input
                placeholder={language === 'fr' ? 'Nom de la marque *' : 'Brand name *'}
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
              />
              <Input
                placeholder={language === 'fr' ? 'URL du site (optionnel)' : 'Website URL (optional)'}
                value={newWebsiteUrl}
                onChange={(e) => setNewWebsiteUrl(e.target.value)}
              />
              <div className="flex gap-2">
                <Button 
                  onClick={createProject} 
                  disabled={!newBrandName.trim()}
                  className="flex-1"
                >
                  {language === 'fr' ? 'Créer' : 'Create'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreatingProject(false)}
                >
                  {language === 'fr' ? 'Annuler' : 'Cancel'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mode Selection */}
      <div className="grid md:grid-cols-3 gap-4">
        {modes.map((mode) => {
          const config = modeConfig[mode.id];
          const Icon = config.icon;
          
          return (
            <Card 
              key={mode.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                mode.enabled ? 'ring-2 ring-primary border-primary' : ''
              }`}
              onClick={() => toggleMode(mode.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg bg-muted ${config.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <Checkbox checked={mode.enabled} />
                </div>
                <CardTitle className="text-lg">{config.title}</CardTitle>
                <CardDescription className="text-sm">
                  {config.description}
                </CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* Input Fields Based on Selected Modes */}
      {modes.some(m => m.enabled) && (
        <Card>
          <CardContent className="pt-6 space-y-6">
            {/* URL Input */}
            {modes.find(m => m.id === 'url')?.enabled && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-500" />
                  {language === 'fr' ? 'URL à analyser' : 'URL to analyze'}
                </Label>
                <Input
                  placeholder="https://example.com"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                />
              </div>
            )}

            {/* Keywords Input */}
            {modes.find(m => m.id === 'keywords')?.enabled && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-green-500" />
                  {language === 'fr' ? 'Mots-clés' : 'Keywords'}
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder={language === 'fr' ? 'Ajouter un mot-clé...' : 'Add a keyword...'}
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                  />
                  <Button onClick={addKeyword} variant="outline" size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {keywords.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {keywords.map((kw) => (
                      <Badge key={kw} variant="secondary" className="pr-1">
                        {kw}
                        <button 
                          onClick={() => removeKeyword(kw)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Links Input */}
            {modes.find(m => m.id === 'links')?.enabled && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4 text-purple-500" />
                  {language === 'fr' ? 'Liens à analyser' : 'Links to analyze'}
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://..."
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLink())}
                  />
                  <Button onClick={addLink} variant="outline" size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {links.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {links.map((link) => (
                      <div key={link} className="flex items-center gap-2 text-sm bg-muted p-2 rounded">
                        <LinkIcon className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate flex-1">{link}</span>
                        <button 
                          onClick={() => removeLink(link)}
                          className="hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Progress */}
      {isGenerating && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="font-medium">{currentStep}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Generate Button */}
      <div className="space-y-3">
        <Button
          onClick={handleGenerate}
          disabled={!hasValidInput() || isGenerating}
          className="w-full"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              {language === 'fr' ? 'Génération en cours...' : 'Generating...'}
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5 mr-2" />
              {language === 'fr' ? 'Générer les opportunités AEO' : 'Generate AEO Opportunities'}
              <ArrowRight className="h-5 w-5 ml-2" />
            </>
          )}
        </Button>
        
        {/* Destination Info */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border/50">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            {selectedProject ? (
              language === 'fr' 
                ? `Les réponses mentionneront "${selectedProject.brand_name}" pour optimiser les citations IA.`
                : `Answers will mention "${selectedProject.brand_name}" to optimize AI citations.`
            ) : (
              language === 'fr' 
                ? 'Sélectionnez ou créez un projet pour commencer.'
                : 'Select or create a project to get started.'
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
