import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ImageIcon, Upload, Sparkles, Loader2, CheckCircle, Eye, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface ArticleFeaturedImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article: {
    id: string;
    title: string;
    content: string;
  };
  onImageUpdated: () => void;
}

export function ArticleFeaturedImageDialog({
  open,
  onOpenChange,
  article,
  onImageUpdated,
}: ArticleFeaturedImageDialogProps) {
  const [loading, setLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<"ai" | "upload" | null>(null);
  const [customImageUrl, setCustomImageUrl] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string>("");
  const [generatedImageId, setGeneratedImageId] = useState<string>("");
  const [processingAlt, setProcessingAlt] = useState(false);

  const MAX_PROMPT_LENGTH = 500;

  // Reset states when dialog opens/closes
  useEffect(() => {
    if (open) {
      setError(null);
      setSelectedOption(null);
      setCustomImageUrl("");
      setAiPrompt("");
    }
  }, [open]);

  const isValidImageUrl = (url: string) => {
    return url.startsWith("http") && /\.(jpg|jpeg|png|webp|gif|svg|bmp)(\?.*)?$/i.test(url);
  };

  const handleGenerateWithAI = async () => {
    try {
      setLoading(true);
      setError(null);

      let enrichedPrompt = aiPrompt;

      if (!enrichedPrompt) {
        // Build prompt from article title and content excerpt
        const contentExcerpt = article.content.substring(0, 200);
        enrichedPrompt = `Generate a professional featured image for a blog article titled "${article.title}". `;
        enrichedPrompt += `The article is about: ${contentExcerpt}... `;
        enrichedPrompt += `Make it elegant, modern, and engaging for blog readers with a 16:9 aspect ratio.`;
      }

      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: {
          prompt: enrichedPrompt,
          article_id: article.id,
          width: 1200,
          height: 675,
        },
      });

      if (error) throw error;

      if (data?.image_url) {
        // Convert base64 to blob and upload to storage
        const base64Data = data.image_url.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/png' });

        // Upload to storage
        const { data: userData } = await supabase.auth.getUser();
        const fileName = `${userData.user?.id}/${article.id}-${Date.now()}.png`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('generated-images')
          .upload(fileName, blob, {
            contentType: 'image/png',
            upsert: false
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('generated-images')
          .getPublicUrl(fileName);

        await updateArticleImage(publicUrl);

        toast.success(
          <div className="flex items-start gap-3">
            <img src={publicUrl} alt="Generated" className="w-16 h-16 rounded object-cover" />
            <div>
              <p className="font-semibold">Image générée avec succès</p>
              <p className="text-xs text-muted-foreground">Image mise à jour</p>
            </div>
          </div>,
        );
      } else {
        throw new Error("Aucune URL d'image reçue");
      }
    } catch (error: any) {
      console.error("Error:", error);
      const errorMessage = error.message || "Erreur lors de la génération de l'image";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadCustomImage = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!customImageUrl) {
        setError("Veuillez entrer une URL d'image");
        return;
      }

      if (!isValidImageUrl(customImageUrl)) {
        setError("URL d'image invalide. Utilisez une URL directe vers une image (JPG, PNG, WebP, GIF, SVG, BMP)");
        return;
      }

      await updateArticleImage(customImageUrl);
    } catch (error: any) {
      console.error("Error:", error);
      const errorMessage = error.message || "Erreur lors de la mise à jour de l'image";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateArticleImage = async (imageUrl: string) => {
    // Store the featured image in content_images table
    const { data: user } = await supabase.auth.getUser();
    const { data: storeData } = await supabase
      .from("shopify_connections")
      .select("id")
      .limit(1)
      .maybeSingle();

    // Delete existing featured image for this article (position 0)
    const { error: deleteError } = await supabase
      .from("content_images")
      .delete()
      .eq("content_type", "article")
      .eq("content_id", article.id)
      .eq("position", 0);

    if (deleteError) {
      console.error("Error deleting old image:", deleteError);
    }

    // Insert new featured image
    const { data: insertedImage, error } = await supabase
      .from("content_images")
      .insert({
        content_id: article.id,
        content_type: "article",
        src: imageUrl,
        alt_text: `Image pour ${article.title}`,
        position: 0,
        user_id: user?.user?.id,
        store_id: storeData?.id,
      })
      .select()
      .single();

    if (error) throw error;

    // Store image info for success dialog
    setGeneratedImageUrl(imageUrl);
    setGeneratedImageId(insertedImage.id);
    
    // Close main dialog and show success
    onOpenChange(false);
    setSelectedOption(null);
    setCustomImageUrl("");
    setAiPrompt("");
    
    // Refresh the article list
    onImageUpdated();
    
    // Show success dialog
    toast.success("✅ Image générée avec succès!");
    setShowSuccessDialog(true);
  };

  const handleOptimizeAndSync = async () => {
    try {
      setProcessingAlt(true);
      
      // Generate ALT text
      const { error: altError } = await supabase.functions.invoke("generate-alt-texts-vision", {
        body: {
          imageId: generatedImageId,
          imageType: "content",
        },
      });

      if (altError) throw altError;

      // Sync to Shopify if article has shopify_article_id
      const { data: articleData } = await supabase
        .from("blog_articles")
        .select("shopify_article_id")
        .eq("id", article.id)
        .single();

      if (articleData?.shopify_article_id) {
        const { error: syncError } = await supabase.functions.invoke("sync-blog-to-shopify", {
          body: { articleId: article.id },
        });

        if (syncError) throw syncError;
        toast.success("✨ ALT généré et synchronisé avec Shopify!");
      } else {
        toast.success("✨ ALT optimisé généré avec succès!");
      }

      setShowSuccessDialog(false);
      onImageUpdated();
    } catch (err: any) {
      console.error("Error:", err);
      toast.error(err.message || "Erreur lors de l'optimisation");
    } finally {
      setProcessingAlt(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  // Suggested prompts
  const suggestedPrompts = [
    `Professional featured image for "${article.title}"`,
    `Modern blog header about ${article.title}`,
    `Elegant blog banner for article: ${article.title}`,
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Ajouter une image de couverture
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Article: <span className="font-medium">{article.title}</span>
          </p>
        </DialogHeader>

        {/* Error Display */}
        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Why use AI section */}
          <Card className="p-4 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950 dark:via-purple-950 dark:to-pink-950 border-indigo-200">
            <div className="flex items-start gap-3">
              <Badge className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shrink-0">
                <Sparkles className="w-3 h-3 mr-1" />
                Vision AI - Génération d'images
              </Badge>
            </div>
            <div className="mt-3 text-sm space-y-1">
              <p className="font-medium">
                🎨 <strong>Images professionnelles</strong> adaptées à votre article
              </p>
              <p className="font-medium">
                ⚡ <strong>Génération instantanée</strong> - pas besoin de designer
              </p>
              <p className="font-medium">
                🔍 <strong>Optimisées pour le SEO</strong> automatiquement
              </p>
            </div>
          </Card>

          {/* Option 1: Generate with AI - PRIORITY */}
          <Card
            className={`p-4 cursor-pointer transition-all hover:border-primary hover:shadow-md ${
              selectedOption === "ai" ? "border-primary ring-2 ring-primary/20 shadow-lg" : ""
            }`}
            onClick={() => setSelectedOption("ai")}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shrink-0 animate-pulse">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1 flex items-center gap-2">
                  Générer avec Vision AI
                  <Badge variant="secondary" className="text-xs">
                    Recommandé
                  </Badge>
                </h3>
                <p className="text-sm text-muted-foreground">
                  Créez une image de couverture professionnelle pour cet article. L'IA génère une bannière moderne,
                  élégante et optimisée SEO.
                </p>
              </div>
            </div>

            {selectedOption === "ai" && (
              <div className="mt-4 space-y-4">
                {/* Suggested prompts */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Suggestions de prompts:</Label>
                  <div className="flex flex-wrap gap-2">
                    {suggestedPrompts.map((prompt, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAiPrompt(prompt);
                        }}
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="ai-prompt">Prompt personnalisé (optionnel)</Label>
                  <Textarea
                    id="ai-prompt"
                    placeholder="Ex: Image moderne avec fond clair, style minimaliste..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={3}
                    className="resize-none"
                    maxLength={MAX_PROMPT_LENGTH}
                  />
                  <div className="flex justify-between mt-1">
                    <p className="text-xs text-muted-foreground">
                      Laissez vide pour un prompt automatique basé sur le titre et le contenu de l'article
                    </p>
                    {aiPrompt.length > MAX_PROMPT_LENGTH * 0.8 && (
                      <p
                        className={`text-xs ${
                          aiPrompt.length > MAX_PROMPT_LENGTH ? "text-destructive" : "text-muted-foreground"
                        }`}
                      >
                        {aiPrompt.length}/{MAX_PROMPT_LENGTH}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={handleClose}>
                    Annuler
                  </Button>
                  <Button
                    onClick={handleGenerateWithAI}
                    disabled={loading || aiPrompt.length > MAX_PROMPT_LENGTH}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                    aria-label="Générer l'image avec IA"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Génération...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Générer l'image
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Option 2: Upload Custom */}
          <Card
            className={`p-4 cursor-pointer transition-all hover:border-primary hover:shadow-md ${
              selectedOption === "upload" ? "border-primary ring-2 ring-primary/20 shadow-lg" : ""
            }`}
            onClick={() => setSelectedOption("upload")}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Upload className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Utiliser une image personnalisée</h3>
                <p className="text-sm text-muted-foreground">Ajoutez une image depuis une URL externe</p>
              </div>
            </div>

            {selectedOption === "upload" && (
              <div className="mt-4 space-y-3">
                <div>
                  <Label htmlFor="image-url">URL de l'image</Label>
                  <Input
                    id="image-url"
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={customImageUrl}
                    onChange={(e) => setCustomImageUrl(e.target.value)}
                  />
                </div>

                {/* Image Preview */}
                {customImageUrl && isValidImageUrl(customImageUrl) && (
                  <div className="mt-2">
                    <Label>Aperçu:</Label>
                    <img
                      src={customImageUrl}
                      alt="Aperçu"
                      className="mt-1 w-full h-32 object-cover rounded border"
                      onError={() => setError("Impossible de charger l'image depuis cette URL")}
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={handleClose}>
                    Annuler
                  </Button>
                  <Button
                    onClick={handleUploadCustomImage}
                    disabled={loading || !customImageUrl}
                    aria-label="Appliquer l'image personnalisée"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Chargement...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Appliquer
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </DialogContent>
    </Dialog>

      {/* Success Dialog - Large centered */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-2xl">
          <div className="flex items-start gap-4 pb-4 border-b">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shrink-0 shadow-lg">
              <CheckCircle className="w-9 h-9 text-white" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-3xl font-bold mb-2 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                ✅ Image générée avec succès!
              </DialogTitle>
              <DialogDescription className="text-lg">
                Votre image a été créée et ajoutée à l'article
              </DialogDescription>
            </div>
          </div>

          {/* Image Preview - Large */}
          {generatedImageUrl && (
            <div className="my-6">
              <img
                src={generatedImageUrl}
                alt="Generated"
                className="w-full h-64 object-cover rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-lg"
              />
            </div>
          )}

          {/* Info Card - Enhanced */}
          <Card className="p-6 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950 dark:via-purple-950 dark:to-pink-950 border-2 border-indigo-200">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shrink-0">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold">Optimisez maintenant avec Vision AI!</h3>
              </div>
              <div className="space-y-2 text-base">
                <p className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-indigo-600" />
                  <span><strong>Texte ALT optimisé</strong> généré par intelligence artificielle</span>
                </p>
                <p className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-purple-600" />
                  <span><strong>Synchronisation automatique</strong> avec votre boutique Shopify</span>
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-pink-600" />
                  <span><strong>SEO amélioré</strong> pour un meilleur référencement</span>
                </p>
              </div>
            </div>
          </Card>

          <div className="flex flex-col gap-3 pt-6">
            <Button
              onClick={handleOptimizeAndSync}
              disabled={processingAlt}
              className="w-full h-14 text-lg font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 shadow-lg"
              size="lg"
            >
              {processingAlt ? (
                <>
                  <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                  Optimisation en cours...
                </>
              ) : (
                <>
                  <Sparkles className="w-6 h-6 mr-2" />
                  Générer ALT & Synchroniser avec Shopify
                  <Zap className="w-6 h-6 ml-2" />
                </>
              )}
            </Button>
            <Button
              onClick={() => setShowSuccessDialog(false)}
              variant="outline"
              className="w-full h-12 text-base"
              size="lg"
            >
              Je le ferai plus tard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
