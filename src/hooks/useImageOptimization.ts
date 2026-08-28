import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOptimizationNotifications } from './useOptimizationNotifications';
import { translateImageGenerationError } from '@/lib/imageUiTranslations';

interface OptimizationResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

interface SaveHistoryParams {
  productId: string;
  imageId: string;
  optimizationType: 'white_background' | 'ai_background' | 'title_description';
  originalUrl: string;
  optimizedUrl: string;
  aiModel?: string;
  aiPrompt?: string;
  resolution?: string;
  qualityScore?: number;
}

type AppLanguage = 'fr' | 'en';

const getLanguage = (): AppLanguage => {
  try {
    return localStorage.getItem('app-language') === 'fr' ? 'fr' : 'en';
  } catch {
    return 'en';
  }
};

const getCopy = (language: AppLanguage) => language === 'fr'
  ? {
      variantsGenerated: '4 variantes générées avec succès',
      variantsError: 'Erreur lors de la génération des variantes',
      descriptionGenerated: 'Description HTML générée avec succès',
      descriptionError: 'Erreur lors de la génération de la description',
      syncing: 'Synchronisation avec Shopify...',
      applyingOptimized: "Application de l'image optimisée",
      shopifySyncError: 'Erreur de synchronisation Shopify',
      checkShopify: 'Vérifiez votre connexion Shopify dans les paramètres',
      settings: '⚙️ Paramètres',
      limitedSync: 'Synchronisation limitée',
      limitedSyncDescription: 'Image appliquée localement. Passez à un plan supérieur pour synchroniser avec Shopify.',
      plans: '✨ Voir les plans',
      localOnly: 'Image appliquée localement uniquement',
      localOnlyDescription: "Le produit n'est pas encore connecté à Shopify. Les images seront envoyées une fois le produit synchronisé.",
      partialSync: 'Image appliquée mais synchronisation Shopify partielle',
      partialSyncDescription: "L'image est mise à jour localement. Certaines images n'ont pas été synchronisées.",
      synced: 'Image synchronisée avec Shopify',
      storeUpdated: 'Votre boutique est à jour',
      syncError: 'Erreur de synchronisation',
      localApplied: "L'image est appliquée localement seulement",
      invalidToken: 'Token Shopify invalide',
      reconnectShopify: 'Veuillez reconnecter votre boutique Shopify dans les paramètres.',
      applyError: "Erreur lors de l'application de l'image",
    }
  : {
      variantsGenerated: '4 variants generated successfully',
      variantsError: 'Error generating variants',
      descriptionGenerated: 'HTML description generated successfully',
      descriptionError: 'Error generating description',
      syncing: 'Syncing with Shopify...',
      applyingOptimized: 'Applying optimized image',
      shopifySyncError: 'Shopify synchronization error',
      checkShopify: 'Check your Shopify connection in settings',
      settings: '⚙️ Settings',
      limitedSync: 'Limited synchronization',
      limitedSyncDescription: 'Image applied locally. Upgrade your plan to sync with Shopify.',
      plans: '✨ View plans',
      localOnly: 'Image applied locally only',
      localOnlyDescription: 'The product is not connected to Shopify yet. Images will be sent once the product is synchronized.',
      partialSync: 'Image applied with partial Shopify sync',
      partialSyncDescription: 'The image is updated locally. Some images were not synchronized.',
      synced: 'Image synchronized with Shopify',
      storeUpdated: 'Your store is up to date',
      syncError: 'Synchronization error',
      localApplied: 'The image was applied locally only',
      invalidToken: 'Invalid Shopify token',
      reconnectShopify: 'Please reconnect your Shopify store in settings.',
      applyError: 'Error applying image',
    };

