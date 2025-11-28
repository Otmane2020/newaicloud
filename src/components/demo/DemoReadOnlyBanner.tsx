import { AlertTriangle, Eye } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslation } from "@/lib/language";
import { useDemoMode } from "@/hooks/useDemoMode";

export const DemoReadOnlyBanner = () => {
  const { isDemoMode } = useDemoMode();
  const { t } = useTranslation();

  if (!isDemoMode) return null;

  return (
    <Alert className="bg-warning/10 border-warning/30 mb-4">
      <Eye className="h-4 w-4 text-warning" />
      <AlertDescription className="flex items-center gap-2 text-warning-foreground">
        <AlertTriangle className="h-4 w-4 text-warning" />
        <span className="font-medium">{t.demo?.banner?.title || "Mode Démonstration"}</span>
        <span className="text-muted-foreground">
          {t.demo?.banner?.message || "Les modifications ne seront pas sauvegardées. Explorez librement toutes les fonctionnalités !"}
        </span>
      </AlertDescription>
    </Alert>
  );
};

export default DemoReadOnlyBanner;
