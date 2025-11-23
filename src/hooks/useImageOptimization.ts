import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOptimizationNotifications } from './useOptimizationNotifications';

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

export const useImageOptimization = () => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const queryClient = useQueryClient();
  const { sendOptimizationNotification } = useOptimizationNotifications();

  const saveToHistory = async (params: SaveHistoryParams) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    try {
      // Get next version number
      const { data: versionData, error: versionError } = await supabase
        .rpc('get_next_image_version', { p_image_id: params.imageId });
      
      if (versionError) {
        console.error('Error getting version number:', versionError);
      }
      
      const versionNumber = versionData || 1;

      // Mark all previous versions as not current
      const { error: updateError } = await supabase
        .from('product_image_history')
        .update({ is_current: false })
        .eq('image_id', params.imageId);
      
      if (updateError) {
        console.error('Error updating previous versions:', updateError);
      }

      // Insert new history entry
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
          is_current: true
        });

      if (insertError) {
        console.error('❌ Error saving to history:', insertError);
        throw insertError;
      }

      console.log('✅ Successfully saved to product_image_history');
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
      resolution = '2000x2000'
    }: { 
      imageUrl: string; 
      productTitle: string;
      resolution?: string;
    }): Promise<OptimizationResult> => {
      setIsOptimizing(true);
      
      try {
        const { data, error } = await supabase.functions.invoke('generate-white-background', {
          body: { imageUrl, productTitle, resolution }
        });

        if (error) throw error;
        if (!data.success) throw new Error(data.error || 'Failed to generate white background');

        return {
          success: true,
          imageUrl: data.imageUrl
        };
      } catch (error) {
        setIsOptimizing(false);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-images'] });
      queryClient.invalidateQueries({ queryKey: ['products-with-images'] });
    },
    onError: () => {
      setIsOptimizing(false);
    },
    onSettled: () => {
      setIsOptimizing(false);
    }
  });

  const generateAIBackgroundVariants = useMutation({
    mutationFn: async ({ 
      productTitle,
      basePrompt = '',
      style = 'professional',
      format = 'square'
    }: { 
      productTitle: string;
      basePrompt?: string;
      style?: string;
      format?: string;
    }) => {
      setIsOptimizing(true);
      
      try {
        console.log('🎨 [AI_BG] Starting generation for:', productTitle);
        
        const { data, error } = await supabase.functions.invoke('generate-ai-background-variants', {
          body: { productTitle, basePrompt, style, format }
        });

        if (error) {
          console.error('🎨 [AI_BG] Edge function error:', error);
          throw error;
        }
        
        if (!data.success) {
          console.error('🎨 [AI_BG] Generation failed:', data.error);
          throw new Error(data.error || 'Failed to generate variants');
        }

        console.log('🎨 [AI_BG] API Response:', {
          success: data.success,
          totalGenerated: data.totalGenerated,
          variantsCount: data.variants?.length,
          firstVariant: {
            hasImageUrl: !!data.variants?.[0]?.imageUrl,
            hasImageBase64: !!data.variants?.[0]?.imageBase64,
            imageUrlLength: data.variants?.[0]?.imageUrl?.length || 0
          }
        });

        return data;
      } catch (error) {
        setIsOptimizing(false);
        throw error;
      }
    },
    onSuccess: () => {
      const language = localStorage.getItem('app-language') || 'fr';
      toast.success(language === 'fr' ? '4 variantes générées avec succès' : '4 variants generated successfully');
    },
    onError: (error) => {
      console.error('Error generating variants:', error);
      const language = localStorage.getItem('app-language') || 'fr';
      toast.error(language === 'fr' ? 'Erreur lors de la génération des variantes' : 'Error generating variants');
      setIsOptimizing(false);
    },
    onSettled: () => {
      setIsOptimizing(false);
    }
  });

  const generateProductDescription = useMutation({
    mutationFn: async ({ 
      title, 
      existingDescription,
      images,
      visionAnalysis,
      template = 'ecommerce'
    }: { 
      title: string; 
      existingDescription?: string;
      images?: string[];
      visionAnalysis?: any;
      template?: 'ecommerce' | 'luxury' | 'technical';
    }) => {
      setIsOptimizing(true);
      
      try {
        const { data, error } = await supabase.functions.invoke('generate-product-description-html', {
          body: { title, existingDescription, images, visionAnalysis, template }
        });

        if (error) throw error;
        if (!data.success) throw new Error(data.error || 'Failed to generate description');

        return data;
      } catch (error) {
        setIsOptimizing(false);
        throw error;
      }
    },
    onSuccess: () => {
      const language = localStorage.getItem('app-language') || 'fr';
      toast.success(language === 'fr' ? 'Description HTML générée avec succès' : 'HTML description generated successfully');
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => {
      console.error('Error generating description:', error);
      const language = localStorage.getItem('app-language') || 'fr';
      toast.error(language === 'fr' ? 'Erreur lors de la génération de la description' : 'Error generating description');
      setIsOptimizing(false);
    },
    onSettled: () => {
      setIsOptimizing(false);
    }
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
      qualityScore
    }: SaveHistoryParams & { imageId: string }) => {
      setIsOptimizing(true);
      
      try {
        // Update product image locally
        const { error: updateError } = await supabase
          .from('product_images')
          .update({ 
            src: optimizedUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', imageId);

        if (updateError) throw updateError;

        // Save to history
        await saveToHistory({
          productId,
          imageId,
          optimizationType,
          originalUrl,
          optimizedUrl,
          aiModel,
          aiPrompt,
          resolution,
          qualityScore
        });

        // 🔥 CRITICAL: Sync with Shopify after applying image
        console.log('🔄 Syncing optimized image with Shopify...');
        const syncToastId = toast.loading('Synchronisation avec Shopify...', {
          description: 'Application de l\'image optimisée'
        });
        
        try {
          const { data: syncData, error: syncError } = await supabase.functions.invoke('sync-product-images-to-shopify', {
            body: { productId }
          });

          // Handle different sync scenarios with detailed feedback
          if (syncError) {
            console.error('❌ Shopify sync failed:', syncError);
            toast.error('Erreur de synchronisation Shopify', {
              id: syncToastId,
              description: syncError.message || 'Vérifiez votre connexion Shopify dans les paramètres',
              action: {
                label: '⚙️ Paramètres',
                onClick: () => window.location.href = '/settings/integrations'
              },
              duration: 8000
            });
          } else if (syncData?.requiresUpgrade || syncData?.error === 'upgrade_required') {
            console.log('🚫 [OPTIMIZATION] Shopify sync blocked - trial user');
            toast.warning('Synchronisation limitée', {
              id: syncToastId,
              description: 'Image appliquée localement. Upgradez pour synchroniser avec Shopify',
              action: {
                label: '✨ Voir les plans',
                onClick: () => window.location.href = '/subscription'
              },
              duration: 10000
            });
            return { success: true, shopifySyncBlocked: true };
          } else if (syncData?.skipped) {
            console.log('[ImageOptimization] Shopify sync skipped (no shopify_product_id)', syncData);
            toast.warning('Image appliquée localement uniquement', {
              id: syncToastId,
              description: 'Le produit n\'est pas encore connecté à Shopify. Les images seront envoyées une fois le produit synchronisé.',
              duration: 8000,
            });
            return { success: true, shopifySyncSkipped: true };
          } else if (syncData?.error) {
            console.error('❌ Shopify sync error:', syncData.error);
            toast.warning('Image appliquée mais sync Shopify partielle', {
              id: syncToastId,
              description: 'L\'image est mise à jour localement. Certaines images n\'ont pas été synchronisées.',
              duration: 6000
            });
          } else {
            console.log('✅ Shopify sync successful');
            toast.success('Image synchronisée avec Shopify', {
              id: syncToastId,
              description: 'Votre boutique est à jour'
            });
          }
        } catch (syncError) {
          console.error('❌ Shopify sync exception:', syncError);
          toast.error('Erreur de synchronisation', {
            id: syncToastId,
            description: 'L\'image est appliquée localement seulement',
            duration: 5000
          });
        }
        
        return { success: true };
      } catch (error) {
        setIsOptimizing(false);
        throw error;
      }
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['product-images'] });
      await queryClient.invalidateQueries({ queryKey: ['products-with-images'] });
      await queryClient.invalidateQueries({ queryKey: ['image-history'] });
      
      // ✅ CRITICAL: Do NOT show success toast here anymore
      // Toast is already shown conditionally during mutationFn based on Shopify sync result
      // This prevents duplicate/misleading success messages
      
      console.log('✅ [ImageOptimization] Image applied, sync handled in mutationFn');
      
      // Send optimization notification
      const notificationResult = await sendOptimizationNotification(1);
      if (!notificationResult.success && notificationResult.error) {
        console.error('Notification error:', notificationResult.error);
      }
      
      setIsOptimizing(false);
    },
    onError: (error: Error) => {
      console.error('Error applying image:', error);
      const language = localStorage.getItem('app-language') || 'fr';
      
      // Check if it's a Shopify authentication error
      if (error.message.includes('401') || error.message.includes('Unauthorized') || error.message.includes('Token Shopify invalide')) {
        toast.error(language === 'fr' 
          ? 'Token Shopify invalide' 
          : 'Invalid Shopify token', 
        {
          description: language === 'fr'
            ? 'Veuillez reconnecter votre boutique Shopify dans les paramètres.'
            : 'Please reconnect your Shopify store in settings.',
          duration: 6000,
        });
      } else {
        toast.error(language === 'fr' 
          ? 'Erreur lors de l\'application de l\'image'
          : 'Error applying image'
        );
      }
      
      setIsOptimizing(false);
    },
    onSettled: () => {
      setIsOptimizing(false);
    }
  });

  return {
    isOptimizing,
    generateWhiteBackground,
    generateAIBackgroundVariants,
    generateProductDescription,
    applyOptimizedImage,
    saveToHistory
  };
};
