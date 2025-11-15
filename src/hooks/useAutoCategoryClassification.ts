import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CategoryClassification {
  gpc_id: number;
  gpc_path: string;
  confidence: number;
}

interface ClassificationResult {
  success: boolean;
  classification?: CategoryClassification;
  error?: string;
}

export function useAutoCategoryClassification() {
  const [isClassifying, setIsClassifying] = useState(false);

  const classifyProduct = async (
    productTitle: string,
    productDescription?: string,
    productType?: string,
    imageUrl?: string
  ): Promise<ClassificationResult> => {
    setIsClassifying(true);

    try {
      console.log(`🤖 Classifying: ${productTitle}`);

      const { data, error } = await supabase.functions.invoke("classify-product-category", {
        body: {
          productTitle,
          productDescription,
          productType,
          imageUrl,
        },
      });

      if (error) throw error;

      if (data.success) {
        console.log("✅ Classification result:", data.classification);
        toast.success("Catégorie classifiée", {
          description: `${data.classification.gpc_path} (${data.classification.confidence}% confiance)`,
        });
      }

      return data;
    } catch (error) {
      console.error("Classification error:", error);
      toast.error("Erreur de classification", {
        description: error instanceof Error ? error.message : "Erreur inconnue",
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    } finally {
      setIsClassifying(false);
    }
  };

  const classifyMultipleProducts = async (
    products: Array<{
      id: string;
      title: string;
      description?: string;
      product_type?: string;
      image_url?: string;
    }>
  ): Promise<Map<string, CategoryClassification>> => {
    const results = new Map<string, CategoryClassification>();
    let successCount = 0;

    toast.info("Classification en cours", {
      description: `Classification de ${products.length} produits...`,
    });

    for (const product of products) {
      const result = await classifyProduct(
        product.title,
        product.description,
        product.product_type,
        product.image_url
      );

      if (result.success && result.classification) {
        results.set(product.id, result.classification);
        successCount++;

        // Update product in database
        try {
          await supabase
            .from("shopify_products")
            .update({
              google_category: result.classification.gpc_path,
              google_category_id: result.classification.gpc_id,
              google_category_confidence: result.classification.confidence,
            })
            .eq("id", product.id);
        } catch (updateError) {
          console.error(`Failed to update product ${product.id}:`, updateError);
        }
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    toast.success("Classification terminée", {
      description: `${successCount}/${products.length} produits classifiés avec succès`,
    });

    return results;
  };

  return {
    isClassifying,
    classifyProduct,
    classifyMultipleProducts,
  };
}
