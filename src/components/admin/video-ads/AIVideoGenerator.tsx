import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sparkles, 
  Image as ImageIcon, 
  Type, 
  Loader2, 
  Play, 
  Clock, 
  Zap,
  Film,
  Wand2,
  Check,
  Banana
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AIVideoGeneratorProps {
  onVideoGenerated: (videoUrl: string, title: string) => void;
}

const PROMPT_TEMPLATES = [
  {
    id: "product-showcase",
    name: "Showcase Produit",
    icon: "🎬",
    prompt: "A product rotating elegantly on a clean white background with soft studio lighting",
  },
  {
    id: "lifestyle",
    name: "Lifestyle",
    icon: "🏠",
    prompt: "A cozy modern living room with natural lighting, product placed naturally in the scene",
  },
  {
    id: "promo",
    name: "Promo Flash",
    icon: "⚡",
    prompt: "Dynamic promotional video with energetic movements, bright colors, and attention-grabbing effects",
  },
  {
    id: "unboxing",
    name: "Unboxing",
    icon: "📦",
    prompt: "Hands opening a premium package, revealing product with satisfying reveal moment",
  },
  {
    id: "ambient",
    name: "Ambiance",
    icon: "✨",
    prompt: "Atmospheric scene with soft particles, gentle camera movements, product as focal point",
  },
  {
    id: "tech",
    name: "Tech Demo",
    icon: "🔮",
    prompt: "Futuristic presentation with holographic effects, sleek animations, product features highlighted",
  },
];

const NANO_BANANA_TEMPLATES = [
  {
    id: "product-hero",
    name: "Hero Shot",
    icon: "🌟",
    prompt: "Professional product photography, premium lighting, clean background, commercial quality",
  },
  {
    id: "lifestyle-scene",
    name: "Lifestyle Scene",
    icon: "🏡",
    prompt: "Product in a beautiful lifestyle setting, natural lighting, warm ambiance, magazine quality",
  },
  {
    id: "abstract-promo",
    name: "Abstract Promo",
    icon: "🎨",
    prompt: "Abstract colorful background with product floating, dynamic composition, eye-catching",
  },
  {
    id: "minimal",
    name: "Minimal Clean",
    icon: "⬜",
    prompt: "Ultra minimalist composition, white space, single product focus, elegant simplicity",
  },
];

