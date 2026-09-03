import { useEffect, useState } from "react";
import { Newspaper, Sparkles } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import BlogWorkspace from "@/pages/BlogWorkspace";
import { BlogWizard } from "@/components/blog/BlogWizard";
import { Button } from "@/components/ui/button";
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

  const openBlog = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("new");
    setSearchParams(next, { replace: true });
  };

  const openGeoArticle = () => {
    const next = new URLSearchParams(searchParams);
    next.set("new", "1");
    setSearchParams(next, { replace: true });
  };

  const closeNewArticle = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("new");
    setSearchParams(next, { replace: true });
    setWorkspaceVersion((current) => current + 1);
  };

  return (
    <>
      <nav
        className="mx-auto mb-4 flex w-full max-w-[1500px] flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm"
        aria-label="Blog tools"
      >
        <Button
          type="button"
          size="sm"
          variant={!showNewArticle ? "secondary" : "ghost"}
          className="h-9 gap-1.5 rounded-xl"
          onClick={openBlog}
        >
          <Newspaper className="h-3.5 w-3.5" />
          Blog
        </Button>
        <Button
          type="button"
          size="sm"
          variant={showNewArticle ? "secondary" : "ghost"}
          className="h-9 gap-1.5 rounded-xl"
          onClick={openGeoArticle}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Add GEO Articles
        </Button>
      </nav>

      <BlogWorkspace key={`${storeId || "no-store"}-${workspaceVersion}`} />
      {showNewArticle && <BlogWizard onClose={closeNewArticle} categories={categories} />}
    </>
  );
}
