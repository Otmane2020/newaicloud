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

  useEffect(() => {
    if (!showNewArticle || !selectedStore?.id) {
      setCategories([]);
      return;
    }

    let cancelled = false;

    const loadCategories = async () => {
      const { data } = await supabase
        .from("shopify_products")
        .select("category")
        .eq("store_id", selectedStore.id)
        .not("category", "is", null);

      if (cancelled) return;
      setCategories(Array.from(new Set((data || []).map((row: any) => row.category).filter(Boolean))));
    };

    void loadCategories();
    return () => {
      cancelled = true;
    };
  }, [selectedStore?.id, showNewArticle]);

  const closeNewArticle = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("new");
    setSearchParams(next, { replace: true });
    setWorkspaceVersion((current) => current + 1);
  };

  return (
    <>
      <BlogWorkspace key={`${selectedStore?.id || "no-store"}-${workspaceVersion}`} />
      {showNewArticle && <BlogWizard onClose={closeNewArticle} categories={categories} />}
    </>
  );
}
