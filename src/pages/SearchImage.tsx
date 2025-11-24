import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function SearchImage() {
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setImageUrl("");
    }
  };

  const handleUrlChange = (url: string) => {
    setImageUrl(url);
    setPreviewUrl(url);
    setImageFile(null);
  };

  const analyzeImage = async () => {
    if (!previewUrl) {
      toast({
        title: "Erreur",
        description: "Veuillez fournir une image",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      let finalImageUrl = imageUrl;

      // If file upload, convert to base64
      if (imageFile) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(imageFile);
        });
        finalImageUrl = await base64Promise;
      }

      const { data, error } = await supabase.functions.invoke("analyze-price-from-image", {
        body: { imageUrl: finalImageUrl },
      });

      if (error) throw error;

      setResult(data);
      toast({
        title: "Analyse terminée",
        description: "L'image a été analysée avec succès",
      });
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de l'analyse",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Smart Price AI - Test</h1>
        <p className="text-muted-foreground">
          Analysez les prix et informations produits à partir d'images
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Image Source</CardTitle>
            <CardDescription>Uploadez une image ou fournissez une URL</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="url-input">URL de l'image</Label>
              <Input
                id="url-input"
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="relative">
              <div className="text-center text-sm text-muted-foreground my-2">ou</div>
            </div>

            <div>
              <Label htmlFor="file-input">Upload fichier</Label>
              <Input
                id="file-input"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={loading}
              />
            </div>

            {previewUrl && (
              <div className="mt-4">
                <Label>Aperçu</Label>
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-md border mt-2"
                />
              </div>
            )}

            <Button
              onClick={analyzeImage}
              disabled={loading || !previewUrl}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyse en cours...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Analyser l'image
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Résultats de l'analyse</CardTitle>
            <CardDescription>Informations extraites par l'IA</CardDescription>
          </CardHeader>
          <CardContent>
            {!result && !loading && (
              <div className="text-center text-muted-foreground py-8">
                Aucun résultat. Analysez une image pour commencer.
              </div>
            )}

            {loading && (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Analyse en cours...</p>
              </div>
            )}

            {result && (
              <div className="space-y-4">
                {result.productName && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Nom du produit</Label>
                    <p className="font-medium">{result.productName}</p>
                  </div>
                )}

                {result.price && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Prix détecté</Label>
                    <p className="text-2xl font-bold text-primary">{result.price}</p>
                  </div>
                )}

                {result.currency && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Devise</Label>
                    <p className="font-medium">{result.currency}</p>
                  </div>
                )}

                {result.brand && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Marque</Label>
                    <p className="font-medium">{result.brand}</p>
                  </div>
                )}

                {result.category && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Catégorie</Label>
                    <p className="font-medium">{result.category}</p>
                  </div>
                )}

                {result.description && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Description</Label>
                    <p className="text-sm">{result.description}</p>
                  </div>
                )}

                {result.confidence && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Confiance</Label>
                    <p className="font-medium">{Math.round(result.confidence * 100)}%</p>
                  </div>
                )}

                {result.rawAnalysis && (
                  <div className="mt-4 pt-4 border-t">
                    <Label className="text-xs text-muted-foreground">Analyse complète</Label>
                    <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-auto max-h-64">
                      {JSON.stringify(result.rawAnalysis, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
