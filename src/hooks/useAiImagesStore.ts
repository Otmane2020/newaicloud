import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AiImagesStore {
  id: string;
  shop_domain: string;
  shop_name: string | null;
  access_token: string;
  is_active: boolean | null;
  user_id: string | null;
  installed_at: string | null;
}

interface ShopifyConnectionStore {
  id: string;
  store_url: string;
  store_name: string | null;
  is_active: boolean;
  user_id: string;
}

export function useAiImagesStore() {
  const [aiImagesStore, setAiImagesStore] = useState<AiImagesStore | null>(null);
  const [shopifyStore, setShopifyStore] = useState<ShopifyConnectionStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get shop domain from URL params (for embedded apps)
  const shopDomain = useMemo(() => {
    const search = new URLSearchParams(window.location.search);
    return search.get("shop");
  }, []);

  const loadStore = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // If we have a shop domain from URL, use it directly
      if (shopDomain) {
        const { data: aiConn, error: aiError } = await supabase
          .from("ai_images_shopify_connections")
          .select("*")
          .eq("shop_domain", shopDomain)
          .eq("is_active", true)
          .single();

        if (aiError && aiError.code !== "PGRST116") {
          console.error("[useAiImagesStore] Error fetching AI Images connection:", aiError);
        }

        if (aiConn) {
          setAiImagesStore(aiConn);
          
          // Also try to find the corresponding shopify_connections entry
          const storeUrl = `https://${shopDomain}`;
          const { data: shopifyConn } = await supabase
            .from("shopify_connections")
            .select("id, store_url, store_name, is_active, user_id")
            .eq("store_url", storeUrl)
            .single();

          if (shopifyConn) {
            setShopifyStore(shopifyConn);
          }
        }
      } else {
        // Standalone mode - get current user's connections
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // First try ai_images_shopify_connections
          const { data: aiConns } = await supabase
            .from("ai_images_shopify_connections")
            .select("*")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .order("installed_at", { ascending: false })
            .limit(1);

          if (aiConns && aiConns.length > 0) {
            setAiImagesStore(aiConns[0]);
            
            // Find corresponding shopify_connections
            const storeUrl = `https://${aiConns[0].shop_domain}`;
            const { data: shopifyConn } = await supabase
              .from("shopify_connections")
              .select("id, store_url, store_name, is_active, user_id")
              .eq("store_url", storeUrl)
              .single();

            if (shopifyConn) {
              setShopifyStore(shopifyConn);
            }
          } else {
            // Fallback to shopify_connections
            const { data: shopifyConns } = await supabase
              .from("shopify_connections")
              .select("id, store_url, store_name, is_active, user_id")
              .eq("user_id", user.id)
              .eq("is_active", true)
              .order("created_at", { ascending: false })
              .limit(1);

            if (shopifyConns && shopifyConns.length > 0) {
              setShopifyStore(shopifyConns[0]);
            }
          }
        }
      }
    } catch (err) {
      console.error("[useAiImagesStore] Error:", err);
      setError(err instanceof Error ? err.message : "Failed to load store");
    } finally {
      setLoading(false);
    }
  }, [shopDomain]);

  useEffect(() => {
    loadStore();
  }, [loadStore]);

  // Sync products manually
  const syncProducts = useCallback(async () => {
    if (!aiImagesStore || !shopifyStore) {
      toast.error("No store connected");
      return false;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not authenticated");
        return false;
      }

      const { data, error } = await supabase.functions.invoke("ai-images-sync-products", {
        body: {
          shopDomain: aiImagesStore.shop_domain,
          storeId: shopifyStore.id,
          userId: user.id,
        },
      });

      if (error) throw error;
      
      toast.success(`Synced ${data?.productsImported || 0} products`);
      return true;
    } catch (err) {
      console.error("[useAiImagesStore] Sync error:", err);
      toast.error("Failed to sync products");
      return false;
    }
  }, [aiImagesStore, shopifyStore]);

  return {
    aiImagesStore,
    shopifyStore,
    // Return the shopify store ID for compatibility with existing code
    activeStoreId: shopifyStore?.id || null,
    loading,
    error,
    shopDomain,
    refresh: loadStore,
    syncProducts,
  };
}
