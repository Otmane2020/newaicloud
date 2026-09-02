import { useEffect, useState } from "react";
import { Grid3x3, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/language";
import ProductsLegacy from "./ProductsLegacy";
import Products3x5View from "./catalog/Products3x5View";

type CatalogViewMode = "3x5" | "classic";

const STORAGE_KEY = "catalog-products-view";

export default function Products() {
  const { language } = useTranslation();
  const fr = language === "fr";
  const [viewMode, setViewMode] = useState<CatalogViewMode>(() => {
    if (typeof window === "undefined") return "3x5";
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "classic" ? "classic" : "3x5";
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, viewMode);
  }, [viewMode]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <Button
            size="sm"
            variant={viewMode === "3x5" ? "default" : "ghost"}
            className={viewMode === "3x5" ? "rounded-lg bg-violet-600 hover:bg-violet-700" : "rounded-lg"}
            onClick={() => setViewMode("3x5")}
          >
            <Grid3x3 className="mr-1.5 h-4 w-4" />
            {fr ? "Vue 3 × 5" : "3 × 5 view"}
          </Button>
          <Button
            size="sm"
            variant={viewMode === "classic" ? "secondary" : "ghost"}
            className="rounded-lg"
            onClick={() => setViewMode("classic")}
          >
            <List className="mr-1.5 h-4 w-4" />
            {fr ? "Vue classique" : "Classic view"}
          </Button>
        </div>
      </div>

      {viewMode === "3x5" ? <Products3x5View /> : <ProductsLegacy />}
    </div>
  );
}
