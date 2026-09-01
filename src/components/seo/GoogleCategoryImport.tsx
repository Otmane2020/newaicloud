import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Database, Download, Loader2, RefreshCw } from "lucide-react";
import { useGoogleTaxonomyImport } from "@/hooks/useGoogleTaxonomyImport";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/language";

type ImportStatus = "idle" | "success" | "error";

export function GoogleCategoryImport() {
  const { isImporting, importTaxonomy } = useGoogleTaxonomyImport();
  const { language } = useTranslation();
  const fr = language === "fr";
  const [importStatus, setImportStatus] = useState<ImportStatus>("idle");
  const [categoryCount, setCategoryCount] = useState<number | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    setIsChecking(true);
    setStatusError(null);

    try {
      const { count, error } = await supabase
        .from("google_product_taxonomy")
        .select("*", { count: "exact", head: true });

      if (error) throw error;

      const nextCount = count ?? 0;
      setCategoryCount(nextCount);
      setImportStatus(nextCount > 0 ? "success" : "idle");
    } catch (error) {
      console.error("Taxonomy status error:", error);
      setImportStatus("error");
      setStatusError(error instanceof Error ? error.message : fr ? "Vérification impossible" : "Could not check taxonomy status");
    } finally {
      setIsChecking(false);
    }
  }, [fr]);

  useEffect(() => {
    void checkStatus();
  }, [checkStatus]);

  const handleImport = async () => {
    setStatusError(null);

    try {
      const result = await importTaxonomy();
      if (typeof result?.imported === "number") setCategoryCount(result.imported);
      setImportStatus("success");
      await checkStatus();
    } catch (error) {
      setImportStatus("error");
      setStatusError(error instanceof Error ? error.message : fr ? "Échec de l'import" : "Import failed");
    }
  };

  const hasTaxonomy = (categoryCount ?? 0) > 0;

  return (
    <Card className="border-slate-200 p-5 shadow-none">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-violet-600" />
              <h3 className="font-semibold text-slate-950">Google Product Taxonomy</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {fr
                ? "Taxonomie officielle utilisée pour classifier automatiquement les produits Google Shopping."
                : "Official taxonomy used to automatically classify Google Shopping products."}
            </p>
          </div>

          {isChecking ? (
            <Badge variant="outline" className="w-fit gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" />
              {fr ? "Vérification" : "Checking"}
            </Badge>
          ) : importStatus === "error" ? (
            <Badge variant="destructive" className="w-fit gap-1.5">
              <AlertCircle className="h-3 w-3" />
              {fr ? "Erreur" : "Error"}
            </Badge>
          ) : hasTaxonomy ? (
            <Badge variant="secondary" className="w-fit gap-1.5">
              <CheckCircle2 className="h-3 w-3" />
              {fr ? "Prête" : "Ready"}
            </Badge>
          ) : (
            <Badge variant="outline" className="w-fit">{fr ? "Non importée" : "Not imported"}</Badge>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {fr ? "Catégories chargées" : "Loaded categories"}
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">
            {categoryCount === null ? "—" : categoryCount.toLocaleString(fr ? "fr-FR" : "en-US")}
          </p>
        </div>

        {statusError && (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">{fr ? "La taxonomie Google n'a pas pu être chargée." : "Google taxonomy could not be loaded."}</p>
              <p className="mt-0.5 break-words text-xs opacity-90">{statusError}</p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void handleImport()} disabled={isImporting || isChecking}>
            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {isImporting
              ? fr ? "Import en cours…" : "Importing…"
              : hasTaxonomy
                ? fr ? "Réimporter la taxonomie" : "Re-import taxonomy"
                : fr ? "Importer la taxonomie" : "Import taxonomy"}
          </Button>
          <Button variant="outline" onClick={() => void checkStatus()} disabled={isImporting || isChecking}>
            {isChecking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            {fr ? "Actualiser le statut" : "Refresh status"}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          {hasTaxonomy
            ? fr
              ? "La classification IA peut utiliser cette taxonomie. Une réimportation remplace la copie locale par la version Google la plus récente."
              : "AI classification can use this taxonomy. Re-importing replaces the local copy with the latest Google version."
            : fr
              ? "Importez la taxonomie avant de lancer la génération automatique des catégories Google."
              : "Import the taxonomy before running automatic Google category generation."}
        </p>
      </div>
    </Card>
  );
}
