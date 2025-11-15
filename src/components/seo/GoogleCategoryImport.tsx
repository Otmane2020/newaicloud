import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function GoogleCategoryImport() {
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<"idle" | "success" | "error">("idle");

  const handleImport = async () => {
    setIsImporting(true);
    setImportStatus("idle");

    try {
      // Fetch the taxonomy file
      console.log("📥 Fetching taxonomy file...");
      const response = await fetch("/taxonomy-with-ids.en-US.txt");
      
      if (!response.ok) {
        throw new Error("Failed to fetch taxonomy file");
      }

      const text = await response.text();
      const lines = text
        .split("\n")
        .filter(line => line.trim() && !line.startsWith("#"))
        .map(line => line.trim());

      console.log(`📋 Found ${lines.length} taxonomy entries`);

      // Call import function
      const { data, error } = await supabase.functions.invoke("import-google-taxonomy", {
        body: { taxonomyData: lines },
      });

      if (error) throw error;

      console.log("✅ Import result:", data);
      
      setImportStatus("success");
      toast.success("Taxonomie importée", {
        description: `${data.imported} catégories Google importées avec succès`,
      });
    } catch (error) {
      console.error("Import error:", error);
      setImportStatus("error");
      toast.error("Erreur d'import", {
        description: error instanceof Error ? error.message : "Erreur inconnue",
      });
    } finally {
      setIsImporting(false);
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
                Import en cours...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Importer la Taxonomie
              </>
            )}
          </Button>

          {importStatus === "success" && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">Import réussi</span>
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
          <strong>Note :</strong> Cette opération va importer toute la taxonomie Google Product Category
          dans votre base de données pour permettre la classification automatique des produits via IA.
        </div>
      </div>
    </Card>
  );
}
