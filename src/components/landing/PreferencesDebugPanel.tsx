import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Code, Palette, Layout, FileText, Star } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface PreferencesDebugPanelProps {
  layout: string;
  designStyle: string;
  contentLength: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
  };
  highlights: string[];
}

export function PreferencesDebugPanel({
  layout,
  designStyle,
  contentLength,
  colors,
  highlights
}: PreferencesDebugPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  const configSummary = {
    totalSettings: 4 + Object.keys(colors).length + highlights.length,
    isComplete: !!(layout && designStyle && contentLength && colors.primary),
    missingFields: [
      !layout && 'Layout',
      !designStyle && 'Style de design',
      !contentLength && 'Longueur du contenu',
      !colors.primary && 'Palette de couleurs'
    ].filter(Boolean)
  };

  return (
    <Card className="p-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-2">
            <div className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              <span className="font-semibold">Panneau de Débogage</span>
              <Badge variant={configSummary.isComplete ? "default" : "secondary"}>
                {configSummary.totalSettings} paramètres
              </Badge>
            </div>
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-4 mt-4">
          {/* Status Overview */}
          <div className="rounded-lg bg-muted p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Status Configuration:</span>
              <Badge variant={configSummary.isComplete ? "default" : "destructive"}>
                {configSummary.isComplete ? '✓ Complet' : '⚠ Incomplet'}
              </Badge>
            </div>
            {!configSummary.isComplete && configSummary.missingFields.length > 0 && (
              <div className="text-xs text-muted-foreground">
                Champs manquants: {configSummary.missingFields.join(', ')}
              </div>
            )}
          </div>

          <Separator />

          {/* Layout Settings */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Layout className="h-4 w-4 text-primary" />
              <span>Layout</span>
            </div>
            <div className="ml-6 space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Type:</span>
                <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono">
                  {layout || 'non défini'}
                </code>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Style:</span>
                <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono">
                  {designStyle || 'non défini'}
                </code>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Contenu:</span>
                <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono">
                  {contentLength || 'non défini'}
                </code>
              </div>
            </div>
          </div>

          <Separator />

          {/* Color Palette */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Palette className="h-4 w-4 text-primary" />
              <span>Palette de Couleurs</span>
            </div>
            <div className="ml-6 space-y-2">
              {Object.entries(colors).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground capitalize">{key}:</span>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-5 h-5 rounded border border-border" 
                      style={{ backgroundColor: value }}
                    />
                    <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono">
                      {value}
                    </code>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Highlights */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Star className="h-4 w-4 text-primary" />
              <span>Points Forts</span>
              <Badge variant="outline">{highlights.length}</Badge>
            </div>
            <div className="ml-6 space-y-1">
              {highlights.length > 0 ? (
                highlights.map(h => (
                  <div key={h} className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">•</span>
                    <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono">
                      {h}
                    </code>
                  </div>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">Aucun point fort sélectionné</span>
              )}
            </div>
          </div>

          <Separator />

          {/* JSON Export */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4 text-primary" />
              <span>Configuration JSON</span>
            </div>
            <div className="ml-6">
              <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                {JSON.stringify(
                  {
                    layout,
                    designStyle,
                    contentLength,
                    colors,
                    highlights
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
