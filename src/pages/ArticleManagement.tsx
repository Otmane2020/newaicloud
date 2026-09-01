import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import BlogWorkspace from "@/pages/BlogWorkspace";
import { BlogWizard } from "@/components/blog/BlogWizard";
import { useStore } from "@/contexts/StoreContext";
import { supabase } from "@/integrations/supabase/client";

export interface ArticleManagementRef {
  optimizeAllArticles: () => Promise<void>;
}

export interface ArticleManagementProps {
  onOptimizationComplete?: () => void;
}

export default function ArticleManagement(_props: ArticleManagementProps) {
  const { selectedStore } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState<string[]>([]);
  const [workspaceVersion, setWorkspaceVersion] = useState(0);
  const showNewArticle = searchParams.get("new") === "1";
  const storeId = selectedStore?.id;

  useEffect(() => {
    if (!showNewArticle || !storeId) {
      setCategories([]);
      return;
    }

    let cancelled = false;

    const loadCategories = async () => {
      const { data } = await supabase
        .from("shopify_products")
        .select("category")
        .eq("store_id", storeId)
        .not("category", "is", null);

      if (cancelled) return;
      setCategories(Array.from(new Set((data || []).map((row: any) => row.category).filter(Boolean))));
    };

    void loadCategories();
    return () => {
      cancelled = true;
    };
  }, [storeId, showNewArticle]);

  const closeNewArticle = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("new");
    setSearchParams(next, { replace: true });
    setWorkspaceVersion((current) => current + 1);
  };

  return (
    <>
      <BlogWorkspace key={`${storeId || "no-store"}-${workspaceVersion}`} />
      {showNewArticle && <BlogWizard onClose={closeNewArticle} categories={categories} />}
    </>
  );
}
