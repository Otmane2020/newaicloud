import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Eye, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface GenerateDescriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId: string;
  collectionTitle: string;
  collectionHandle: string;
  onSuccess: () => void;
}

export function GenerateDescriptionDialog({
  open,
  onOpenChange,
  collectionId,
  collectionTitle,
  collectionHandle,
  onSuccess,
}: GenerateDescriptionDialogProps) {
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatedDescription, setGeneratedDescription] = useState<string>('');

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      
      const { data, error } = await supabase.functions.invoke('generate-collection-seo', {
        body: {
          collection_ids: [collectionId],
          force: false
        }
      });

      if (error) throw error;

      if (data.results?.[0]?.body_html) {
        setGeneratedDescription(data.results[0].body_html);
        toast.success('Description générée avec succès');
      } else {
        throw new Error('Aucune description générée');
      }
    } catch (error: any) {
      console.error('Error generating description:', error);
      
      // Handle specific error messages
      if (error.message?.includes('limit')) {
        toast.error('Limite atteinte', {
          description: 'Vous avez atteint votre limite d\'optimisations'
        });
      } else {
        toast.error('Erreur lors de la génération', {
          description: error.message
        });
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('shopify_collections')
        .update({ body_html: generatedDescription })
        .eq('id', collectionId);

      if (error) throw error;

      toast.success('Description enregistrée');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving description:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-start gap-4 pb-4 border-b flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <DialogTitle className="text-xl font-bold mb-1">
              Générer une description
            </DialogTitle>
            <DialogDescription className="text-sm">
              {collectionTitle}
            </DialogDescription>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {!generatedDescription ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-center text-muted-foreground max-w-md">
                Cliquez sur le bouton ci-dessous pour générer automatiquement une description optimisée pour cette collection.
              </p>
              <Button
                onClick={handleGenerate}
                disabled={generating}
                size="lg"
                className="mt-4"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Génération en cours...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Générer la description
                  </>
                )}
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="preview" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="preview">
                  <Eye className="w-4 h-4 mr-2" />
                  Aperçu
                </TabsTrigger>
                <TabsTrigger value="html">
                  Code HTML
                </TabsTrigger>
              </TabsList>
              <TabsContent value="preview" className="flex-1 overflow-auto border rounded-lg p-4">
                <div 
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: generatedDescription }}
                />
              </TabsContent>
              <TabsContent value="html" className="flex-1 overflow-auto">
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-[400px]">
                  <code>{generatedDescription}</code>
                </pre>
              </TabsContent>
            </Tabs>
          )}
        </div>

        <div className="flex flex-col gap-2 pt-4 border-t flex-shrink-0">
          {generatedDescription && (
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full"
              size="lg"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Enregistrer la description
                </>
              )}
            </Button>
          )}
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            className="w-full"
          >
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
