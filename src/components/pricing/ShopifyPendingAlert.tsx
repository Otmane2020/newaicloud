import { ShoppingBag } from "lucide-react";
import { CatalogActionCard } from "@/components/CatalogActionCard";
import { useTranslation } from "@/lib/language";

export function ShopifyPendingAlert() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto mb-10 max-w-2xl">
      <CatalogActionCard
        icon={ShoppingBag}
        compact
        title={t.shopifyPending.title}
        description={t.shopifyPending.description}
      />
    </div>
  );
}
