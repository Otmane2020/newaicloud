import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLandingPreferences } from "@/hooks/useLandingPreferences";
import { Link } from "react-router-dom";

export default function LandingTest() {
  const { user } = useAuth();
  const { preferences, isLoading: loadingPreferences } = useLandingPreferences(user?.id);
  const [selectedPreferenceId, setSelectedPreferenceId] = useState<string | null>(null);
  const [config, setConfig] = useState({
    layout: 'single-column',
    style: 'modern',
    colorScheme: 'blue-white',
    theme: 'light',
    contentLength: 'short',
    highlights: [] as string[]
  });
  
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [product, setProduct] = useState<any>(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  
  // ✅ Load options from database
  const [layouts, setLayouts] = useState<any[]>([]);
  const [designStyles, setDesignStyles] = useState<any[]>([]);
  const [colorSchemes, setColorSchemes] = useState<any[]>([]);
  const [contentLengths, setContentLengths] = useState<any[]>([]);
  const [highlights, setHighlights] = useState<any[]>([]);

  // Synchroniser automatiquement la config avec la préférence par défaut
  useEffect(() => {
    if (!preferences || preferences.length === 0) return;
    const defaultPref = (preferences as any[]).find((p: any) => p.is_default);
    if (defaultPref) {
      setSelectedPreferenceId(defaultPref.id);
      setConfig((prev) => ({
        ...prev,
        layout: defaultPref.layout || prev.layout,
        style: defaultPref.design_style || prev.style,
        contentLength: defaultPref.content_length || prev.contentLength,
      }));
    }
  }, [preferences]);

  // Load configuration options from database
  useEffect(() => {
    const fetchOptions = async () => {
      const { data } = await supabase
        .from('landing_page_config_options')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (data) {
        setLayouts(data.filter(o => o.category === 'layout'));
        setDesignStyles(data.filter(o => o.category === 'design_style'));
        setColorSchemes(data.filter(o => o.category === 'color_scheme'));
        setContentLengths(data.filter(o => o.category === 'content_length'));
        setHighlights(data.filter(o => o.category === 'highlight'));
        
        console.log('✅ Options chargées depuis DB:', {
          layouts: data.filter(o => o.category === 'layout').length,
          styles: data.filter(o => o.category === 'design_style').length,
          colorSchemes: data.filter(o => o.category === 'color_scheme').length
        });
      }
    };
    fetchOptions();
  }, []);

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
            seo_description,
            vendor,
            image_url,
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
    console.log('🧪 [TEST] Génération avec config depuis DB:', config);
    
    try {
      // ✅ Chercher la préférence sélectionnée (si existante)
      const selectedPreference = (preferences as any[] | undefined)?.find(
        (p: any) => p.id === selectedPreferenceId
      );

      // ✅ Couleurs provenant de la préférence (si définies)
      let colorSchemeFromPreference: any | null = null;
      if (selectedPreference) {
        colorSchemeFromPreference = {
          primary: selectedPreference.color_primary,
          secondary: selectedPreference.color_secondary,
          accent: selectedPreference.color_accent,
          background: selectedPreference.color_background,
          surface: selectedPreference.color_surface,
          text: selectedPreference.color_text,
          textMuted: selectedPreference.color_text_muted,
        };
      }

      // ✅ Palette depuis la table d'options (fallback)
      const selectedColorScheme = colorSchemes.find(c => c.option_key === config.colorScheme);

      // ✅ Construire l'objet userPreferences
      const testPreferences = {
        layout: selectedPreference?.layout || config.layout,
        designStyle: selectedPreference?.design_style || config.style,
        contentLength: selectedPreference?.content_length || config.contentLength,
        colorScheme:
          colorSchemeFromPreference ||
          selectedColorScheme?.option_value || {
            primary: 'hsl(221, 83%, 53%)',
            secondary: 'hsl(188, 78%, 41%)',
            accent: 'hsl(38, 92%, 50%)',
            background: 'hsl(0, 0%, 100%)',
            surface: 'hsl(210, 40%, 98%)',
            text: 'hsl(222, 47%, 11%)',
            textMuted: 'hsl(215, 16%, 47%)',
          },
        highlights: selectedPreference?.custom_highlights || config.highlights || [],
      };

      console.log('🧪 [TEST] userPreferences:', testPreferences);

      // ✅ Call generate-landing-ai with userPreferences
      const { data, error } = await supabase.functions.invoke('generate-landing-ai', {
        body: {
          product_id: product.id,
          productTitle: product.title,
          description: product.body_html || product.seo_description || "",
          vendor: product.vendor || "Marque",
          imageUrl: product.image_url,
          userPreferences: testPreferences, // ✅ NEW
          language: 'fr'
        }
      });

      if (error) throw error;
      
      if (data?.html) {
        console.log('✅ HTML généré:', data.html.length, 'caractères');
        setHtml(data.html);
        toast.success("✅ Landing page générée !");
      } else {
        throw new Error("Pas de HTML retourné");
      }
    } catch (err: any) {
      console.error('❌ Erreur:', err);
      toast.error("❌ " + err.message);
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
        <div className="flex items-center justify-between">
          <div className="text-center space-y-2 flex-1">
            <h1 className="text-4xl font-bold text-foreground">🧪 Landing Page Test Lab</h1>
            <p className="text-muted-foreground">
              Teste toutes les options de génération avec DeepSeek
            </p>
          </div>
          <Link to="/landing-configurator">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Gérer les préférences
            </Button>
          </Link>
        </div>
        
        {/* Configuration Panel */}
        <Card>
          <CardHeader>
            <CardTitle>⚙️ Configuration de Test</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Sélecteur de préférences sauvegardées */}
            {loadingPreferences && (
              <p className="mb-4 text-sm text-muted-foreground">
                Chargement de vos préférences enregistrées...
              </p>
            )}
            {!loadingPreferences && preferences && (preferences as any[]).length > 0 && (
              <div className="mb-6 space-y-2">
                <Label>Préférence sauvegardée</Label>
                <Select
                  value={selectedPreferenceId || 'manual'}
                  onValueChange={(value) => {
                    if (value === 'manual') {
                      setSelectedPreferenceId(null);
                      return;
                    }
                    setSelectedPreferenceId(value);
                    const pref = (preferences as any[]).find((p: any) => p.id === value);
                    if (pref) {
                      setConfig((prev) => ({
                        ...prev,
                        layout: pref.layout || prev.layout,
                        style: pref.design_style || prev.style,
                        contentLength: pref.content_length || prev.contentLength,
                      }));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une préférence (optionnel)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Configuration manuelle</SelectItem>
                    {(preferences as any[]).map((pref: any) => (
                      <SelectItem key={pref.id} value={pref.id}>
                        {pref.is_default ? '⭐ ' : ''}
                        {pref.layout} / {pref.design_style} / {pref.content_length}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Layout - Dynamic from DB */}
              <div className="space-y-2">
                <Label>Layout</Label>
                <Select value={config.layout} onValueChange={(v) => setConfig({...config, layout: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {layouts.map(layout => (
                      <SelectItem key={layout.id} value={layout.option_key}>
                        {layout.option_label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Style - Dynamic from DB */}
              <div className="space-y-2">
                <Label>Style Visuel</Label>
                <Select value={config.style} onValueChange={(v) => setConfig({...config, style: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {designStyles.map(style => (
                      <SelectItem key={style.id} value={style.option_key}>
                        {style.option_label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Color Scheme - Dynamic from DB with preview */}
              <div className="space-y-2">
                <Label>Palette de Couleurs</Label>
                <Select value={config.colorScheme} onValueChange={(v) => setConfig({...config, colorScheme: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {colorSchemes.map(scheme => (
                      <SelectItem key={scheme.id} value={scheme.option_key}>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            <div className="w-4 h-4 rounded" style={{ background: scheme.option_value.primary }} />
                            <div className="w-4 h-4 rounded" style={{ background: scheme.option_value.secondary }} />
                          </div>
                          {scheme.option_label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Content Length - Dynamic from DB */}
              <div className="space-y-2">
                <Label>Longueur du Contenu</Label>
                <Select value={config.contentLength} onValueChange={(v) => setConfig({...config, contentLength: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {contentLengths.map(length => (
                      <SelectItem key={length.id} value={length.option_key}>
                        {length.option_label}
                      </SelectItem>
                    ))}
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
                  <span
                    className={
                      html.includes('theme-toggle') ||
                      html.includes('toggleTheme(') ||
                      html.includes('data-theme')
                        ? 'text-green-600'
                        : 'text-red-600'
                    }
                  >
                    {html.includes('theme-toggle') ||
                    html.includes('toggleTheme(') ||
                    html.includes('data-theme')
                      ? '✅ Présent'
                      : '❌ Manquant'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CSS :root:</span>
                  <span
                    className={
                      html.includes(':root {') || html.includes(':root{')
                        ? 'text-green-600'
                        : 'text-red-600'
                    }
                  >
                    {html.includes(':root {') || html.includes(':root{')
                      ? '✅ Présent'
                      : '❌ Manquant'}
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
