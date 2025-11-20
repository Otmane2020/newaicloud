import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

const TEST_PRODUCTS = [
  {
    id: "d8415d62-a5aa-4505-a8cb-7f384f891fdc",
    title: "Tabouret Bar Scandinave Velours Vert Pied Or EURODESIGN",
    sku: "BS52GVS",
  },
  {
    id: "SD22",
    title: "Produit SD22",
    sku: "SD22",
  }
];

type FunctionStatus = "idle" | "loading" | "success" | "error";

export default function TestLectureImage() {
  const [selectedProduct, setSelectedProduct] = useState(TEST_PRODUCTS[0]);
  const [enrichStatus, setEnrichStatus] = useState<FunctionStatus>("idle");
  const [visionStatus, setVisionStatus] = useState<FunctionStatus>("idle");
  const [enrichResult, setEnrichResult] = useState<any>(null);
  const [visionResult, setVisionResult] = useState<any>(null);

  const handleEnrichProduct = async () => {
    setEnrichStatus("loading");
    setEnrichResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke("enrich-product", {
        body: { productId: selectedProduct.id }
      });

      if (error) throw error;

      setEnrichStatus("success");
      setEnrichResult(data);
      toast.success("Enrichissement terminé avec succès");
    } catch (error: any) {
      setEnrichStatus("error");
      setEnrichResult({ error: error.message });
      toast.error("Erreur enrichissement : " + error.message);
    }
  };

  const handleAnalyzeImage = async () => {
    setVisionStatus("loading");
    setVisionResult(null);
    
    try {
      // Récupérer les images du produit
      const { data: images, error: imgError } = await supabase
        .from("product_images")
        .select("src")
        .eq("product_id", selectedProduct.id)
        .limit(1);

      if (imgError) throw imgError;
      if (!images || images.length === 0) {
        throw new Error("Aucune image trouvée pour ce produit");
      }

      const { data, error } = await supabase.functions.invoke("analyze-image-with-vision", {
        body: { 
          imageUrl: images[0].src,
          productContext: {
            title: selectedProduct.title,
            productType: "Tabouret de bar"
          }
        }
      });

      if (error) throw error;

      setVisionStatus("success");
      setVisionResult(data);
      toast.success("Analyse d'image terminée avec succès");
    } catch (error: any) {
      setVisionStatus("error");
      setVisionResult({ error: error.message });
      toast.error("Erreur analyse image : " + error.message);
    }
  };

  const getStatusIcon = (status: FunctionStatus) => {
    switch (status) {
      case "loading":
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Test Lecture Image</h1>
        <p className="text-muted-foreground">
          Testez l'enrichissement et l'analyse d'image
        </p>
        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">Sélectionner un produit :</label>
          <select 
            value={selectedProduct.id}
            onChange={(e) => {
              const product = TEST_PRODUCTS.find(p => p.id === e.target.value);
              if (product) setSelectedProduct(product);
            }}
            className="px-4 py-2 border rounded-md bg-background"
          >
            {TEST_PRODUCTS.map(product => (
              <option key={product.id} value={product.id}>
                {product.title} ({product.sku})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Enrichissement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Enrichissement
              {getStatusIcon(enrichStatus)}
            </CardTitle>
            <CardDescription>
              Appelle la fonction enrich-product pour extraire dimensions et poids
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleEnrichProduct}
              disabled={enrichStatus === "loading"}
              className="w-full"
            >
              {enrichStatus === "loading" ? "Enrichissement en cours..." : "Lancer Enrichissement"}
            </Button>

            {enrichResult && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Résultat :</h4>
                <pre className="text-xs overflow-auto max-h-64">
                  {JSON.stringify(enrichResult, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Analyse Image Vision */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Gemini Lecteur Image
              {getStatusIcon(visionStatus)}
            </CardTitle>
            <CardDescription>
              Appelle analyze-image-with-vision pour extraire dimensions des images
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleAnalyzeImage}
              disabled={visionStatus === "loading"}
              className="w-full"
            >
              {visionStatus === "loading" ? "Analyse en cours..." : "Lancer Analyse Image"}
            </Button>

            {visionResult && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Résultat :</h4>
                <pre className="text-xs overflow-auto max-h-64">
                  {JSON.stringify(visionResult, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
