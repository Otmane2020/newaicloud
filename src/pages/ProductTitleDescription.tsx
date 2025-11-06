import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Wand2, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/language";

export default function ProductTitleDescription() {
  const { t } = useTranslation();
  const [currentTitle, setCurrentTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTitle, setGeneratedTitle] = useState("");
  const [generatedDescription, setGeneratedDescription] = useState("");

  const handleGenerate = async () => {
    if (!currentTitle.trim()) {
      toast.error("Veuillez entrer un titre existant");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-title-description", {
        body: {
          currentTitle,
          imageUrl: imageUrl.trim() || null,
        },
      });

      if (error) throw error;

      setGeneratedTitle(data.title || "");
      setGeneratedDescription(data.description || "");
      toast.success("Titre et description générés avec succès");
    } catch (error) {
      console.error("Error generating content:", error);
      toast.error("Erreur lors de la génération du contenu");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 sm:h-8 sm:h-8 text-primary" />
            Génération de Titre et Description
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Utilisez l'IA pour générer des titres optimisés et des descriptions captivantes à partir de vos produits
          </p>
        </div>

        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              Informations du Produit
            </CardTitle>
            <CardDescription>
              Entrez le titre actuel de votre produit et optionnellement l'URL d'une image pour une analyse Vision AI
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-title">Titre actuel du produit *</Label>
              <Input
                id="current-title"
                placeholder="Ex: T-shirt en coton bio"
                value={currentTitle}
                onChange={(e) => setCurrentTitle(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image-url" className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                URL de l'image (optionnel pour Vision AI)
              </Label>
              <Input
                id="image-url"
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                L'analyse Vision AI permettra d'enrichir le titre et la description avec des détails visuels
              </p>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !currentTitle.trim()}
              className="w-full sm:w-auto"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Générer Titre et Description
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results Section */}
        {(generatedTitle || generatedDescription) && (
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            {/* Generated Title */}
            {generatedTitle && (
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg">Titre Optimisé</CardTitle>
                  <CardDescription>Titre généré par l'IA pour un meilleur référencement</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Textarea
                      value={generatedTitle}
                      onChange={(e) => setGeneratedTitle(e.target.value)}
                      className="min-h-[80px] font-medium"
                      rows={3}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedTitle);
                        toast.success("Titre copié dans le presse-papier");
                      }}
                      className="w-full"
                    >
                      Copier le titre
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Generated Description */}
            {generatedDescription && (
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg">Description Optimisée</CardTitle>
                  <CardDescription>Description enrichie par l'analyse IA</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Textarea
                      value={generatedDescription}
                      onChange={(e) => setGeneratedDescription(e.target.value)}
                      className="min-h-[120px]"
                      rows={6}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedDescription);
                        toast.success("Description copiée dans le presse-papier");
                      }}
                      className="w-full"
                    >
                      Copier la description
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Info Card */}
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <ImageIcon className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="font-medium text-sm">Vision AI pour l'analyse d'image</p>
                <p className="text-sm text-muted-foreground">
                  Lorsque vous fournissez une URL d'image, notre technologie Vision AI analyse l'image pour identifier les couleurs, 
                  les motifs, les textures et d'autres caractéristiques visuelles. Ces informations sont ensuite utilisées pour créer 
                  des titres et descriptions plus précis et attractifs.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
