import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { calculateDetailedSeoScore } from '@/lib/seoQuality';

export interface Product {
  id: string;
  title: string;
  vendor: string;
  category: string;
  sub_category: string;
  seo_title: string;
  seo_description: string;
  enrichment_status: string;
  seo_synced_to_shopify: boolean;
  image_url: string;
  imported_at: string;
  optimization_count: number;
  tags: string;
  product_type: string;
}

export function useSeoProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from("shopify_products")
        .select("*")
        .eq("seller_id", user.id)
        .order("imported_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  return {
    products,
    loading,
    reload: loadProducts,
  };
}

export function useFilteredProducts(
  products: Product[],
  filters: {
    searchTerm: string;
    activeTab: string;
    selectedCategory: string;
    statusFilter: string;
    syncFilter: string;
    qualityFilter: string;
  }
) {
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

  useEffect(() => {
    let filtered = [...products];

    // Search term
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title?.toLowerCase().includes(term) ||
          p.vendor?.toLowerCase().includes(term)
      );
    }

    // Active tab
    if (filters.activeTab !== "all") {
      switch (filters.activeTab) {
        case "not-enriched":
          filtered = filtered.filter((p) => !p.optimization_count || p.optimization_count === 0);
          break;
        case "enriched":
          filtered = filtered.filter((p) => p.optimization_count > 0);
          break;
        case "pending-sync":
          filtered = filtered.filter((p) => p.optimization_count > 0 && !p.seo_synced_to_shopify);
          break;
        case "synced":
          filtered = filtered.filter((p) => p.seo_synced_to_shopify);
          break;
      }
    }

    // Category filter
    if (filters.selectedCategory !== "all") {
      filtered = filtered.filter((p) => p.category === filters.selectedCategory);
    }

    // Status filter
    if (filters.statusFilter !== "all") {
      if (filters.statusFilter === "optimized") {
        filtered = filtered.filter((p) => p.optimization_count > 0);
      } else {
        filtered = filtered.filter((p) => !p.optimization_count || p.optimization_count === 0);
      }
    }

    // Sync filter
    if (filters.syncFilter !== "all") {
      if (filters.syncFilter === "synced") {
        filtered = filtered.filter((p) => p.seo_synced_to_shopify);
      } else {
        filtered = filtered.filter((p) => !p.seo_synced_to_shopify);
      }
    }

    // Quality filter
    if (filters.qualityFilter !== "all") {
      filtered = filtered.filter((p) => {
        const titleScore = calculateDetailedSeoScore(p.seo_title, p.category, null, null);
        const grade = titleScore.score >= 80 ? "excellent" : titleScore.score >= 60 ? "good" : titleScore.score >= 40 ? "medium" : "poor";
        return grade === filters.qualityFilter;
      });
    }

    setFilteredProducts(filtered);
  }, [products, filters]);

  return filteredProducts;
}
