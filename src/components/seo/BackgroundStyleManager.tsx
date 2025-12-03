import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Settings2,
  Plus,
  Trash2,
  Save,
  Image as ImageIcon,
  Home,
  Sofa,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/language';

interface BackgroundStyleTemplate {
  id: string;
  name: string;
  description: string;
  prompt_template: string;
  preview_image?: string;
  is_default: boolean;
  category: string;
}

interface BackgroundStyleManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStylesUpdated?: () => void;
}

const DEFAULT_STYLES: BackgroundStyleTemplate[] = [
  {
    id: 'home-furniture',
    name: 'Home Furniture',
    description: 'Produit dans un salon moderne et élégant avec décoration',
    prompt_template: 'Professional interior design photo of the product placed in a modern, elegant living room. Warm ambient lighting, neutral beige and white tones, decorative elements like plants, candles, and textured cushions. The product name "{product_name}" displayed elegantly in the bottom right corner. High-end furniture photography style like Ferucci or West Elm catalog.',
    preview_image: '',
    is_default: true,
    category: 'lifestyle',
  },
  {
    id: 'minimalist-studio',
    name: 'Minimalist Studio',
    description: 'Fond blanc épuré avec éclairage studio professionnel',
    prompt_template: 'Clean minimalist studio photography. Product on white seamless background with soft shadows. Professional studio lighting, high-key look. E-commerce ready, Google Shopping optimized.',
    preview_image: '',
    is_default: true,
    category: 'studio',
  },
  {
    id: 'cozy-living',
    name: 'Cozy Living Room',
    description: 'Ambiance salon cosy avec canapé et décoration chaleureuse',
    prompt_template: 'Product photographed in a cozy, inviting living room setting. Soft textiles, comfortable sofa in the background, warm lighting from windows. Natural lifestyle photography with decorative items like vases, books, and soft rugs.',
    preview_image: '',
    is_default: true,
    category: 'lifestyle',
  },
  {
    id: 'luxury-interior',
    name: 'Luxury Interior',
    description: 'Intérieur luxueux avec finitions haut de gamme',
    prompt_template: 'High-end luxury interior design setting. Product placed in an upscale environment with marble, gold accents, designer furniture. Sophisticated color palette, professional architectural photography lighting.',
    preview_image: '',
    is_default: true,
    category: 'lifestyle',
  },
  {
    id: 'scandinavian',
    name: 'Scandinavian',
    description: 'Style scandinave épuré avec bois clair et tons neutres',
    prompt_template: 'Scandinavian interior design style. Light wood floors, white walls, natural materials. Product in a bright, airy space with plants and minimalist decor. Clean and functional aesthetic.',
    preview_image: '',
    is_default: true,
    category: 'lifestyle',
  },
];

