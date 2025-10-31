import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ImageIcon, Upload, Sparkles, TrendingUp, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface CollectionImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection: {
    id: string;
    title: string;
    handle: string;
    image_url: string | null;
  };
  onImageUpdated: () => void;
}

export function CollectionImageDialog({ 
  open, 
  onOpenChange, 
  collection,
  onImageUpdated 
}: CollectionImageDialogProps) {
  const [loading, setLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<'popular' | 'ai' | 'upload' | null>(null);
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');

  const handleUsePopularProduct = async () => {
    try {
      setLoading(true);
      
      // Get most popular product from this collection
      const { data: products, error } = await supabase
        .from('shopify_products')
        .select('image_url, inventory_quantity')
        .contains('collection_ids', [collection.id])
        .order('inventory_quantity', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (!products || products.length === 0) {
        toast.error('Aucun produit trouvé dans cette collection');
        return;
      }

      const imageUrl = products[0].image_url;
      
      if (!imageUrl) {
        toast.error('Le produit populaire n\'a pas d\'image');
        return;
      }

      await updateCollectionImage(imageUrl);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erreur lors de la récupération de l\'image');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateWithAI = async () => {
    try {
      setLoading(true);
      
      const prompt = aiPrompt || `Generate a professional collection banner image for "${collection.title}". Make it elegant, modern, and e-commerce focused.`;
      
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { 
          prompt,
          collection_id: collection.id 
        }
      });

      if (error) throw error;

      if (data?.image_url) {
        await updateCollectionImage(data.image_url);
      } else {
        toast.error('Erreur lors de la génération de l\'image');
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Erreur lors de la génération de l\'image');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadCustomImage = async () => {
    try {
      setLoading(true);

      if (!customImageUrl || !customImageUrl.startsWith('http')) {
        toast.error('URL d\'image invalide');
        return;
      }

      await updateCollectionImage(customImageUrl);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erreur lors de la mise à jour de l\'image');
    } finally {
      setLoading(false);
    }
  };

  const updateCollectionImage = async (imageUrl: string) => {
    const { error } = await supabase
      .from('shopify_collections')
      .update({ 
        image_url: imageUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', collection.id);

    if (error) throw error;

    toast.success('Image mise à jour avec succès');
    onImageUpdated();
    onOpenChange(false);
    setSelectedOption(null);
    setCustomImageUrl('');
    setAiPrompt('');
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedOption(null);
    setCustomImageUrl('');
    setAiPrompt('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ajouter une image à "{collection.title}"</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Option 1: Popular Product */}
          <Card 
            className={`p-4 cursor-pointer transition-all hover:border-primary ${
              selectedOption === 'popular' ? 'border-primary ring-2 ring-primary/20' : ''
            }`}
            onClick={() => setSelectedOption('popular')}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Utiliser l'image du produit le plus populaire</h3>
                <p className="text-sm text-muted-foreground">
                  Sélectionne automatiquement l'image du produit avec le plus de stock dans cette collection
                </p>
              </div>
            </div>
            
            {selectedOption === 'popular' && (
              <div className="mt-4 flex justify-end">
                <Button 
                  onClick={handleUsePopularProduct}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Chargement...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Appliquer
                    </>
                  )}
                </Button>
              </div>
            )}
          </Card>

          {/* Option 2: Generate with AI */}
          <Card 
            className={`p-4 cursor-pointer transition-all hover:border-primary ${
              selectedOption === 'ai' ? 'border-primary ring-2 ring-primary/20' : ''
            }`}
            onClick={() => setSelectedOption('ai')}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Générer avec IA</h3>
                <p className="text-sm text-muted-foreground">
                  Crée une image professionnelle personnalisée pour cette collection
                </p>
              </div>
            </div>
            
            {selectedOption === 'ai' && (
              <div className="mt-4 space-y-3">
                <div>
                  <Label htmlFor="ai-prompt">Prompt personnalisé (optionnel)</Label>
                  <Input
                    id="ai-prompt"
                    placeholder="Ex: Image moderne avec fond clair..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                  />
                </div>
                <div className="flex justify-end">
                  <Button 
                    onClick={handleGenerateWithAI}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Génération...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Générer
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Option 3: Upload Custom */}
          <Card 
            className={`p-4 cursor-pointer transition-all hover:border-primary ${
              selectedOption === 'upload' ? 'border-primary ring-2 ring-primary/20' : ''
            }`}
            onClick={() => setSelectedOption('upload')}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Upload className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Télécharger une image personnalisée</h3>
                <p className="text-sm text-muted-foreground">
                  Ajoute une image depuis une URL
                </p>
              </div>
            </div>
            
            {selectedOption === 'upload' && (
              <div className="mt-4 space-y-3">
                <div>
                  <Label htmlFor="image-url">URL de l'image</Label>
                  <Input
                    id="image-url"
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={customImageUrl}
                    onChange={(e) => setCustomImageUrl(e.target.value)}
                  />
                </div>
                <div className="flex justify-end">
                  <Button 
                    onClick={handleUploadCustomImage}
                    disabled={loading || !customImageUrl}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Chargement...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Appliquer
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
