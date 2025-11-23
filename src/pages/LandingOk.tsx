import { useState, useEffect } from 'react';
import { PreferencesConfigurator } from '@/components/landing/PreferencesConfigurator';
import { LandingPagePreview } from '@/components/landing/LandingPagePreview';
import { PreferencesDebugPanel } from '@/components/landing/PreferencesDebugPanel';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function LandingOk() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedHTML, setGeneratedHTML] = useState<string>('');
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  
  // Product selection
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [loadingProducts, setLoadingProducts] = useState(true);
  
  const [previewConfig, setPreviewConfig] = useState({
    layout: '',
    designStyle: '',
    contentLength: '',
    colors: {
      primary: '',
      secondary: '',
      accent: '',
      background: '',
      surface: '',
      text: '',
      textMuted: ''
    },
    highlights: [] as string[]
  });

  // Load products on mount
  useEffect(() => {
    const fetchProducts = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('shopify_products')
          .select('id, title, image_url, price, body_html, vendor')
          .eq('seller_id', user.id)
          .limit(50)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        setProducts(data || []);
        if (data && data.length > 0) {
          setSelectedProductId(data[0].id);
          addDebugLog(`✅ ${data.length} produits chargés`);
        }
      } catch (error: any) {
        console.error('Error loading products:', error);
        addDebugLog(`❌ Erreur chargement produits: ${error.message}`);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, [user?.id]);

  const addDebugLog = (message: string) => {
    setDebugLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const handleGenerateLanding = async () => {
    if (!user?.id) {
      toast({
        title: 'Erreur',
        description: 'Utilisateur non connecté',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedProductId) {
      toast({
        title: 'Produit manquant',
        description: 'Veuillez sélectionner un produit',
        variant: 'destructive',
      });
      return;
    }

    if (!previewConfig.layout || !previewConfig.designStyle || !previewConfig.contentLength) {
      toast({
        title: 'Configuration incomplète',
        description: 'Veuillez sélectionner toutes les options de configuration',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    setDebugLogs([]);
    addDebugLog('🚀 Démarrage de la génération...');
    
    const selectedProduct = products.find(p => p.id === selectedProductId);
    addDebugLog(`📦 Produit sélectionné: ${selectedProduct?.title}`);

    try {
      // 1. Sauvegarder la préférence en base de données
      addDebugLog('📝 Sauvegarde de la préférence en base de données...');
      addDebugLog(`🎨 Couleurs à sauvegarder: ${JSON.stringify(previewConfig.colors)}`);
      
      const { data: preference, error: prefError } = await supabase
        .from('landing_page_preferences')
        .insert({
          user_id: user.id,
          layout: previewConfig.layout,
          design_style: previewConfig.designStyle,
          content_length: previewConfig.contentLength,
          color_primary: previewConfig.colors.primary,
          color_secondary: previewConfig.colors.secondary,
          color_accent: previewConfig.colors.accent,
          color_background: previewConfig.colors.background,
          color_surface: previewConfig.colors.surface,
          color_text: previewConfig.colors.text,
          color_text_muted: previewConfig.colors.textMuted, // Mapping correct vers DB
          custom_highlights: previewConfig.highlights.length > 0 ? previewConfig.highlights : null,
          is_default: false
        })
        .select()
        .maybeSingle();

      if (prefError) {
        addDebugLog(`❌ Erreur sauvegarde préférence: ${prefError.message}`);
        throw prefError;
      }

      addDebugLog(`✅ Préférence sauvegardée (ID: ${preference.id})`);

      // 2. Appeler la fonction generate-landing-ai
      addDebugLog('🎨 Appel de generate-landing-ai...');
      addDebugLog(`📊 Config envoyée: layout=${previewConfig.layout}, style=${previewConfig.designStyle}, length=${previewConfig.contentLength}`);
      addDebugLog(`🎨 Couleurs: primary=${previewConfig.colors.primary}, secondary=${previewConfig.colors.secondary}`);
      addDebugLog(`✨ Highlights: ${previewConfig.highlights.length} items`);
      
      const payload = {
        product_id: selectedProduct.id,
        productTitle: selectedProduct.title,
        description: selectedProduct.body_html || '',
        vendor: selectedProduct.vendor || 'Marque',
        imageUrl: selectedProduct.image_url || '',
        price: selectedProduct.price,
        userPreferences: {
          layout: previewConfig.layout,
          designStyle: previewConfig.designStyle,
          contentLength: previewConfig.contentLength,
          colorScheme: previewConfig.colors, // ✅ IMPORTANT: utiliser colorScheme (format attendu par l'edge function)
          highlights: previewConfig.highlights
        },
        debug: true
      };
      
      addDebugLog(`📤 Payload complet: ${JSON.stringify(payload, null, 2).substring(0, 500)}...`);
      
      const { data: functionData, error: functionError } = await supabase.functions.invoke('generate-landing-ai', {
        body: payload
      });

      if (functionError) {
        addDebugLog(`❌ Erreur fonction: ${functionError.message}`);
        throw functionError;
      }

      addDebugLog('✅ Fonction exécutée avec succès');
      
      if (functionData?.html) {
        setGeneratedHTML(functionData.html);
        addDebugLog(`📄 HTML généré (${functionData.html.length} caractères)`);
      }

      if (functionData?.debug) {
        addDebugLog('🔍 Logs de debug de la fonction:');
        Object.entries(functionData.debug).forEach(([key, value]) => {
          addDebugLog(`  - ${key}: ${JSON.stringify(value)}`);
        });
      }

      toast({
        title: 'Génération réussie',
        description: 'Landing page générée avec succès',
      });

    } catch (error: any) {
      console.error('Erreur génération:', error);
      addDebugLog(`❌ ERREUR FINALE: ${error.message || 'Erreur inconnue'}`);
      
      toast({
        title: 'Erreur de génération',
        description: error.message || 'Impossible de générer la landing page',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
      addDebugLog('🏁 Génération terminée');
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Test Génération Landing Page</h1>
        <p className="text-muted-foreground">
          Configurez et testez la génération de landing pages avec debug complet
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configurateur */}
        <div className="lg:col-span-1 space-y-6">
          {/* Sélecteur de produit */}
          <Card className="p-6">
            <Label className="text-lg font-semibold mb-3 block">Produit à tester</Label>
            {loadingProducts ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Chargement des produits...</span>
              </div>
            ) : products.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun produit trouvé. Importez des produits depuis Shopify d'abord.
              </p>
            ) : (
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un produit" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      <div className="flex items-center gap-2">
                        {product.image_url && (
                          <img src={product.image_url} alt="" className="w-8 h-8 object-cover rounded" />
                        )}
                        <span className="truncate">{product.title}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </Card>
          
          <PreferencesConfigurator onConfigChange={setPreviewConfig} />
          
          <Card className="p-6">
            <Button 
              onClick={handleGenerateLanding}
              disabled={isGenerating || !previewConfig.layout || !selectedProductId}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Créer Landing Page
                </>
              )}
            </Button>
            
            {(!previewConfig.layout || !selectedProductId) && (
              <p className="text-sm text-muted-foreground mt-2 text-center">
                {!selectedProductId ? 'Sélectionnez un produit' : 'Sélectionnez toutes les options'}
              </p>
            )}
          </Card>
        </div>

        {/* Prévisualisation */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Aperçu Configuration</h2>
            <div className="aspect-[16/10] w-full">
              <LandingPagePreview
                layout={previewConfig.layout}
                designStyle={previewConfig.designStyle}
                contentLength={previewConfig.contentLength}
                colors={previewConfig.colors}
                highlights={previewConfig.highlights}
              />
            </div>
          </Card>

          {/* Panel de Debug */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Debug Console</h2>
            <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-xs space-y-1 max-h-[400px] overflow-y-auto">
              {debugLogs.length === 0 ? (
                <p className="text-gray-500">En attente de génération...</p>
              ) : (
                debugLogs.map((log, index) => (
                  <div key={index}>{log}</div>
                ))
              )}
            </div>
          </Card>

          {/* HTML Généré */}
          {generatedHTML && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">HTML Généré</h2>
              <div className="space-y-4">
                <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg max-h-[300px] overflow-y-auto">
                  <pre className="text-xs">{generatedHTML}</pre>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Preview HTML:</h3>
                  <div 
                    className="border rounded-lg overflow-hidden"
                    dangerouslySetInnerHTML={{ __html: generatedHTML }}
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Debug Panel existant */}
          <PreferencesDebugPanel
            layout={previewConfig.layout}
            designStyle={previewConfig.designStyle}
            contentLength={previewConfig.contentLength}
            colors={previewConfig.colors}
            highlights={previewConfig.highlights}
          />
        </div>
      </div>
    </div>
  );
}