export function AIVideoGenerator({ onVideoGenerated }: AIVideoGeneratorProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"image-to-video" | "text-to-video" | "nano-banana">("text-to-video");
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [duration, setDuration] = useState(4);
  const [motionIntensity, setMotionIntensity] = useState<"subtle" | "medium" | "dynamic">("medium");
  const [style, setStyle] = useState<"cinematic" | "commercial" | "lifestyle">("cinematic");
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "16:9" | "9:16" | "4:3">("16:9");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [autoConvertToVideo, setAutoConvertToVideo] = useState(true);

  const handleTemplateSelect = (template: typeof PROMPT_TEMPLATES[0]) => {
    setPrompt(template.prompt);
  };

  const handleNanoBananaTemplateSelect = (template: typeof NANO_BANANA_TEMPLATES[0]) => {
    setPrompt(template.prompt);
  };

  const convertImageToVideo = async (imageUrlToConvert: string) => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-video-clip", {
        body: {
          mode: "image-to-video",
          imageUrl: imageUrlToConvert,
          duration,
          motionIntensity,
          style,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setGeneratedVideoUrl(data.videoUrl);
      toast({ title: "🎬 Vidéo générée avec succès!" });
    } catch (error: any) {
      console.error("Error converting to video:", error);
      toast({
        title: "Erreur de conversion vidéo",
        description: error.message || "Impossible de créer la vidéo",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      toast({ title: "Veuillez entrer un prompt", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setGeneratedImageUrl(null);
    setGeneratedVideoUrl(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate-nano-banana-image", {
        body: {
          prompt,
          aspectRatio,
          style,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setGeneratedImageUrl(data.imageUrl);
      toast({ title: "🍌 Image générée avec Nano Banana Pro!" });

      // Auto-convert to video if enabled
      if (autoConvertToVideo) {
        toast({ title: "🎬 Conversion en vidéo en cours..." });
        await convertImageToVideo(data.imageUrl);
      }
    } catch (error: any) {
      console.error("Error generating image:", error);
      toast({
        title: "Erreur de génération",
        description: error.message || "Impossible de générer l'image",
        variant: "destructive",
      });
      setIsGenerating(false);
    }
  };

  const handleConvertToVideo = async () => {
    if (!generatedImageUrl) return;

    setIsGenerating(true);
    setGeneratedVideoUrl(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate-video-clip", {
        body: {
          mode: "image-to-video",
          imageUrl: generatedImageUrl,
          duration,
          motionIntensity,
          style,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setGeneratedVideoUrl(data.videoUrl);
      toast({ title: "Vidéo créée à partir de l'image!" });
    } catch (error: any) {
      console.error("Error converting to video:", error);
      toast({
        title: "Erreur de conversion",
        description: error.message || "Impossible de créer la vidéo",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate = async () => {
    if (mode === "nano-banana") {
      await handleGenerateImage();
      return;
    }

    if (mode === "text-to-video" && !prompt.trim()) {
      toast({ title: "Veuillez entrer un prompt", variant: "destructive" });
      return;
    }
    if (mode === "image-to-video" && !imageUrl.trim()) {
      toast({ title: "Veuillez entrer l'URL d'une image", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setGeneratedVideoUrl(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate-video-clip", {
        body: {
          mode,
          prompt: mode === "text-to-video" ? prompt : undefined,
          imageUrl: mode === "image-to-video" ? imageUrl : undefined,
          duration,
          motionIntensity,
          style,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setGeneratedVideoUrl(data.videoUrl);
      toast({ title: "Vidéo générée avec succès!" });
    } catch (error: any) {
      console.error("Error generating video:", error);
      toast({
        title: "Erreur de génération",
        description: error.message || "Impossible de générer la vidéo",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddToLibrary = () => {
    if (generatedVideoUrl) {
      const title = prompt.slice(0, 30) || "AI Generated Clip";
      onVideoGenerated(generatedVideoUrl, title);
      toast({ title: "Clip ajouté à la bibliothèque" });
      setIsOpen(false);
      setGeneratedVideoUrl(null);
      setGeneratedImageUrl(null);
      setPrompt("");
    }
  };

  const handleReset = () => {
    setGeneratedVideoUrl(null);
    setGeneratedImageUrl(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600">
          <Wand2 className="w-4 h-4" />
          Générer Clip IA
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-5 h-5 text-purple-400" />
            Génération Vidéo IA
          </DialogTitle>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => { setMode(v as typeof mode); handleReset(); }} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="text-to-video" className="gap-2">
              <Type className="w-4 h-4" />
              Texte → Vidéo
            </TabsTrigger>
            <TabsTrigger value="image-to-video" className="gap-2">
              <ImageIcon className="w-4 h-4" />
              Image → Vidéo
            </TabsTrigger>
            <TabsTrigger value="nano-banana" className="gap-2 text-yellow-500">
              <Banana className="w-4 h-4" />
              Nano Banana Pro
            </TabsTrigger>
          </TabsList>

          {/* Text to Video */}
          <TabsContent value="text-to-video" className="space-y-4 mt-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Templates de prompt</Label>
              <div className="grid grid-cols-3 gap-2">
                {PROMPT_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className="p-3 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                  >
                    <div className="text-2xl mb-1">{template.icon}</div>
                    <div className="text-xs font-medium">{template.name}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="prompt" className="text-sm font-medium">
                Prompt personnalisé
              </Label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Décrivez la vidéo que vous souhaitez générer..."
                className="mt-2 min-h-[100px]"
              />
            </div>
          </TabsContent>

          {/* Image to Video */}
          <TabsContent value="image-to-video" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="imageUrl" className="text-sm font-medium">
                URL de l'image source
              </Label>
              <Textarea
                id="imageUrl"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://exemple.com/image-produit.jpg"
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                L'image sera animée pour créer une vidéo fluide
              </p>
            </div>

            {imageUrl && (
              <div className="rounded-lg overflow-hidden border border-border/50">
                <img src={imageUrl} alt="Preview" className="w-full h-48 object-cover" />
              </div>
            )}
          </TabsContent>

          {/* Nano Banana Pro */}
          <TabsContent value="nano-banana" className="space-y-4 mt-4">
            <Card className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Banana className="w-5 h-5 text-yellow-500" />
                  <span className="font-bold text-yellow-500">Nano Banana Pro</span>
                  <Badge variant="outline" className="text-yellow-500 border-yellow-500">Gemini AI</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Génération d'images IA puis conversion automatique en vidéo. Workflow complet Image → Vidéo.
                </p>
              </CardContent>
            </Card>

            {/* Auto Video Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium">Générer vidéo automatiquement</span>
              </div>
              <button
                onClick={() => setAutoConvertToVideo(!autoConvertToVideo)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  autoConvertToVideo ? "bg-yellow-500" : "bg-muted"
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    autoConvertToVideo ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Templates Nano Banana</Label>
              <div className="grid grid-cols-2 gap-2">
                {NANO_BANANA_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleNanoBananaTemplateSelect(template)}
                    className="p-3 rounded-lg border border-yellow-500/30 hover:border-yellow-500 hover:bg-yellow-500/10 transition-all text-left"
                  >
                    <div className="text-2xl mb-1">{template.icon}</div>
                    <div className="text-xs font-medium">{template.name}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="nano-prompt" className="text-sm font-medium">
                Prompt personnalisé
              </Label>
              <Textarea
                id="nano-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Décrivez l'image que vous souhaitez générer..."
                className="mt-2 min-h-[100px]"
              />
            </div>

            {/* Aspect Ratio */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Format d'image</Label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { value: "1:1", label: "Carré" },
                  { value: "16:9", label: "Paysage" },
                  { value: "9:16", label: "Portrait" },
                  { value: "4:3", label: "Standard" },
                ].map((ratio) => (
                  <button
                    key={ratio.value}
                    onClick={() => setAspectRatio(ratio.value as typeof aspectRatio)}
                    className={`px-4 py-2 rounded-lg border transition-all ${
                      aspectRatio === ratio.value
                        ? "bg-yellow-500 text-black border-yellow-500"
                        : "bg-background border-border hover:border-yellow-500/50"
                    }`}
                  >
                    {ratio.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Generated Image Preview */}
            {generatedImageUrl && (
              <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-yellow-500">
                    <Check className="w-4 h-4" />
                    Image générée!
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <img
                    src={generatedImageUrl}
                    alt="Generated"
                    className="w-full rounded-lg"
                  />
                  <Button
                    onClick={handleConvertToVideo}
                    disabled={isGenerating}
                    className="w-full mt-3 gap-2 bg-gradient-to-r from-yellow-500 to-orange-500"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Conversion en vidéo...
                      </>
                    ) : (
                      <>
                        <Film className="w-4 h-4" />
                        Convertir en vidéo
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Parameters (for video modes) */}
        {mode !== "nano-banana" && (
          <div className="grid grid-cols-2 gap-4 mt-6">
            <Card className="bg-card/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  Durée
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={duration.toString()}
                  onValueChange={(v) => setDuration(Number(v))}
                  className="flex gap-2"
                >
                  {[2, 4, 6].map((d) => (
                    <div key={d} className="flex items-center">
                      <RadioGroupItem value={d.toString()} id={`duration-${d}`} className="sr-only" />
                      <Label
                        htmlFor={`duration-${d}`}
                        className={`px-3 py-2 rounded-md cursor-pointer border transition-all ${
                          duration === d
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border hover:border-primary/50"
                        }`}
                      >
                        {d}s
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  Mouvement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={motionIntensity}
                  onValueChange={(v) => setMotionIntensity(v as typeof motionIntensity)}
                  className="flex gap-2"
                >
                  {[
                    { value: "subtle", label: "Subtil" },
                    { value: "medium", label: "Moyen" },
                    { value: "dynamic", label: "Dynamique" },
                  ].map((opt) => (
                    <div key={opt.value} className="flex items-center">
                      <RadioGroupItem value={opt.value} id={`motion-${opt.value}`} className="sr-only" />
                      <Label
                        htmlFor={`motion-${opt.value}`}
                        className={`px-3 py-2 rounded-md cursor-pointer border transition-all text-xs ${
                          motionIntensity === opt.value
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border hover:border-primary/50"
                        }`}
                      >
                        {opt.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Style */}
        {mode !== "nano-banana" && (
          <div className="mt-4">
            <Label className="text-sm font-medium mb-2 block">Style visuel</Label>
            <div className="flex gap-2">
              {[
                { value: "cinematic", label: "🎬 Cinématique", desc: "Éclairage dramatique" },
                { value: "commercial", label: "📺 Commercial", desc: "Lumineux et pro" },
                { value: "lifestyle", label: "🏡 Lifestyle", desc: "Naturel et chaleureux" },
              ].map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStyle(s.value as typeof style)}
                  className={`flex-1 p-3 rounded-lg border transition-all text-left ${
                    style === s.value
                      ? "bg-primary/10 border-primary"
                      : "bg-card/50 border-border/50 hover:border-primary/50"
                  }`}
                >
                  <div className="font-medium text-sm">{s.label}</div>
                  <div className="text-xs text-muted-foreground">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Generated Video Preview */}
        {generatedVideoUrl && (
          <Card className="mt-4 bg-gradient-to-br from-green-500/10 to-cyan-500/10 border-green-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-green-400">
                <Check className="w-4 h-4" />
                Vidéo générée!
              </CardTitle>
            </CardHeader>
            <CardContent>
              <video
                src={generatedVideoUrl}
                controls
                className="w-full rounded-lg"
                autoPlay
                loop
              />
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          {!generatedVideoUrl ? (
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`flex-1 gap-2 ${
                mode === "nano-banana"
                  ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                  : "bg-gradient-to-r from-purple-500 to-cyan-500"
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {mode === "nano-banana" ? "Génération image..." : "Génération vidéo..."}
                </>
              ) : (
                <>
                  {mode === "nano-banana" ? <Banana className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                  {mode === "nano-banana" ? "Générer l'image" : "Générer la vidéo"}
                </>
              )}
            </Button>
          ) : (
            <>
              <Button
                onClick={handleReset}
                variant="outline"
                className="flex-1"
              >
                Nouvelle génération
              </Button>
              <Button
                onClick={handleAddToLibrary}
                className="flex-1 gap-2 bg-gradient-to-r from-green-500 to-cyan-500"
              >
                <Film className="w-4 h-4" />
                Ajouter à la bibliothèque
              </Button>
            </>
          )}
        </div>

        {/* Cost Info */}
        <p className="text-xs text-muted-foreground text-center mt-4">
          {mode === "nano-banana" 
            ? "🍌 Nano Banana Pro - Génération d'images Gemini AI"
            : `Coût estimé: ~0.05$ par vidéo générée (${duration}s)`
          }
        </p>
      </DialogContent>
    </Dialog>
  );
}
