import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function LandingTest() {
  const [config, setConfig] = useState({
    layout: 'single-column',
    style: 'modern',
    colorScheme: 'blue-white',
    theme: 'light',
    contentLength: 'short'
  });
  
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [product, setProduct] = useState<any>(null);
  const [loadingProduct, setLoadingProduct] = useState(true);

  // Fetch a real product with all details from the database
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data, error } = await supabase
          .from('shopify_products')
          .select(`
            id, 
            title, 
            body_html, 
            vendor,
            product_images (src, alt_text)
          `)
          .limit(1)
          .single();

        if (error) throw error;
        
        if (data) {
          setProduct(data);
          console.log('✅ Produit chargé pour test:', data.title);
        } else {
          toast.error("Aucun produit trouvé dans la base de données");
        }
      } catch (err: any) {
        console.error('❌ Erreur chargement produit:', err);
        toast.error("Erreur: " + err.message);
      } finally {
        setLoadingProduct(false);
      }
    };

    fetchProduct();
  }, []);

  // Palette de couleurs disponibles
  const getPaletteColors = (scheme: string) => {
    const palettes: Record<string, any> = {
      'blue-white': {
        primary: '#1e40af',
        secondary: '#60a5fa',
        background: '#ffffff',
        surface: '#f8fafc',
        text: '#1e293b',
        textMuted: '#64748b'
      },
      'green-beige': {
        primary: '#059669',
        secondary: '#d97706',
        background: '#fef3c7',
        surface: '#fef9ec',
        text: '#1c1917',
        textMuted: '#78716c'
      },
      'purple-gold': {
        primary: '#7c3aed',
        secondary: '#d97706',
        background: '#ffffff',
        surface: '#faf5ff',
        text: '#1e1b4b',
        textMuted: '#6b7280'
      },
      'dark-luxury': {
        primary: '#d4af37',
        secondary: '#c0c0c0',
        background: '#0f172a',
        surface: '#1e293b',
        text: '#f1f5f9',
        textMuted: '#cbd5e1'
      }
    };
    return palettes[scheme] || palettes['blue-white'];
  };

  const handleGenerate = async () => {
    if (!product) {
      toast.error("Aucun produit disponible pour le test");
      return;
    }

    setLoading(true);
    console.log('🧪 [TEST] Génération avec config:', config);
    console.log('🧪 [TEST] Product:', product.title);
    
    // Get first image if available
    const firstImage = product.product_images?.[0];
    
    try {
      const { data, error } = await supabase.functions.invoke("generate-landing-ai", {
        body: {
          product_id: product.id,
          productTitle: product.title,
          description: product.body_html,
          vendor: product.vendor,
          imageUrl: firstImage?.src,
          style: config.style,
          layout: config.layout,
          colorScheme: getPaletteColors(config.colorScheme),
          length: config.contentLength,
          language: 'fr',
          designStyle: config.style,
        },
      });

      if (error) {
        console.error('🧪 [TEST] Erreur:', error);
        throw error;
      }
      
      if (data?.html) {
        console.log('🧪 [TEST] HTML généré:', {
          length: data.html.length,
          hasToggle: data.html.includes('theme-toggle'),
          hasRoot: data.html.includes(':root'),
        });
        setHtml(data.html);
        toast.success("✅ Landing page générée avec succès !");
      } else {
        throw new Error("Pas de HTML retourné");
      }
    } catch (err: any) {
      console.error('🧪 [TEST] Erreur fatale:', err);
      toast.error("❌ Erreur: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const openInNewWindow = () => {
    if (!html) return;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  if (loadingProduct) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Chargement d'un produit pour le test...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive">Aucun produit trouvé dans la base de données</p>
          <p className="text-muted-foreground">Veuillez d'abord importer des produits</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground">🧪 Landing Page Test Lab</h1>
          <p className="text-muted-foreground">
            Teste toutes les options de génération avec DeepSeek
          </p>
        </div>
        
        {/* Configuration Panel */}
        <Card>
          <CardHeader>
            <CardTitle>⚙️ Configuration de Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Layout */}
              <div className="space-y-2">
                <Label>Layout</Label>
                <Select value={config.layout} onValueChange={(v) => setConfig({...config, layout: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single-column">Single Column</SelectItem>
                    <SelectItem value="two-column">Two Column</SelectItem>
                    <SelectItem value="hero-left">Hero Left</SelectItem>
                    <SelectItem value="hero-right">Hero Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Style */}
              <div className="space-y-2">
                <Label>Style Visuel</Label>
                <Select value={config.style} onValueChange={(v) => setConfig({...config, style: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minimalist">Minimalist</SelectItem>
                    <SelectItem value="modern">Modern</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Color Scheme */}
              <div className="space-y-2">
                <Label>Palette de Couleurs</Label>
                <Select value={config.colorScheme} onValueChange={(v) => setConfig({...config, colorScheme: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blue-white">🔵 Blue & White</SelectItem>
                    <SelectItem value="green-beige">🟢 Green & Beige</SelectItem>
                    <SelectItem value="purple-gold">🟣 Purple & Gold</SelectItem>
                    <SelectItem value="dark-luxury">⚫ Dark Luxury</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Theme */}
              <div className="space-y-2">
                <Label>Thème par Défaut</Label>
                <Select value={config.theme} onValueChange={(v) => setConfig({...config, theme: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">☀️ Light</SelectItem>
                    <SelectItem value="dark">🌙 Dark</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Content Length */}
              <div className="space-y-2">
                <Label>Longueur du Contenu</Label>
                <Select value={config.contentLength} onValueChange={(v) => setConfig({...config, contentLength: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">📄 Short (500-800 mots)</SelectItem>
                    <SelectItem value="long">📚 Long (1500-2500 mots)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex gap-4 mt-6">
              <Button 
                onClick={handleGenerate} 
                disabled={loading}
                className="flex-1"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Génération en cours...
                  </>
                ) : (
                  <>
                    🚀 Générer Landing Page (Lovable AI)
                  </>
                )}
              </Button>
              
              {html && (
                <Button 
                  onClick={openInNewWindow} 
                  variant="outline"
                  size="lg"
                >
                  🔗 Ouvrir dans un Nouvel Onglet
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        {html && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>👁️ Aperçu en Temps Réel</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'desktop' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('desktop')}
                  >
                    🖥️ Desktop
                  </Button>
                  <Button
                    variant={viewMode === 'mobile' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('mobile')}
                  >
                    📱 Mobile
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden bg-white">
                <iframe
                  srcDoc={html}
                  className={`w-full transition-all duration-300 ${
                    viewMode === 'desktop' ? 'h-[800px]' : 'h-[800px] max-w-[375px] mx-auto'
                  }`}
                  title="Landing Page Preview"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Debug Info */}
        {html && (
          <Card>
            <CardHeader>
              <CardTitle>🐛 Informations de Debug</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm font-mono">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taille HTML:</span>
                  <span className="font-semibold">{(html.length / 1024).toFixed(2)} KB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Toggle Dark/Light:</span>
                  <span className={html.includes('theme-toggle') ? 'text-green-600' : 'text-red-600'}>
                    {html.includes('theme-toggle') ? '✅ Présent' : '❌ Manquant'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CSS :root:</span>
                  <span className={html.includes(':root {') ? 'text-green-600' : 'text-red-600'}>
                    {html.includes(':root {') ? '✅ Présent' : '❌ Manquant'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Images Placeholder:</span>
                  <span className={html.includes('via.placeholder.com') ? 'text-red-600' : 'text-green-600'}>
                    {html.includes('via.placeholder.com') ? '❌ Détecté (ERREUR)' : '✅ Aucune'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Layout Classes:</span>
                  <span className="font-semibold">
                    {config.layout === 'single-column' && html.includes('lg:grid-cols-2') 
                      ? '⚠️ Grid-cols-2 détecté' 
                      : '✅ OK'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
