import { useState } from 'react';
import { PreferencesConfigurator } from '@/components/landing/PreferencesConfigurator';
import { LandingPagePreview } from '@/components/landing/LandingPagePreview';
import { PreferencesDebugPanel } from '@/components/landing/PreferencesDebugPanel';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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

    try {
      // 1. Sauvegarder la préférence en base de données
      addDebugLog('📝 Sauvegarde de la préférence en base de données...');
      
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
          color_text_muted: previewConfig.colors.textMuted,
          custom_highlights: previewConfig.highlights.length > 0 ? previewConfig.highlights : null,
          is_default: false
        })
        .select()
        .single();

      if (prefError) {
        addDebugLog(`❌ Erreur sauvegarde préférence: ${prefError.message}`);
        throw prefError;
      }

      addDebugLog(`✅ Préférence sauvegardée (ID: ${preference.id})`);

      // 2. Appeler la fonction generate-landing-ai
      addDebugLog('🎨 Appel de generate-landing-ai...');
      
      const { data: functionData, error: functionError } = await supabase.functions.invoke('generate-landing-ai', {
        body: {
          productId: 'test-product-' + Date.now(),
          productData: {
            title: 'Produit Test Landing Page',
            description: 'Description test pour la génération de landing page',
            price: '99.99',
            images: [
              { src: 'https://placehold.co/600x400', alt: 'Image test' }
            ],
            vendor: 'Test Vendor',
            productType: 'Test Type',
            tags: ['test', 'landing', 'page']
          },
          preferenceId: preference.id,
          layout: previewConfig.layout,
          designStyle: previewConfig.designStyle,
          contentLength: previewConfig.contentLength,
          colors: previewConfig.colors,
          highlights: previewConfig.highlights,
          debug: true
        }
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
        <div className="lg:col-span-1">
          <PreferencesConfigurator onConfigChange={setPreviewConfig} />
          
          <Card className="p-6 mt-6">
            <Button 
              onClick={handleGenerateLanding}
              disabled={isGenerating || !previewConfig.layout}
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
            
            {!previewConfig.layout && (
              <p className="text-sm text-muted-foreground mt-2 text-center">
                Sélectionnez toutes les options pour activer la génération
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
