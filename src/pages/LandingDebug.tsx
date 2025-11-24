import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function LandingDebug() {
  const [productId, setProductId] = useState("");
  const [colorSchemeKey, setColorSchemeKey] = useState("");
  const [theme, setTheme] = useState("light");
  const [layout, setLayout] = useState("");
  const [designStyle, setDesignStyle] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSource, setShowSource] = useState(false);

  // Fetch products
  const { data: products } = useQuery({
    queryKey: ["debug-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shopify_products")
        .select("id, title, image_url, vendor")
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  // Fetch color schemes
  const { data: colorSchemes } = useQuery({
    queryKey: ["config-color-schemes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("landing_page_config_options")
        .select("option_key, option_label, option_value")
        .eq("category", "color_scheme")
        .eq("is_active", true)
        .order("display_order")
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  // Fetch layouts
  const { data: layouts } = useQuery({
    queryKey: ["config-layouts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("landing_page_config_options")
        .select("option_key, option_label, option_value")
        .eq("category", "layout")
        .eq("is_active", true)
        .order("display_order")
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  // Fetch design styles
  const { data: designStyles } = useQuery({
    queryKey: ["config-design-styles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("landing_page_config_options")
        .select("option_key, option_label, option_value")
        .eq("category", "design_style")
        .eq("is_active", true)
        .order("display_order")
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  // Set defaults when data loads
  useEffect(() => {
    if (products && products.length > 0 && !productId) {
      setProductId(products[0].id);
    }
  }, [products, productId]);

  useEffect(() => {
    if (colorSchemes && colorSchemes.length > 0 && !colorSchemeKey) {
      setColorSchemeKey(colorSchemes[0].option_key);
    }
  }, [colorSchemes, colorSchemeKey]);

  useEffect(() => {
    if (layouts && layouts.length > 0 && !layout) {
      setLayout(layouts[0].option_key);
    }
  }, [layouts, layout]);

  useEffect(() => {
    if (designStyles && designStyles.length > 0 && !designStyle) {
      setDesignStyle(designStyles[0].option_key);
    }
  }, [designStyles, designStyle]);

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
        .maybeSingle();

      if (productError || !product) {
        toast.error("Produit introuvable");
        setLoading(false);
        return;
      }

      // Find the full option values
      const colorSchemeObj = colorSchemes?.find(cs => cs.option_key === colorSchemeKey);
      const layoutObj = layouts?.find(l => l.option_key === layout);
      const designStyleObj = designStyles?.find(ds => ds.option_key === designStyle);

      // Call generate-landing-ai with options
      const { data, error } = await supabase.functions.invoke("generate-landing-ai", {
        body: {
          productId: product.id,
          productTitle: product.title,
          imageUrl: product.image_url,
          description: product.body_html,
          vendor: product.vendor,
          options: {
            colorScheme: colorSchemeObj?.option_value || colorSchemeKey,
            layout: layoutObj?.option_value || layout,
            designStyle: designStyleObj?.option_value || designStyle,
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
              <Label>Produit</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un produit" />
                </SelectTrigger>
                <SelectContent>
                  {products?.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.title} {product.vendor ? `(${product.vendor})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Color Scheme</Label>
              <Select value={colorSchemeKey} onValueChange={setColorSchemeKey}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un schéma" />
                </SelectTrigger>
                <SelectContent>
                  {colorSchemes?.map((scheme) => (
                    <SelectItem key={scheme.option_key} value={scheme.option_key}>
                      {scheme.option_label}
                    </SelectItem>
                  ))}
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
                  <SelectValue placeholder="Sélectionner un layout" />
                </SelectTrigger>
                <SelectContent>
                  {layouts?.map((layoutOption) => (
                    <SelectItem key={layoutOption.option_key} value={layoutOption.option_key}>
                      {layoutOption.option_label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Design Style</Label>
              <Select value={designStyle} onValueChange={setDesignStyle}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un style" />
                </SelectTrigger>
                <SelectContent>
                  {designStyles?.map((style) => (
                    <SelectItem key={style.option_key} value={style.option_key}>
                      {style.option_label}
                    </SelectItem>
                  ))}
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
