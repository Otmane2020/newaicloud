import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useGoogleTaxonomyImport() {
  const [isImporting, setIsImporting] = useState(false);

  const importTaxonomy = async () => {
    setIsImporting(true);

    try {
      console.log("🔄 Starting taxonomy import...");
      
      const { data, error } = await supabase.functions.invoke("import-google-taxonomy");

      if (error) throw error;

      toast.success("Taxonomie importée", {
        description: `${data.imported} catégories Google importées avec succès`,
      });

      return data;
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Erreur d'importation", {
        description: error instanceof Error ? error.message : "Erreur inconnue",
      });
      throw error;
    } finally {
      setIsImporting(false);
    }
  };

  return {
    isImporting,
    importTaxonomy,
  };
}
