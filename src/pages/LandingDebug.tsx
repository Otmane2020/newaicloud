import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function LandingDebug() {
  const [productId, setProductId] = useState("");
  const [colorSchemeKey, setColorSchemeKey] = useState("ocean_blue");
  const [theme, setTheme] = useState("light");
  const [layout, setLayout] = useState("hero-benefits-specs");
  const [designStyle, setDesignStyle] = useState("modern");
  const [loading, setLoading] = useState(false);
  const [showSource, setShowSource] = useState(false);

  const [result, setResult] = useState<{
    html: string;
    debug: {
      configReceived: any;
      colorSchemeResolved: any;
      designTokens: any;
      promptLength: number;
    };
  } | null>(null);

  const handleGenerate = async () => {
    if (!productId) {
      toast.error("Veuillez entrer un ID de produit");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Fetch product info
      const { data: product, error: productError } = await supabase
        .from("shopify_products")
        .select("*")
        .eq("id", productId)
        .single();

      if (productError || !product) {
        toast.error("Produit introuvable");
        setLoading(false);
        return;
      }

      // Call generate-landing-ai with options
      const { data, error } = await supabase.functions.invoke("generate-landing-ai", {
        body: {
          productId: product.id,
          productTitle: product.title,
          imageUrl: product.image_url,
          description: product.body_html,
          vendor: product.vendor,
          options: {
            colorScheme: colorSchemeKey,
            layout: layout,
            designStyle: designStyle,
            contentLength: "medium",
            theme: theme,
          },
          language: "fr",
        },
      });

      if (error) {
        console.error("Error:", error);
        toast.error("Erreur lors de la génération: " + error.message);
        setLoading(false);
        return;
      }

      setResult(data);
      toast.success("Landing page générée avec succès!");
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Erreur: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">🐛 Landing Page Debug</h1>
      </div>

      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Product ID</Label>
              <Input
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                placeholder="UUID du produit"
              />
            </div>

            <div className="space-y-2">
              <Label>Color Scheme Key</Label>
              <Select value={colorSchemeKey} onValueChange={setColorSchemeKey}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ocean_blue">Ocean Blue</SelectItem>
                  <SelectItem value="forest_green">Forest Green</SelectItem>
                  <SelectItem value="sunset_orange">Sunset Orange</SelectItem>
                  <SelectItem value="royal_purple">Royal Purple</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Theme</Label>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">☀️ Light</SelectItem>
                  <SelectItem value="dark">🌙 Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Layout</Label>
              <Select value={layout} onValueChange={setLayout}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hero-benefits-specs">Hero + Benefits + Specs</SelectItem>
                  <SelectItem value="storytelling">Storytelling</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Design Style</Label>
              <Select value={designStyle} onValueChange={setDesignStyle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="modern">Modern</SelectItem>
                  <SelectItem value="minimalist">Minimalist</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleGenerate} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Génération en cours...
              </>
            ) : (
              "Générer Landing Page"
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          {/* Debug Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Config Received */}
            <Card>
              <CardHeader>
                <CardTitle>📋 Configuration envoyée</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs overflow-auto max-h-64 bg-muted p-4 rounded">
                  {JSON.stringify(result.debug.configReceived, null, 2)}
                </pre>
              </CardContent>
            </Card>

            {/* Color Scheme Resolved */}
            <Card>
              <CardHeader>
                <CardTitle>🎨 Color Scheme résolu</CardTitle>
              </CardHeader>
              <CardContent>
                {result.debug.colorSchemeResolved ? (
                  <div className="space-y-2">
                    {Object.entries(result.debug.colorSchemeResolved).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded border"
                          style={{ background: value as string }}
                        />
                        <span className="text-xs">
                          {key}: {value as string}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Aucun color scheme résolu</p>
                )}
              </CardContent>
            </Card>

            {/* Design Tokens */}
            <Card>
              <CardHeader>
                <CardTitle>🎯 Design Tokens générés</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs overflow-auto max-h-64 bg-muted p-4 rounded">
                  {JSON.stringify(result.debug.designTokens, null, 2)}
                </pre>
              </CardContent>
            </Card>

            {/* Prompt Length */}
            <Card>
              <CardHeader>
                <CardTitle>🤖 Prompt AI</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="font-semibold">Longueur:</span> {result.debug.promptLength} caractères
                  </p>
                  <p className="text-xs text-muted-foreground">
                    (Le prompt complet n'est pas retourné pour des raisons de performance)
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* HTML Preview */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>👁️ Preview HTML</CardTitle>
                <Button variant="outline" onClick={() => setShowSource(!showSource)}>
                  {showSource ? "Voir Preview" : "Voir Source"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showSource ? (
                <pre className="text-xs overflow-auto max-h-[600px] bg-muted p-4 rounded">
                  {result.html}
                </pre>
              ) : (
                <iframe
                  srcDoc={result.html}
                  className="w-full h-[600px] border rounded"
                  title="Landing Page Preview"
                />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
