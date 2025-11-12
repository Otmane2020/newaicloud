import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ImageIcon, Upload, Sparkles, Loader2, CheckCircle, Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/lib/language";
import { ImageGenerationPreviewDialog } from "../seo/ImageGenerationPreviewDialog";

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
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string>('');
  const [isApplying, setIsApplying] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [currentFeaturedImage, setCurrentFeaturedImage] = useState<string | null>(null);
  const { t } = useTranslation();

  const MAX_PROMPT_LENGTH = 500;

  // Fetch current featured image when dialog opens
  useEffect(() => {
    if (open) {
      setError(null);
      setSelectedOption(null);
      setCustomImageUrl("");
      setAiPrompt("");
      
      // Fetch current featured image
      const fetchCurrentImage = async () => {
        const { data } = await supabase
          .from('content_images')
          .select('src')
          .eq('content_type', 'article')
          .eq('content_id', article.id)
          .eq('position', 0)
          .maybeSingle();
        
        setCurrentFeaturedImage(data?.src || null);
      };
      
      fetchCurrentImage();
    }
  }, [open, article.id]);

  const isValidImageUrl = (url: string) => {
    return url.startsWith("http") && /\.(jpg|jpeg|png|webp|gif|svg|bmp)(\?.*)?$/i.test(url);
  };

  const handleGenerateWithAI = async (customPrompt?: string) => {
    try {
      const isRegeneration = !!customPrompt;
      if (isRegeneration) {
        setIsRegenerating(true);
      } else {
        setLoading(true);
      }
      setError(null);

      let enrichedPrompt = customPrompt || aiPrompt;

      if (!enrichedPrompt) {
        // Build prompt from article title and content excerpt
        const contentExcerpt = article.content.substring(0, 200);
        enrichedPrompt = `Generate a professional featured image for a blog article titled "${article.title}". `;
        enrichedPrompt += `The article is about: ${contentExcerpt}... `;
        enrichedPrompt += `Make it elegant, modern, and engaging for blog readers with a 16:9 aspect ratio.`;
      }

      console.log("🎨 Generating AI image for article:", article.id);

      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: {
          prompt: enrichedPrompt,
          article_id: article.id,
          width: 1200,
          height: 675,
        },
      });

      if (error) throw error;

      if (!data?.image_url) {
        throw new Error(t.blog.dialogs.featuredImage.noUrl);
      }

      console.log("✅ AI image generated successfully:", data.image_url);

      // The edge function already handles upload and returns a public URL
      const publicUrl = data.image_url;

      // Store for preview instead of applying immediately
      setPreviewImageUrl(publicUrl);
      setShowPreviewDialog(true);
      
      // Close main dialog
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error:", error);
      const errorMessage = error.message || t.blog.dialogs.featuredImage.errorGenerate;
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setIsRegenerating(false);
    }
  };

  const handleApplyGenerated = async () => {
    try {
      setIsApplying(true);
      
      // Save to history before applying
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: versionData } = await supabase.rpc('get_next_article_image_version', {
          p_article_id: article.id
        });
        
        await supabase.from('article_image_history').insert({
          article_id: article.id,
          user_id: user.id,
          version_number: versionData || 1,
          optimization_type: 'ai_generated',
          original_url: currentFeaturedImage,
          optimized_url: previewImageUrl,
          ai_prompt: aiPrompt || `Auto-generated for ${article.title}`,
          ai_model: 'Lovable AI',
          resolution: '1200x675',
          is_current: true
        });
        
        // Mark previous versions as not current
        await supabase
          .from('article_image_history')
          .update({ is_current: false })
          .eq('article_id', article.id)
          .neq('version_number', versionData || 1);
      }
      
      await updateArticleImage(previewImageUrl);
      setShowPreviewDialog(false);
      
      toast.success(
        <div className="flex items-start gap-3">
          <img src={previewImageUrl} alt="Generated" className="w-16 h-16 rounded object-cover" />
          <div>
            <p className="font-semibold">{t.blog.dialogs.featuredImage.success}</p>
            <p className="text-xs text-muted-foreground">Image mise à jour</p>
          </div>
        </div>,
      );
    } catch (error: any) {
      console.error('Error applying image:', error);
      toast.error('Erreur lors de l\'application de l\'image');
    } finally {
      setIsApplying(false);
    }
  };

  const handleRegenerateImage = async (newPrompt: string) => {
    await handleGenerateWithAI(newPrompt);
  };

  const handleUploadCustomImage = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!customImageUrl) {
        setError(t.blog.dialogs.featuredImage.enterUrl);
        return;
      }

      if (!isValidImageUrl(customImageUrl)) {
        setError(t.blog.dialogs.featuredImage.invalidUrl);
        return;
      }

      await updateArticleImage(customImageUrl);
    } catch (error: any) {
      console.error("Error:", error);
      const errorMessage = error.message || t.blog.dialogs.featuredImage.errorUpdate;
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

    // Update blog_articles.featured_image
    const { error: updateArticleError } = await supabase
      .from('blog_articles')
      .update({ featured_image: imageUrl })
      .eq('id', article.id);

    if (updateArticleError) {
      console.error('Failed to update article featured_image:', updateArticleError);
      toast.warning(t.blog.dialogs.featuredImage.imageSaved);
    }

    // Store image info for success dialog
    setGeneratedImageUrl(imageUrl);
    setGeneratedImageId(insertedImage.id);
    
    // Close main dialog
    onOpenChange(false);
    setSelectedOption(null);
    setCustomImageUrl("");
    setAiPrompt("");
    
    // Refresh the article list FIRST
    await onImageUpdated();
    
    // Wait a bit to ensure parent has refreshed
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Then show success dialog (no toast to avoid hiding the dialog)
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

      toast.success(t.blog.dialogs.featuredImage.altGenerated);

      setShowSuccessDialog(false);
      onImageUpdated();
    } catch (err: any) {
      console.error("Error:", err);
      toast.error(err.message || t.blog.dialogs.featuredImage.errorOptimize);
    } finally {
      setProcessingAlt(false);
    }
  };

  const handleSyncToShopify = async () => {
    try {
      setProcessingAlt(true);
      
      console.log('🔄 [ARTICLE-IMAGE] Syncing article image to Shopify:', article.id);
      toast.loading('Synchronisation de l\'image avec Shopify...', { id: 'article-sync' });
      
      // Use dedicated image sync function instead of full article sync
      const { data: syncResult, error: syncError } = await supabase.functions.invoke("sync-article-image-to-shopify", {
        body: { article_id: article.id },
      });

      console.log('📥 [ARTICLE-IMAGE] Sync response:', { syncResult, syncError });

      if (syncError) {
        console.error('❌ [ARTICLE-IMAGE] Sync error:', syncError);
        throw syncError;
      }
      
      if (syncResult?.success) {
        toast.success("Image de l'article synchronisée avec Shopify ✅", { id: 'article-sync' });
      } else {
        toast.warning("⚠️ Image enregistrée localement (sync Shopify partielle)", { id: 'article-sync' });
      }
      
      setShowSuccessDialog(false);
      onImageUpdated();
    } catch (err: any) {
      console.error("❌ [ARTICLE-IMAGE] Error:", err);
      toast.error(err.message || "Erreur lors de la synchronisation", { id: 'article-sync' });
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
            {t.blog.dialogs.featuredImage.title}
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
                    onClick={() => handleGenerateWithAI()}
                    disabled={loading || aiPrompt.length > MAX_PROMPT_LENGTH}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                    aria-label="Générer l'image avec IA"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t.blog.dialogs.featuredImage.generating}
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
                  <Sparkles className="w-5 h-5 text-purple-600" />
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
              variant="outline"
              className="w-full h-12"
              size="lg"
            >
              {processingAlt ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Génération ALT...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Optimiser le texte ALT
                </>
              )}
            </Button>
            <Button
              onClick={handleSyncToShopify}
              disabled={processingAlt}
              className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              size="lg"
            >
              {processingAlt ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Synchronisation...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 mr-2" />
                  Publier sur Shopify
                </>
              )}
            </Button>
            <Button
              onClick={() => setShowSuccessDialog(false)}
              variant="ghost"
              className="w-full h-10"
            >
              Plus tard
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <ImageGenerationPreviewDialog
        open={showPreviewDialog}
        onOpenChange={setShowPreviewDialog}
        currentImage={currentFeaturedImage}
        generatedImage={previewImageUrl}
        title={article.title}
        isApplying={isApplying}
        isRegenerating={isRegenerating}
        onApply={handleApplyGenerated}
        onRegenerate={handleRegenerateImage}
        imageMetadata={{ model: 'Lovable AI', width: 1200, height: 675 }}
      />
    </>
  );
}
