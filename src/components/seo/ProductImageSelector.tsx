import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ProductImageSelectorProps {
  productId: string;
  historyId: string;
  optimizedUrl: string;
  onApply: (params: { historyId: string; targetImageId: string; optimizedUrl: string }) => void;
}

export function ProductImageSelector({ 
  productId, 
  historyId, 
  optimizedUrl, 
  onApply 
}: ProductImageSelectorProps) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['product-images-variants', productId],
    queryFn: async () => {
      const { data: product, error } = await supabase
        .from('shopify_products')
        .select(`
          product_images(id, position, src),
          product_variants(id, title, image_url, position)
        `)
        .eq('id', productId)
        .single();

      if (error) throw error;
      return product;
    }
  });

  if (isLoading) {
    return (
      <div className="px-4 py-8 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const productImages = data?.product_images || [];
  const variants = data?.product_variants || [];

  if (productImages.length === 0 && variants.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
        Aucune image disponible pour ce produit
      </div>
    );
  }

  return (
    <>
      {/* Product main images */}
      {productImages.length > 0 && (
        <>
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
            Images produit principales
          </div>
          {productImages
            .sort((a: any, b: any) => a.position - b.position)
            .map((img: any, idx: number) => (
              <DropdownMenuItem
                key={img.id}
                onClick={() => onApply({
                  historyId,
                  targetImageId: img.id,
                  optimizedUrl
                })}
                className="gap-3 py-3"
              >
                <div className="flex items-center gap-3 flex-1">
                  {img.src ? (
                    <img 
                      src={img.src} 
                      alt={`Image ${idx + 1}`}
                      className="w-12 h-12 rounded object-cover border"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="font-medium">
                      {idx === 0 ? 'Image principale' : `Image ${idx + 1}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Position {img.position || idx + 1}
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          }
        </>
      )}
      
      {/* Variant images */}
      {variants.length > 0 && (
        <>
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">
            Images des variantes
          </div>
          {variants
            .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
            .map((variant: any) => (
              <DropdownMenuItem
                key={variant.id}
                onClick={async () => {
                  try {
                    const { error } = await supabase
                      .from('product_variants')
                      .update({ image_url: optimizedUrl })
                      .eq('id', variant.id);

                    if (error) throw error;

                    await supabase
                      .from('product_image_history')
                      .update({ is_current: true })
                      .eq('id', historyId);

                    toast.success('Image appliquée à la variante avec succès');
                    queryClient.invalidateQueries({ queryKey: ['product-image-history'] });
                  } catch (error) {
                    console.error('Error applying image to variant:', error);
                    toast.error("Erreur lors de l'application de l'image");
                  }
                }}
                className="gap-3 py-3"
              >
                <div className="flex items-center gap-3 flex-1">
                  {variant.image_url ? (
                    <img 
                      src={variant.image_url} 
                      alt={variant.title}
                      className="w-12 h-12 rounded object-cover border"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded bg-muted flex items-center justify-center border">
                      <ImageIcon className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="font-medium line-clamp-1">
                      {variant.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Variante {variant.image_url ? '' : '(sans image)'}
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          }
        </>
      )}
    </>
  );
}
