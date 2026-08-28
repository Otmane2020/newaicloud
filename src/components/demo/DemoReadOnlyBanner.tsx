import { Eye } from "lucide-react";
import { CatalogActionCard } from "@/components/CatalogActionCard";
import { useTranslation } from "@/lib/language";
import { useDemoMode } from "@/hooks/useDemoMode";

export const DemoReadOnlyBanner = () => {
  const { isDemoMode } = useDemoMode();
  const { t } = useTranslation();

  if (!isDemoMode) return null;

  return (
    <div className="mb-4">
      <CatalogActionCard
        icon={Eye}
        compact
        title={t.demo?.banner?.title || "Mode Démonstration"}
        description={
          t.demo?.banner?.message ||
          "Les modifications ne seront pas sauvegardées. Explorez librement toutes les fonctionnalités !"
        }
      />
    </div>
  );
};

export default DemoReadOnlyBanner;
