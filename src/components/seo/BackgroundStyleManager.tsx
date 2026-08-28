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
import { Settings2, Plus, Trash2, Save, Image as ImageIcon, Home, Sofa } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/language';
import { getImageUiTranslations } from '@/lib/imageUiTranslations';

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

export const BackgroundStyleManager = ({
  open,
  onOpenChange,
  onStylesUpdated,
}: BackgroundStyleManagerProps) => {
  const { language } = useTranslation();
  const ui = getImageUiTranslations(language);
  const [customStyles, setCustomStyles] = useState<BackgroundStyleTemplate[]>([]);
  const [editingStyle, setEditingStyle] = useState<BackgroundStyleTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    prompt_template: '',
    category: 'lifestyle',
  });

  const defaultStyles: BackgroundStyleTemplate[] = [
    {
      id: 'home-furniture',
      name: 'Home Furniture',
      description: ui.styles.defaults.homeFurniture,
      prompt_template:
        'Professional interior design photo of the product placed in a modern, elegant living room. Warm ambient lighting, neutral beige and white tones, decorative elements like plants, candles, and textured cushions. The product name "{product_name}" displayed elegantly in the bottom right corner. High-end furniture photography style like Ferucci or West Elm catalog.',
      preview_image: '',
      is_default: true,
      category: 'lifestyle',
    },
    {
      id: 'minimalist-studio',
      name: 'Minimalist Studio',
      description: ui.styles.defaults.minimalistStudio,
      prompt_template:
        'Clean minimalist studio photography. Product on white seamless background with soft shadows. Professional studio lighting, high-key look. E-commerce ready, Google Shopping optimized.',
      preview_image: '',
      is_default: true,
      category: 'studio',
    },
    {
      id: 'cozy-living',
      name: 'Cozy Living Room',
      description: ui.styles.defaults.cozyLiving,
      prompt_template:
        'Product photographed in a cozy, inviting living room setting. Soft textiles, comfortable sofa in the background, warm lighting from windows. Natural lifestyle photography with decorative items like vases, books, and soft rugs.',
      preview_image: '',
      is_default: true,
      category: 'lifestyle',
    },
    {
      id: 'luxury-interior',
      name: 'Luxury Interior',
      description: ui.styles.defaults.luxuryInterior,
      prompt_template:
        'High-end luxury interior design setting. Product placed in an upscale environment with marble, gold accents, designer furniture. Sophisticated color palette, professional architectural photography lighting.',
      preview_image: '',
      is_default: true,
      category: 'lifestyle',
    },
    {
      id: 'scandinavian',
      name: 'Scandinavian',
      description: ui.styles.defaults.scandinavian,
      prompt_template:
        'Scandinavian interior design style. Light wood floors, white walls, natural materials. Product in a bright, airy space with plants and minimalist decor. Clean and functional aesthetic.',
      preview_image: '',
      is_default: true,
      category: 'lifestyle',
    },
  ];

  const allStyles = [...defaultStyles, ...customStyles];

  const handleCreateNew = () => {
    setIsCreating(true);
    setEditingStyle(null);
    setFormData({ name: '', description: '', prompt_template: '', category: 'lifestyle' });
  };

  const handleEditStyle = (style: BackgroundStyleTemplate) => {
    if (style.is_default) {
      toast.error(ui.styles.defaultEditError);
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
      toast.error(ui.styles.namePromptRequired);
      return;
    }

    if (isCreating) {
      setCustomStyles((previous) => [
        ...previous,
        {
          id: `custom-${Date.now()}`,
          name: formData.name,
          description: formData.description,
          prompt_template: formData.prompt_template,
          category: formData.category,
          is_default: false,
        },
      ]);
      toast.success(ui.styles.created);
    } else if (editingStyle) {
      setCustomStyles((previous) =>
        previous.map((style) => (style.id === editingStyle.id ? { ...style, ...formData } : style)),
      );
      toast.success(ui.styles.updated);
    }

    setEditingStyle(null);
    setIsCreating(false);
    onStylesUpdated?.();
  };

  const handleDeleteStyle = (style: BackgroundStyleTemplate) => {
    if (style.is_default) {
      toast.error(ui.styles.defaultDeleteError);
      return;
    }

    setCustomStyles((previous) => previous.filter((item) => item.id !== style.id));
    toast.success(ui.styles.deleted);
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
            {ui.styles.manageTitle}
          </DialogTitle>
          <DialogDescription>{ui.styles.manageDescription}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden px-6">
          {isCreating || editingStyle ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{ui.styles.styleName}</Label>
                <Input
                  value={formData.name}
                  onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                  placeholder="Ex: Home Furniture, Modern Living..."
                />
              </div>

              <div className="space-y-2">
                <Label>{ui.styles.shortDescription}</Label>
                <Input
                  value={formData.description}
                  onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                  placeholder={ui.styles.descriptionPlaceholder}
                />
              </div>

              <div className="space-y-2">
                <Label>{ui.styles.prompt}</Label>
                <Textarea
                  value={formData.prompt_template}
                  onChange={(event) => setFormData({ ...formData, prompt_template: event.target.value })}
                  placeholder={ui.styles.promptPlaceholder}
                  rows={6}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={handleCancel}>
                  {ui.common.cancel}
                </Button>
                <Button onClick={handleSaveStyle}>
                  <Save className="mr-2 h-4 w-4" />
                  {ui.common.save}
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
                              {ui.common.default}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{style.description}</p>
                      </div>
                      {!style.is_default && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={ui.common.delete}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(event) => {
                            event.stopPropagation();
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
              {ui.styles.createNew}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
