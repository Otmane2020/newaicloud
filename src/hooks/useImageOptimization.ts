import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

  const saveToHistory = async (params: SaveHistoryParams) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get next version number
    const { data: versionData } = await supabase
      .rpc('get_next_image_version', { p_image_id: params.imageId });
    
    const versionNumber = versionData || 1;

    // Mark all previous versions as not current
    await supabase
      .from('product_image_history')
      .update({ is_current: false })
      .eq('image_id', params.imageId);

    // Insert new history entry
    const { error } = await supabase
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

    if (error) throw error;

    return versionNumber;
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
      toast.success('4 variantes générées avec succès');
    },
    onError: (error) => {
      console.error('Error generating variants:', error);
      toast.error('Erreur lors de la génération des variantes');
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
      toast.success('Description HTML générée avec succès');
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => {
      console.error('Error generating description:', error);
      toast.error('Erreur lors de la génération de la description');
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
        // Update product image
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
        
        return { success: true };
      } catch (error) {
        setIsOptimizing(false);
        throw error;
      }
    },
    onSuccess: () => {
      toast.success('Image appliquée avec succès');
      queryClient.invalidateQueries({ queryKey: ['product-images'] });
      queryClient.invalidateQueries({ queryKey: ['products-with-images'] });
      queryClient.invalidateQueries({ queryKey: ['image-history'] });
    },
    onError: (error) => {
      console.error('Error applying image:', error);
      toast.error('Erreur lors de l\'application de l\'image');
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