async function readFunctionError(error: unknown, fallback: string): Promise<Error> {
  const raw = error as any;
  let code = '';
  let message = raw?.message || fallback;

  const context = raw?.context;
  if (context && typeof context.clone === 'function') {
    try {
      const response = context.clone();
      const payload = await response.json();
      code = payload?.error || payload?.code || '';
      message = payload?.message || payload?.error_description || payload?.error || message;
    } catch {
      try {
        const response = context.clone();
        const text = await response.text();
        if (text) message = text;
      } catch {
        // Keep the original Supabase error message.
      }
    }
  }

  const combined = code && !String(message).includes(code) ? `${code}: ${message}` : String(message || fallback);
  return new Error(combined);
}

export const useImageOptimization = () => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const queryClient = useQueryClient();
  const { sendOptimizationNotification } = useOptimizationNotifications();

  const saveToHistory = async (params: SaveHistoryParams) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    try {
      const { data: versionData, error: versionError } = await supabase
        .rpc('get_next_image_version', { p_image_id: params.imageId });

      if (versionError) console.error('Error getting version number:', versionError);
      const versionNumber = versionData || 1;

      const { error: updateError } = await supabase
        .from('product_image_history')
        .update({ is_current: false })
        .eq('image_id', params.imageId);
      if (updateError) console.error('Error updating previous versions:', updateError);

      const { error: insertError } = await supabase
        .from('product_image_history')
        .insert({
          product_id: params.productId,
          image_id: params.imageId,
          user_id: user.id,
          optimization_type: params.optimizationType,
          original_url: params.originalUrl,
          optimized_url: params.optimizedUrl,
          version_number: versionNumber,
          ai_model: params.aiModel,
          ai_prompt: params.aiPrompt,
          resolution: params.resolution,
          quality_score: params.qualityScore,
          is_current: true,
        });

      if (insertError) throw insertError;
      return versionNumber;
    } catch (error) {
      console.error('❌ Failed to save history:', error);
      throw error;
    }
  };

  const generateWhiteBackground = useMutation({
    mutationFn: async ({
      imageUrl,
      productTitle,
      resolution = '2000x2000',
      format = 'square',
      mode = 'standard',
      serpData,
      visionAiData,
      productDescription,
      product_id,
      backgroundStyle,
      customPrompt,
      galleryImages,
    }: {
      imageUrl: string;
      productTitle: string;
      resolution?: string;
      format?: 'square' | 'portrait' | 'landscape';
      mode?: 'standard' | 'google_shopping' | '3d_google_shopping' | '3d_generate';
      serpData?: any;
      visionAiData?: any;
      productDescription?: string;
      product_id?: string;
      backgroundStyle?: 'shopping' | 'lifestyle' | 'moderne' | 'living_room' | 'studio' | 'nature' | 'luxury_showroom';
      customPrompt?: string;
      galleryImages?: string[];
    }): Promise<OptimizationResult> => {
      setIsOptimizing(true);
      const { data, error } = await supabase.functions.invoke('generate-white-background', {
        body: {
          imageUrl,
          productTitle,
          resolution,
          format,
          mode,
          serpData,
          visionAiData,
          productDescription,
          product_id,
          backgroundStyle,
          customPrompt,
          galleryImages,
        },
      });

      if (error) throw await readFunctionError(error, 'WHITE_BACKGROUND_GENERATION_FAILED');
      if (!data?.success) throw new Error(`${data?.error || 'WHITE_BACKGROUND_GENERATION_FAILED'}: ${data?.message || 'Failed to generate white background'}`);
      if (!data?.imageUrl) throw new Error('WHITE_BACKGROUND_GENERATION_FAILED: Missing generated image URL');

      return { success: true, imageUrl: data.imageUrl };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-images'] });
      queryClient.invalidateQueries({ queryKey: ['products-with-images'] });
    },
    onError: (error) => {
      console.error('Error generating white background:', error);
      setIsOptimizing(false);
    },
    onSettled: () => setIsOptimizing(false),
  });

  const generateAIBackgroundVariants = useMutation({
    mutationFn: async ({
      productTitle,
      productImageUrl,
      basePrompt = '',
      style = 'professional',
      format = 'square',
    }: {
      productTitle: string;
      productImageUrl: string;
      basePrompt?: string;
      style?: string;
      format?: string;
    }) => {
      setIsOptimizing(true);
      const { data, error } = await supabase.functions.invoke('generate-ai-background-variants', {
        body: { productTitle, productImageUrl, basePrompt, style, format },
      });

      if (error) throw await readFunctionError(error, 'AI_BACKGROUND_VARIANTS_FAILED');
      if (!data?.success) throw new Error(`${data?.error || 'AI_BACKGROUND_VARIANTS_FAILED'}: ${data?.message || 'Failed to generate variants'}`);
      return data;
    },
    onSuccess: () => {
      const language = getLanguage();
      toast.success(getCopy(language).variantsGenerated);
    },
    onError: (error) => {
      console.error('Error generating variants:', error);
      const language = getLanguage();
      toast.error(getCopy(language).variantsError, {
        description: translateImageGenerationError(error, language),
      });
      setIsOptimizing(false);
    },
    onSettled: () => setIsOptimizing(false),
  });

  const generateProductDescription = useMutation({
    mutationFn: async ({
      title,
      existingDescription,
      images,
      visionAnalysis,
      template = 'ecommerce',
    }: {
      title: string;
      existingDescription?: string;
      images?: string[];
      visionAnalysis?: any;
      template?: 'ecommerce' | 'luxury' | 'technical';
    }) => {
      setIsOptimizing(true);
      const { data, error } = await supabase.functions.invoke('generate-product-description-html', {
        body: { title, existingDescription, images, visionAnalysis, template },
      });

      if (error) throw await readFunctionError(error, 'PRODUCT_DESCRIPTION_GENERATION_FAILED');
      if (!data?.success) throw new Error(data?.error || 'Failed to generate description');
      return data;
    },
    onSuccess: () => {
      const language = getLanguage();
      toast.success(getCopy(language).descriptionGenerated);
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => {
      console.error('Error generating description:', error);
      const language = getLanguage();
      toast.error(getCopy(language).descriptionError);
      setIsOptimizing(false);
    },
    onSettled: () => setIsOptimizing(false),
  });

  const applyOptimizedImage = useMutation({
    mutationFn: async ({
      imageId,
      productId,
      optimizedUrl,
      originalUrl,
      optimizationType,
      aiModel,
      aiPrompt,
      resolution,
      qualityScore,
      applyAsMain = true,
    }: SaveHistoryParams & { imageId: string; applyAsMain?: boolean }) => {
      setIsOptimizing(true);
      let finalUrl = optimizedUrl;

      if (optimizedUrl.startsWith('data:image/')) {
        try {
          const base64Data = optimizedUrl.split(',')[1];
          const mimeType = optimizedUrl.split(';')[0].split(':')[1];
          const extension = mimeType.split('/')[1] || 'png';
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

          const typePrefix = optimizationType === 'ai_background' ? 'ai-bg' : 'optimized';
          const fileName = `${typePrefix}-${productId}-${imageId}-${Date.now()}.${extension}`;
          const { error: uploadError } = await supabase.storage
            .from('generated-images')
            .upload(fileName, bytes, { contentType: mimeType, upsert: true });
          if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

          finalUrl = supabase.storage.from('generated-images').getPublicUrl(fileName).data.publicUrl;
        } catch (uploadError) {
          throw new Error(`Failed to upload image: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
        }
      }

      const { data: existingImage } = await supabase
        .from('product_images')
        .select('id')
        .eq('product_id', productId)
        .eq('src', finalUrl)
        .neq('id', imageId)
        .maybeSingle();
      if (existingImage) await supabase.from('product_images').delete().eq('id', existingImage.id);

      const { data: imageData } = await supabase
        .from('product_images')
        .select('position')
        .eq('id', imageId)
        .single();
      let imagePosition = imageData?.position || 1;

      if (applyAsMain && imagePosition !== 1) {
        const { data: allImages } = await supabase
          .from('product_images')
          .select('id, position')
          .eq('product_id', productId)
          .lt('position', imagePosition)
          .order('position', { ascending: false });

        for (const image of allImages || []) {
          await supabase
            .from('product_images')
            .update({ position: (image.position || 0) + 1 })
            .eq('id', image.id);
        }
        imagePosition = 1;
      }

      const { error: updateError } = await supabase
        .from('product_images')
        .update({ src: finalUrl, position: imagePosition, updated_at: new Date().toISOString() })
        .eq('id', imageId);
      if (updateError && updateError.code !== '23505') throw updateError;

      if (imagePosition === 1 || applyAsMain) {
        const { error: productUpdateError } = await supabase
          .from('shopify_products')
          .update({ image_url: finalUrl, updated_at: new Date().toISOString() })
          .eq('id', productId);
        if (productUpdateError) console.error('Failed to update shopify_products.image_url:', productUpdateError);
      }

      await saveToHistory({
        productId,
        imageId,
        optimizationType,
        originalUrl,
        optimizedUrl: finalUrl,
        aiModel,
        aiPrompt,
        resolution,
        qualityScore,
      });

      const language = getLanguage();
      const copy = getCopy(language);
      const syncToastId = toast.loading(copy.syncing, { description: copy.applyingOptimized });

      try {
        const { data: syncData, error: syncError } = await supabase.functions.invoke('sync-product-images-to-shopify', {
          body: { productId, allowCreateReplace: true },
        });

        if (syncError) {
          const detailedError = await readFunctionError(syncError, copy.checkShopify);
          toast.error(copy.shopifySyncError, {
            id: syncToastId,
            description: detailedError.message || copy.checkShopify,
            action: { label: copy.settings, onClick: () => { window.location.href = '/settings/integrations'; } },
            duration: 8000,
          });
        } else if (syncData?.requiresUpgrade || syncData?.error === 'upgrade_required') {
          toast.warning(copy.limitedSync, {
            id: syncToastId,
            description: copy.limitedSyncDescription,
            action: { label: copy.plans, onClick: () => { window.location.href = '/subscription'; } },
            duration: 10000,
          });
          return { success: true, shopifySyncBlocked: true };
        } else if (syncData?.skipped) {
          toast.warning(copy.localOnly, {
            id: syncToastId,
            description: copy.localOnlyDescription,
            duration: 8000,
          });
          return { success: true, shopifySyncSkipped: true };
        } else if (syncData?.error) {
          toast.warning(copy.partialSync, {
            id: syncToastId,
            description: copy.partialSyncDescription,
            duration: 6000,
          });
        } else {
          toast.success(copy.synced, { id: syncToastId, description: copy.storeUpdated });
        }
      } catch (syncError) {
        console.error('Shopify sync exception:', syncError);
        toast.error(copy.syncError, {
          id: syncToastId,
          description: copy.localApplied,
          duration: 5000,
        });
      }

      return { success: true };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['product-images'] });
      await queryClient.invalidateQueries({ queryKey: ['products-with-images'] });
      await queryClient.invalidateQueries({ queryKey: ['image-history'] });
      await queryClient.invalidateQueries({ queryKey: ['shopify-products'] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });

      const notificationResult = await sendOptimizationNotification(1);
      if (!notificationResult.success && notificationResult.error) {
        console.error('Notification error:', notificationResult.error);
      }
      setIsOptimizing(false);
    },
    onError: (error: Error) => {
      console.error('Error applying image:', error);
      const language = getLanguage();
      const copy = getCopy(language);

      if (error.message.includes('401') || error.message.includes('Unauthorized') || error.message.includes('Token Shopify invalide')) {
        toast.error(copy.invalidToken, { description: copy.reconnectShopify, duration: 6000 });
      } else {
        toast.error(copy.applyError, { description: translateImageGenerationError(error, language) });
      }
      setIsOptimizing(false);
    },
    onSettled: () => setIsOptimizing(false),
  });

  return {
    isOptimizing,
    generateWhiteBackground,
    generateAIBackgroundVariants,
    generateProductDescription,
    applyOptimizedImage,
    saveToHistory,
  };
};
