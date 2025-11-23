import { useState } from 'react';
import { PreferencesConfigurator } from '@/components/landing/PreferencesConfigurator';
import { PreferencesList } from '@/components/landing/PreferencesList';
import { LandingPagePreview } from '@/components/landing/LandingPagePreview';
import { PreferencesDebugPanel } from '@/components/landing/PreferencesDebugPanel';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Eye, List } from 'lucide-react';

export default function LandingPreferences() {
  const [previewConfig, setPreviewConfig] = useState({
    layout: 'hero_split',
    designStyle: 'modern',
    contentLength: 'medium',
    colors: {
      primary: 'hsl(210, 100%, 50%)',
      secondary: 'hsl(200, 95%, 45%)',
      accent: 'hsl(45, 100%, 55%)',
      background: 'hsl(0, 0%, 100%)',
      surface: 'hsl(0, 0%, 98%)',
      text: 'hsl(0, 0%, 10%)',
      textMuted: 'hsl(0, 0%, 45%)'
    },
    highlights: [] as string[]
  });

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Préférences Landing Pages</h1>
        <p className="text-muted-foreground">
          Configurez vos préférences par défaut pour la génération de landing pages produit
        </p>
      </div>

      <Tabs defaultValue="configurator" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="configurator" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Simulation
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Mes Préférences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="configurator" className="space-y-6">
          <PreferencesConfigurator onConfigChange={setPreviewConfig} />
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Aperçu en Temps Réel</h2>
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
            </div>
            
            <div className="lg:col-span-1">
              <PreferencesDebugPanel
                layout={previewConfig.layout}
                designStyle={previewConfig.designStyle}
                contentLength={previewConfig.contentLength}
                colors={previewConfig.colors}
                highlights={previewConfig.highlights}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="list">
          <PreferencesList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