export const BackgroundStyleManager = ({
  open,
  onOpenChange,
  onStylesUpdated,
}: BackgroundStyleManagerProps) => {
  const { language } = useTranslation();
  const [styles, setStyles] = useState<BackgroundStyleTemplate[]>(DEFAULT_STYLES);
  const [customStyles, setCustomStyles] = useState<BackgroundStyleTemplate[]>([]);
  const [editingStyle, setEditingStyle] = useState<BackgroundStyleTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    prompt_template: '',
    category: 'lifestyle',
  });

  const allStyles = [...styles, ...customStyles];

  const handleCreateNew = () => {
    setIsCreating(true);
    setEditingStyle(null);
    setFormData({
      name: '',
      description: '',
      prompt_template: '',
      category: 'lifestyle',
    });
  };

  const handleEditStyle = (style: BackgroundStyleTemplate) => {
    if (style.is_default) {
      toast.error(language === 'fr' ? 'Les styles par défaut ne peuvent pas être modifiés' : 'Default styles cannot be edited');
      return;
    }
    setIsCreating(false);
    setEditingStyle(style);
    setFormData({
      name: style.name,
      description: style.description,
      prompt_template: style.prompt_template,
      category: style.category,
    });
  };

  const handleSaveStyle = () => {
    if (!formData.name || !formData.prompt_template) {
      toast.error(language === 'fr' ? 'Nom et prompt requis' : 'Name and prompt required');
      return;
    }

    if (isCreating) {
      const newStyle: BackgroundStyleTemplate = {
        id: `custom-${Date.now()}`,
        name: formData.name,
        description: formData.description,
        prompt_template: formData.prompt_template,
        category: formData.category,
        is_default: false,
      };
      setCustomStyles([...customStyles, newStyle]);
      toast.success(language === 'fr' ? 'Style créé' : 'Style created');
    } else if (editingStyle) {
      setCustomStyles(customStyles.map(s => 
        s.id === editingStyle.id 
          ? { ...s, ...formData } 
          : s
      ));
      toast.success(language === 'fr' ? 'Style mis à jour' : 'Style updated');
    }

    setEditingStyle(null);
    setIsCreating(false);
    onStylesUpdated?.();
  };

  const handleDeleteStyle = (style: BackgroundStyleTemplate) => {
    if (style.is_default) {
      toast.error(language === 'fr' ? 'Impossible de supprimer un style par défaut' : 'Cannot delete default style');
      return;
    }
    setCustomStyles(customStyles.filter(s => s.id !== style.id));
    toast.success(language === 'fr' ? 'Style supprimé' : 'Style deleted');
    onStylesUpdated?.();
  };

  const handleCancel = () => {
    setEditingStyle(null);
    setIsCreating(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            {language === 'fr' ? 'Gérer les styles de fond' : 'Manage Background Styles'}
          </DialogTitle>
          <DialogDescription>
            {language === 'fr' 
              ? 'Créez et personnalisez vos propres styles de photos lifestyle pour vos produits'
              : 'Create and customize your own lifestyle photo styles for your products'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden px-6">
          {isCreating || editingStyle ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{language === 'fr' ? 'Nom du style' : 'Style name'}</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Home Furniture, Modern Living..."
                />
              </div>

              <div className="space-y-2">
                <Label>{language === 'fr' ? 'Description courte' : 'Short description'}</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={language === 'fr' ? 'Description visible dans le sélecteur...' : 'Description visible in selector...'}
                />
              </div>

              <div className="space-y-2">
                <Label>{language === 'fr' ? 'Prompt de génération AI' : 'AI generation prompt'}</Label>
                <Textarea
                  value={formData.prompt_template}
                  onChange={(e) => setFormData({ ...formData, prompt_template: e.target.value })}
                  placeholder={language === 'fr' 
                    ? 'Décrivez le style de photo souhaité. Utilisez {product_name} pour insérer le nom du produit...'
                    : 'Describe the desired photo style. Use {product_name} to insert the product name...'}
                  rows={6}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={handleCancel}>
                  {language === 'fr' ? 'Annuler' : 'Cancel'}
                </Button>
                <Button onClick={handleSaveStyle}>
                  <Save className="mr-2 h-4 w-4" />
                  {language === 'fr' ? 'Enregistrer' : 'Save'}
                </Button>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-full pr-4">
              <div className="space-y-3 pb-4">
                {allStyles.map((style) => (
                  <Card
                    key={style.id}
                    className="p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => handleEditStyle(style)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {style.category === 'lifestyle' ? (
                          <Sofa className="h-6 w-6 text-primary" />
                        ) : style.category === 'studio' ? (
                          <ImageIcon className="h-6 w-6 text-primary" />
                        ) : (
                          <Home className="h-6 w-6 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{style.name}</h4>
                          {style.is_default && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded-full text-muted-foreground">
                              {language === 'fr' ? 'Défaut' : 'Default'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {style.description}
                        </p>
                      </div>
                      {!style.is_default && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteStyle(style);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          {!isCreating && !editingStyle && (
            <Button onClick={handleCreateNew} className="gap-2">
              <Plus className="h-4 w-4" />
              {language === 'fr' ? 'Créer un nouveau style' : 'Create new style'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
