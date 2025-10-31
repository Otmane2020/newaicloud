import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, Upload, Loader2, ImageIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

interface ArticleFeaturedImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article: {
    id: string;
    title: string;
    content: string;
    featured_image?: string | null;
  };
  onImageUpdated: () => void;
}

export function ArticleFeaturedImageDialog({ 
  open, 
  onOpenChange, 
  article,
  onImageUpdated 
}: ArticleFeaturedImageDialogProps) {
  const [loading, setLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<'ai' | 'upload' | null>(null);
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');

  const handleGenerateWithAI = async () => {
    try {
      setLoading(true);
      
      // Use article title and content to create a relevant prompt
      const defaultPrompt = `Create a featured image for a blog article titled "${article.title}". 
Style: professional, modern, blog-appropriate, high-quality.
Context: ${article.content.substring(0, 200)}...`;
      
      const prompt = aiPrompt || defaultPrompt;
      
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { 
          prompt,
          article_id: article.id,
          type: 'article_featured'
        }
      });

      if (error) throw error;

      if (data?.image_url) {
        await updateArticleImage(data.image_url);
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

      await updateArticleImage(customImageUrl);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erreur lors de la mise à jour de l\'image');
    } finally {
      setLoading(false);
    }
  };

  const updateArticleImage = async (imageUrl: string) => {
    const { error } = await supabase
      .from('blog_articles')
      .update({ 
        featured_image: imageUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', article.id);

    if (error) throw error;

    toast.success('Image mise à jour avec succès');
    onImageUpdated();
    handleClose();
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedOption(null);
    setCustomImageUrl('');
    setAiPrompt('');
  };

  // Suggested prompts based on article title
  const suggestedPrompts = [
    `Modern illustration for "${article.title.substring(0, 30)}..."`,
    `Professional photo representing the theme of ${article.title.substring(0, 30)}`,
    `Abstract visual for blog article about ${article.title.substring(0, 30)}`
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Ajouter une Featured Image
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Article: <span className="font-medium">{article.title}</span>
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Why use AI section */}
          <Card className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-200">
            <div className="flex items-start gap-3">
              <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white shrink-0">
                <Sparkles className="w-3 h-3 mr-1" />
                Vision AI - Analyse d'images
              </Badge>
            </div>
            <div className="mt-3 text-sm space-y-1">
              <p className="font-medium">🎨 <strong>Images cohérentes</strong> avec votre marque</p>
              <p className="font-medium">⚡ <strong>Génération instantanée</strong> - pas besoin de designer</p>
              <p className="font-medium">🔍 <strong>Optimisées pour le SEO</strong> automatiquement</p>
            </div>
          </Card>

          {/* Option 1: Generate with AI */}
          <Card 
            className={`p-4 cursor-pointer transition-all hover:border-primary hover:shadow-md ${
              selectedOption === 'ai' ? 'border-primary ring-2 ring-primary/20 shadow-lg' : ''
            }`}
            onClick={() => setSelectedOption('ai')}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1 flex items-center gap-2">
                  Générer avec Vision AI
                  <Badge variant="secondary" className="text-xs">Recommandé</Badge>
                </h3>
                <p className="text-sm text-muted-foreground">
                  Créez une image professionnelle personnalisée basée sur le contenu de votre article. 
                  L'IA analyse votre texte pour générer une image pertinente.
                </p>
              </div>
            </div>
            
            {selectedOption === 'ai' && (
              <div className="mt-4 space-y-4">
                {/* Suggested prompts */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Suggestions de prompts:</Label>
                  <div className="flex flex-wrap gap-2">
                    {suggestedPrompts.map((prompt, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => setAiPrompt(prompt)}
                      >
                        {prompt.substring(0, 40)}...
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="ai-prompt">Prompt personnalisé (optionnel)</Label>
                  <Textarea
                    id="ai-prompt"
                    placeholder="Ex: Image moderne avec fond clair, style minimaliste..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Laissez vide pour utiliser le titre et contenu de l'article comme base
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline"
                    onClick={handleClose}
                  >
                    Annuler
                  </Button>
                  <Button 
                    onClick={handleGenerateWithAI}
                    disabled={loading}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Génération...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Générer l'image
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Option 2: Upload Custom */}
          <Card 
            className={`p-4 cursor-pointer transition-all hover:border-primary hover:shadow-md ${
              selectedOption === 'upload' ? 'border-primary ring-2 ring-primary/20 shadow-lg' : ''
            }`}
            onClick={() => setSelectedOption('upload')}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Upload className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Utiliser une image personnalisée</h3>
                <p className="text-sm text-muted-foreground">
                  Ajoutez une image depuis une URL externe
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
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline"
                    onClick={handleClose}
                  >
                    Annuler
                  </Button>
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
