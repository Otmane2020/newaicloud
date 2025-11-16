import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, CheckCircle2, AlertCircle, Download } from "lucide-react";
import { useGoogleTaxonomyImport } from "@/hooks/useGoogleTaxonomyImport";

export function GoogleCategoryImport() {
  const { isImporting, importTaxonomy } = useGoogleTaxonomyImport();
  const [importStatus, setImportStatus] = useState<"idle" | "success" | "error">("idle");

  const handleImport = async () => {
    setImportStatus("idle");

    try {
      await importTaxonomy();
      setImportStatus("success");
    } catch (error) {
      setImportStatus("error");
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">
            Importer la Taxonomie Google Product Category
          </h3>
          <p className="text-sm text-muted-foreground">
            Importez les 5000+ catégories Google Shopping pour la classification automatique de vos produits.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Button
            onClick={handleImport}
            disabled={isImporting}
            className="gap-2"
          >
            {isImporting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Téléchargement et import...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Importer la Taxonomie Google
              </>
            )}
          </Button>

          {importStatus === "success" && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">Import réussi !</span>
            </div>
          )}

          {importStatus === "error" && (
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Erreur d'import</span>
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
          <strong>Important :</strong> Cette opération télécharge et importe automatiquement 
          les 5000+ catégories Google Product Category depuis Google. 
          Requis pour la classification IA des produits.
        </div>
      </div>
    </Card>
  );
}
