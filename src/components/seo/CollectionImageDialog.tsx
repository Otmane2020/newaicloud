import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useTranslation } from '@/lib/language';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ImageIcon, Upload, Sparkles, TrendingUp, Loader2, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ImageGenerationPreviewDialog } from './ImageGenerationPreviewDialog';

interface CollectionImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection: {
    id: string;
    title: string;
    handle: string;
    image_url: string | null;
  };
  onImageUpdated: () => void;
}

export function CollectionImageDialog({ 
  open, 
  onOpenChange, 
  collection,
  onImageUpdated 
}: CollectionImageDialogProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<'popular' | 'ai' | 'upload' | null>(null);
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string>('');
  const [processingAlt, setProcessingAlt] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string>('');
  const [isApplying, setIsApplying] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleUsePopularProduct = async () => {
    try {
      setLoading(true);
      
      // Get most popular product from this collection with its images
      const { data: products, error } = await supabase
        .from('shopify_products')
        .select(`
          id,
          image_url,
          inventory_quantity,
          product_images (
            src,
            position
          )
        `)
        .contains('collection_ids', [collection.id])
        .order('inventory_quantity', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (!products || products.length === 0) {
        toast.error('Aucun produit trouvé dans cette collection');
        return;
      }

      // Try to get image from product_images first, fallback to image_url
      let imageUrl = products[0].image_url;
      
      if (products[0].product_images && products[0].product_images.length > 0) {
        // Sort by position and get first image
        const sortedImages = products[0].product_images.sort((a: any, b: any) => a.position - b.position);
        imageUrl = sortedImages[0].src;
      }
      
      if (!imageUrl) {
        toast.error('Le produit populaire n\'a pas d\'image');
        return;
      }

      await updateCollectionImage(imageUrl);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erreur lors de la récupération de l\'image');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateWithAI = async (customPrompt?: string) => {
    const isRegeneration = !!customPrompt;
    
    try {
      if (isRegeneration) {
        setIsRegenerating(true);
      } else {
        setLoading(true);
      }
      
      // Get products from this collection to enrich the prompt
      const { data: products } = await supabase
        .from('shopify_products')
        .select('title, description')
        .contains('collection_ids', [collection.id])
        .limit(5);
      
      let enrichedPrompt = customPrompt || aiPrompt;
      
      if (!enrichedPrompt) {
        // Build prompt from collection and products
        const productTitles = products?.map(p => p.title).join(', ') || '';
        enrichedPrompt = `Generate a professional square collection banner image for "${collection.title}". `;
        
        if (productTitles) {
          enrichedPrompt += `This collection includes products like: ${productTitles}. `;
        }
        
        enrichedPrompt += `Make it elegant, modern, and e-commerce focused with a 1:1 aspect ratio.`;
      }
      
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { 
          prompt: enrichedPrompt,
          collection_id: collection.id 
        }
      });

      if (error) throw error;

      if (data?.image_url) {
        let imageUrl = data.image_url;
        
        // ✅ CRITICAL: Convert base64 to public URL for Shopify compatibility
        if (imageUrl.startsWith('data:')) {
          console.log('🔄 Converting base64 image to public URL...');
          
          // Convert base64 to blob
          const base64Data = imageUrl.split(',')[1];
          const byteCharacters = atob(base64Data);
          const byteArray = new Uint8Array([...byteCharacters].map(c => c.charCodeAt(0)));
          const blob = new Blob([byteArray], { type: 'image/png' });
          
          // Upload to Supabase Storage
          const fileName = `collection-${collection.id}-${Date.now()}.png`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('generated-images')
            .upload(fileName, blob, { contentType: 'image/png', upsert: true });
          
          if (uploadError) throw uploadError;
          
          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('generated-images')
            .getPublicUrl(fileName);
          
          imageUrl = publicUrl;
          console.log('✅ Image uploaded to storage:', publicUrl);
        }
        
        // 🔥 Save to history immediately after generation
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: versionData } = await supabase.rpc('get_next_collection_image_version', {
            p_collection_id: collection.id
          });
          
          await supabase.from('collection_image_history').insert({
            collection_id: collection.id,
            user_id: user.id,
            version_number: versionData || 1,
            optimization_type: 'ai_generation',
            original_url: collection.image_url,
            optimized_url: imageUrl,
            ai_prompt: enrichedPrompt,
            ai_model: 'Lovable AI',
            is_current: false // Not applied yet
          });
        }
        
        // Store for preview instead of applying immediately
        setPreviewImageUrl(imageUrl);
        
        // Only open dialog on initial generation, keep it open during regeneration
        if (!isRegeneration) {
          setShowPreviewDialog(true);
          // Close main dialog only on initial generation
          onOpenChange(false);
        }
      } else {
        toast.error('Erreur lors de la génération de l\'image');
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Erreur lors de la génération de l\'image');
      // Close dialog only on error during regeneration
      if (isRegeneration) {
        setShowPreviewDialog(false);
      }
    } finally {
      if (isRegeneration) {
        setIsRegenerating(false);
      } else {
        setLoading(false);
      }
    }
  };

  const handleApplyGenerated = async () => {
    try {
      setIsApplying(true);
      
      // Mark all versions as not current first
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('collection_image_history')
          .update({ is_current: false })
          .eq('collection_id', collection.id);
        
        // Mark the generated image as current
        await supabase
          .from('collection_image_history')
          .update({ is_current: true })
          .eq('collection_id', collection.id)
          .eq('optimized_url', previewImageUrl);
      }
      
      await updateCollectionImage(previewImageUrl, true);
      setShowPreviewDialog(false);
      toast.success('Image appliquée avec succès');
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

      if (!customImageUrl || !customImageUrl.startsWith('http')) {
        toast.error('URL d\'image invalide');
        return;
      }

      await updateCollectionImage(customImageUrl);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erreur lors de la mise à jour de l\'image');
    } finally {
      setLoading(false);
    }
  };

  const updateCollectionImage = async (imageUrl: string, isAiGenerated: boolean = false) => {
    // ✅ CRITICAL: Validate URL format - reject base64 data URLs
    if (imageUrl.startsWith('data:')) {
      toast.error('❌ Erreur: Format base64 détecté. L\'image doit être une URL publique HTTP.');
      throw new Error('Base64 URLs are not supported. Image must be uploaded to storage first.');
    }

    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      toast.error('❌ URL invalide. L\'image doit commencer par http:// ou https://');
      throw new Error('Invalid URL format');
    }

    console.log('✅ Valid public URL detected:', imageUrl);

    // Generate automatic alt text for AI-generated images
    const altText = isAiGenerated 
      ? `Image professionnelle générée par IA pour la collection ${collection.title}`
      : `${collection.title} - Collection image`;

    const { error } = await supabase
      .from('shopify_collections')
      .update({ 
        image_url: imageUrl,
        image_alt: altText,
        updated_at: new Date().toISOString()
      })
      .eq('id', collection.id);

    if (error) throw error;

    // Store image info for success dialog
    setGeneratedImageUrl(imageUrl);
    
    // Close main dialog
    onOpenChange(false);
    setSelectedOption(null);
    setCustomImageUrl('');
    setAiPrompt('');
    
    // Refresh the collection list FIRST
    await onImageUpdated();
    
    // Wait a bit to ensure parent has refreshed
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Then show success dialog (no toast to avoid hiding the dialog)
    setShowSuccessDialog(true);
  };

  const handleSyncToShopify = async () => {
    try {
      setProcessingAlt(true);
      
      console.log('📞 [COLLECTION-IMAGE] Calling sync-collection-image-to-shopify with:', collection.id);
      toast.loading('Synchronisation avec Shopify en cours...', { id: 'shopify-sync' });
      
      const { data: syncResult, error: syncError } = await supabase.functions.invoke(
        'sync-collection-image-to-shopify',
        { body: { collection_id: collection.id } }
      );

      console.log('📥 [COLLECTION-IMAGE] Response:', { syncResult, syncError });

      if (syncError) {
        console.error('❌ [COLLECTION-IMAGE] Shopify sync error:', syncError);
        throw syncError;
      }
      
      if (syncResult?.success) {
        toast.success('✅ Image synchronisée avec Shopify', { id: 'shopify-sync' });
      } else {
        toast.warning('⚠️ Image enregistrée (sync Shopify partielle)', { id: 'shopify-sync' });
      }
      
      setShowSuccessDialog(false);
      onImageUpdated();
    } catch (err: any) {
      console.error('❌ [COLLECTION-IMAGE] Error:', err);
      toast.error(err.message || 'Erreur lors de la synchronisation', { id: 'shopify-sync' });
    } finally {
      setProcessingAlt(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedOption(null);
    setCustomImageUrl('');
    setAiPrompt('');
  };

  // Suggested prompts
  const suggestedPrompts = [
    `Professional banner for ${collection.title} collection`,
    `Modern e-commerce image for ${collection.title}`,
    `Elegant product showcase for ${collection.title}`
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Ajouter une image de collection
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Collection: <span className="font-medium">{collection.title}</span>
            </p>
          </DialogHeader>

        <div className="space-y-4">
          {/* Why use AI section */}
          <Card className="p-4 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950 dark:via-purple-950 dark:to-pink-950 border-indigo-200">
            <div className="flex items-start gap-3">
              <Badge className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shrink-0">
                <Sparkles className="w-3 h-3 mr-1" />
                Vision AI - Analyse d'images
              </Badge>
            </div>
            <div className="mt-3 text-sm space-y-1">
              <p className="font-medium">🎨 <strong>Images cohérentes</strong> avec votre marque</p>
              <p className="font-medium">⚡ <strong>Génération instantanée</strong> - pas besoin de designer</p>
              <p className="font-medium">🔍 <strong>Optimisées pour le SEO</strong> automatiquement</p>
            </div>
          </Card>
          {/* Option 1: Generate with AI - PRIORITY */}
          <Card 
            className={`p-4 cursor-pointer transition-all hover:border-primary hover:shadow-md ${
              selectedOption === 'ai' ? 'border-primary ring-2 ring-primary/20 shadow-lg' : ''
            }`}
            onClick={() => setSelectedOption('ai')}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shrink-0 animate-pulse">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1 flex items-center gap-2">
                  Générer avec Vision AI
                  <Badge variant="secondary" className="text-xs">Recommandé</Badge>
                </h3>
                <p className="text-sm text-muted-foreground">
                  Créez une image professionnelle personnalisée pour cette collection. 
                  L'IA génère une bannière moderne, élégante et optimisée SEO.
                </p>
              </div>
            </div>
            
            {selectedOption === 'ai' && (
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
                        onClick={() => setAiPrompt(prompt)}
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
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Laissez vide pour un prompt automatique basé sur le nom de la collection
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline"
                    onClick={handleClose}
                  >
                    Annuler
                  </Button>
                  <Button 
                    onClick={() => handleGenerateWithAI()}
                    disabled={loading}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
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

          {/* Option 2: Popular Product */}
          <Card 
            className={`p-4 cursor-pointer transition-all hover:border-primary hover:shadow-md ${
              selectedOption === 'popular' ? 'border-primary ring-2 ring-primary/20 shadow-lg' : ''
            }`}
            onClick={() => setSelectedOption('popular')}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">{t.collection.usePopularProduct}</h3>
                <p className="text-sm text-muted-foreground">
                  {t.collection.autoSelectDescription}
                </p>
              </div>
            </div>
            
            {selectedOption === 'popular' && (
              <div className="mt-4 flex justify-end gap-2">
                <Button 
                  variant="outline"
                  onClick={handleClose}
                >
                  {t.collection.cancel}
                </Button>
                <Button 
                  onClick={handleUsePopularProduct}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Chargement...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Appliquer
                    </>
                  )}
                </Button>
              </div>
            )}
          </Card>

          {/* Option 3: Upload Custom */}
          <Card 
            className={`p-4 cursor-pointer transition-all hover:border-primary hover:shadow-md ${
              selectedOption === 'upload' ? 'border-primary ring-2 ring-primary/20 shadow-lg' : ''
            }`}
            onClick={() => setSelectedOption('upload')}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Upload className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Utiliser une image personnalisée</h3>
                <p className="text-sm text-muted-foreground">
                  Ajoutez une image depuis une URL externe
                </p>
              </div>
            </div>
            
            {selectedOption === 'upload' && (
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
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline"
                    onClick={handleClose}
                  >
                    Annuler
                  </Button>
                  <Button 
                    onClick={handleUploadCustomImage}
                    disabled={loading || !customImageUrl}
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

    {/* Preview Dialog - Only render when previewImageUrl is available */}
    {showPreviewDialog && previewImageUrl && (
      <ImageGenerationPreviewDialog
        open={showPreviewDialog}
        onOpenChange={(open) => {
          setShowPreviewDialog(open);
          if (!open) {
            // Reset only when manually closing
            setPreviewImageUrl('');
            setSelectedOption(null);
          }
        }}
        currentImage={collection.image_url}
        generatedImage={previewImageUrl}
        title={collection.title}
        isApplying={isApplying}
        isRegenerating={isRegenerating}
        onApply={handleApplyGenerated}
        onRegenerate={handleRegenerateImage}
        imageMetadata={{ model: 'Lovable AI' }}
      />
    )}

    {/* Success Dialog with Export Options */}
    <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center text-center space-y-4 py-4">
          <div className="relative w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center animate-scale-in">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>

          <div>
            <DialogTitle className="text-xl font-bold text-green-600 dark:text-green-400 mb-2">
              Image mise à jour avec succès !
            </DialogTitle>
            <DialogDescription className="text-sm">
              L'image de la collection a été enregistrée. Vous pouvez maintenant l'exporter vers Shopify.
            </DialogDescription>
          </div>

          {/* Image Preview */}
          {generatedImageUrl && (
            <div className="w-full">
              <img
                src={generatedImageUrl}
                alt={collection.title}
                className="w-full h-48 object-cover rounded-lg border"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="w-full space-y-2 pt-2">
            <Button
              onClick={handleSyncToShopify}
              disabled={processingAlt}
              className="w-full h-11 font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              {processingAlt ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Synchronisation...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Exporter vers Shopify
                </>
              )}
            </Button>

            <Button
              onClick={() => setShowSuccessDialog(false)}
              variant="outline"
              className="w-full"
              disabled={processingAlt}
            >
              Fermer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
