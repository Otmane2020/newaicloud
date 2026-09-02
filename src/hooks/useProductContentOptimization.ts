import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { OptimizationConfig } from "@/components/seo/OptimizationConfigDialog";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/language";

export interface ProductContentOptimizationTarget {
  id: string;
  title: string;
  image_url?: string | null;
  vendor?: string | null;
}

export interface ProductContentOptimizationProgress {
  index: number;
  total: number;
  title: string;
}

const GENERATION_TIMEOUT_MS = 45_000;

export function useProductContentOptimization() {
  const { canDoAction, refresh: refreshLimits } = useUsageLimits();
  const { language } = useTranslation();
  const fr = language === "fr";
  const [isOptimizingContent, setIsOptimizingContent] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState<ProductContentOptimizationProgress | null>(null);

  const optimizeProductContent = useCallback(async <T extends ProductContentOptimizationTarget>(
    targets: T[],
    config: OptimizationConfig,
  ): Promise<T[]> => {
    if (targets.length === 0) return [];

    if (!canDoAction("optimizations")) {
      toast.error(fr ? "Limite d’optimisations atteinte" : "Optimization limit reached", {
        description: fr
          ? "Passez à un plan supérieur pour continuer."
          : "Upgrade your plan to continue.",
      });
      return [];
    }

    setIsOptimizingContent(true);
    const optimized: T[] = [];
    const toastId = toast.loading(
      fr ? `Génération 0/${targets.length} produit(s)…` : `Generating 0/${targets.length} product(s)…`,
    );

    try {
      for (let index = 0; index < targets.length; index += 1) {
        const target = targets[index];
        setOptimizationProgress({ index: index + 1, total: targets.length, title: target.title });
        toast.loading(
          fr
            ? `Génération ${index + 1}/${targets.length} : ${target.title.substring(0, 48)}…`
            : `Generating ${index + 1}/${targets.length}: ${target.title.substring(0, 48)}…`,
          { id: toastId },
        );

        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) => {
          timeoutId = setTimeout(
            () => resolve({ data: null, error: { message: "TIMEOUT" } }),
            GENERATION_TIMEOUT_MS,
          );
        });

        const invokePromise = supabase.functions.invoke("generate-title-description", {
          body: {
            currentTitle: target.title,
            imageUrl: config.selectedImageUrl || target.image_url || null,
            config,
            customDescription: config.customDescription || "",
            // Keep the exact payload used by the proven /products/title-description workflow.
            vendor: "",
          },
        });

        const { error } = await Promise.race([invokePromise, timeoutPromise]);
        if (timeoutId) clearTimeout(timeoutId);

        if (error) {
          const errorMessage = (error as any)?.message || String(error);
          if (errorMessage.includes("LIMIT_REACHED") || errorMessage.includes("Limite d'optimisations atteinte")) {
            throw new Error("LIMIT_REACHED");
          }
          if (errorMessage.includes("CREDITS_DEPLETED") || errorMessage.includes("402")) {
            throw new Error("CREDITS_DEPLETED");
          }
          if (errorMessage.includes("RATE_LIMIT") || errorMessage.includes("429")) {
            throw new Error("RATE_LIMIT");
          }
          if (errorMessage.includes("TIMEOUT")) {
            throw new Error("TIMEOUT");
          }
          if (errorMessage.includes("Failed to fetch") || errorMessage.includes("NetworkError")) {
            throw new Error("NETWORK");
          }
          throw error;
        }

        // The existing working flow persists the generated content in shopify_products.
        // Read the fresh row back so every caller immediately receives the canonical data.
        const { data: updatedProduct, error: reloadError } = await supabase
          .from("shopify_products")
          .select("*")
          .eq("id", target.id)
          .single();

        if (reloadError) throw reloadError;
        if (updatedProduct) optimized.push(updatedProduct as unknown as T);
      }

      toast.success(
        fr
          ? `${optimized.length}/${targets.length} produit(s) optimisé(s)`
          : `${optimized.length}/${targets.length} product(s) optimized`,
        { id: toastId },
      );
      await refreshLimits();
      return optimized;
    } catch (error: any) {
      const code = error?.message || String(error);
      const message = code.includes("LIMIT_REACHED")
        ? (fr ? "Limite d’optimisations atteinte" : "Optimization limit reached")
        : code.includes("CREDITS_DEPLETED")
          ? (fr ? "Crédits IA épuisés" : "AI credits depleted")
          : code.includes("RATE_LIMIT")
            ? (fr ? "Trop de requêtes, réessayez dans un instant" : "Too many requests, try again shortly")
            : code.includes("TIMEOUT")
              ? (fr ? "La génération a expiré" : "Generation timed out")
              : code.includes("NETWORK")
                ? (fr ? "Erreur réseau pendant la génération" : "Network error during generation")
                : (fr ? "Impossible d’optimiser le contenu produit" : "Could not optimize product content");

      console.error("[PRODUCT_CONTENT_OPTIMIZATION]", error);
      toast.error(message, { id: toastId });
      return optimized;
    } finally {
      setIsOptimizingContent(false);
      setOptimizationProgress(null);
    }
  }, [canDoAction, fr, refreshLimits]);

  return {
    optimizeProductContent,
    isOptimizingContent,
    optimizationProgress,
  };
}
