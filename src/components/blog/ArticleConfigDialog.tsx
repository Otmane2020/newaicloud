import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/language';
import { 
  Sparkles, 
  Palette, 
  Layout, 
  Type, 
  Image as ImageIcon,
  Grid3x3,
  List,
  Star
} from 'lucide-react';

export interface ArticleConfig {
  style: 'magazine' | 'moderne' | 'minimaliste' | 'editorial' | 'premium' | 'coloré';
  layout: '1-colonne' | '2-colonnes' | 'hero' | 'full-width';
  colorScheme: string;
  contentLength: '700' | '2000' | '4000';
  includeTOC: boolean;
  productDisplay: 'grid' | 'list' | 'carousel';
  typography: 'serif' | 'sans-serif';
  imageIntensity: 'high' | 'medium' | 'low';
}

interface ArticleConfigDialogProps {
  config: ArticleConfig;
  onConfigChange: (config: ArticleConfig) => void;
}

export function ArticleConfigDialog({ config, onConfigChange }: ArticleConfigDialogProps) {
  const { t } = useTranslation();
  const [customColor, setCustomColor] = useState('#000000');

  const colorPalettes = [
    { key: 'moderne', primary: '#000000', secondary: '#6B7280' },
    { key: 'bleuPro', primary: '#1E40AF', secondary: '#3B82F6' },
    { key: 'terreux', primary: '#92400E', secondary: '#B45309' },
    { key: 'luxeOr', primary: '#000000', secondary: '#D97706' },
    { key: 'vertFrais', primary: '#065F46', secondary: '#10B981' },
    { key: 'vibrant', primary: '#DC2626', secondary: '#EF4444' },
  ];

  const visualStyles = [
    { id: 'magazine' as const, icon: Star },
    { id: 'moderne' as const, icon: Sparkles },
    { id: 'minimaliste' as const, icon: Layout },
    { id: 'editorial' as const, icon: Type },
    { id: 'premium' as const, icon: Star },
    { id: 'coloré' as const, icon: Palette },
  ];

  const layouts = [
    { id: 'oneColumn' as const, value: '1-colonne' as const },
    { id: 'twoColumns' as const, value: '2-colonnes' as const },
    { id: 'hero' as const, value: 'hero' as const },
    { id: 'fullWidth' as const, value: 'full-width' as const },
  ];

  const handleStyleChange = (style: ArticleConfig['style']) => {
    onConfigChange({ ...config, style });
  };

  const handleLayoutChange = (layoutValue: ArticleConfig['layout']) => {
    onConfigChange({ ...config, layout: layoutValue });
  };

  const handleColorChange = (colorScheme: string) => {
    onConfigChange({ ...config, colorScheme });
  };

  const handleProductDisplayChange = (productDisplay: ArticleConfig['productDisplay']) => {
    onConfigChange({ ...config, productDisplay });
  };

  const handleTypographyChange = (typography: ArticleConfig['typography']) => {
    onConfigChange({ ...config, typography });
  };

  const handleTOCToggle = () => {
    onConfigChange({ ...config, includeTOC: !config.includeTOC });
  };

  const handleImageIntensityChange = (imageIntensity: ArticleConfig['imageIntensity']) => {
    onConfigChange({ ...config, imageIntensity });
  };

  return (
    <div className="space-y-6">
      {/* Style visuel */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">{t.wizards.blog.design.visualStyle.title}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visualStyles.map((style) => {
            const Icon = style.icon;
            return (
              <button
                key={style.id}
                onClick={() => handleStyleChange(style.id)}
                className={`p-4 border-2 rounded-lg text-left transition-all hover:border-primary ${
                  config.style === style.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Icon className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <p className="font-semibold mb-1">{t.wizards.blog.design.visualStyle[style.id]}</p>
                    <p className="text-sm text-muted-foreground">{t.wizards.blog.design.visualStyle.descriptions[style.id]}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Layout */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Layout className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">{t.wizards.blog.design.layout.title}</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {layouts.map((layout) => (
            <button
              key={layout.id}
              onClick={() => handleLayoutChange(layout.value)}
              className={`p-4 border-2 rounded-lg text-center transition-all ${
                config.layout === layout.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary'
              }`}
            >
                  <p className="font-medium mb-1">{t.wizards.blog.design.layout[layout.id]}</p>
                  <p className="text-xs text-muted-foreground">{t.wizards.blog.design.layout.descriptions[layout.id]}</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Couleur principale */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">{t.wizards.blog.design.colorPalette.title}</h3>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
          {colorPalettes.map((palette) => (
            <button
              key={palette.key}
              onClick={() => handleColorChange(palette.primary)}
              className={`p-3 border-2 rounded-lg text-center transition-all ${
                config.colorScheme === palette.primary
                  ? 'border-primary'
                  : 'border-border hover:border-primary'
              }`}
            >
              <div className="flex gap-1 mb-2">
                <div
                  className="h-8 w-full rounded"
                  style={{ backgroundColor: palette.primary }}
                />
                <div
                  className="h-8 w-full rounded"
                  style={{ backgroundColor: palette.secondary }}
                />
              </div>
              <p className="text-xs font-medium">{t.wizards.blog.design.colorPalette.palettes[palette.key as keyof typeof t.wizards.blog.design.colorPalette.palettes]}</p>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Label htmlFor="customColor">{t.wizards.blog.design.colorPalette.custom}</Label>
          <input
            id="customColor"
            type="color"
            value={customColor}
            onChange={(e) => {
              setCustomColor(e.target.value);
              handleColorChange(e.target.value);
            }}
            className="h-10 w-20 rounded border cursor-pointer"
          />
          {config.colorScheme === customColor && (
            <Badge variant="secondary">{t.wizards.blog.design.colorPalette.selected}</Badge>
          )}
        </div>
      </Card>

      {/* Options avancées */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">{t.wizards.blog.design.advanced.title}</h3>
        </div>
        
        <div className="space-y-4">
          {/* Typographie */}
          <div>
            <Label className="mb-2 block">{t.wizards.blog.design.typography.title}</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleTypographyChange('sans-serif')}
                className={`p-3 border-2 rounded-lg transition-all ${
                  config.typography === 'sans-serif'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary'
                }`}
              >
                <p className="font-sans font-semibold">Sans-Serif</p>
                <p className="text-xs text-muted-foreground font-sans">Inter, Helvetica</p>
              </button>
              <button
                onClick={() => handleTypographyChange('serif')}
                className={`p-3 border-2 rounded-lg transition-all ${
                  config.typography === 'serif'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary'
                }`}
              >
                <p className="font-serif font-semibold">Serif</p>
                <p className="text-xs text-muted-foreground font-serif">Georgia, Times</p>
              </button>
            </div>
          </div>

          {/* Affichage produits */}
          <div>
            <Label className="mb-2 block">{t.wizards.blog.design.productDisplay.title}</Label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => handleProductDisplayChange('grid')}
                className={`p-3 border-2 rounded-lg transition-all ${
                  config.productDisplay === 'grid'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary'
                }`}
              >
                <Grid3x3 className="h-5 w-5 mx-auto mb-1" />
                <p className="text-sm font-medium">{t.wizards.blog.design.productDisplay.grid}</p>
              </button>
              <button
                onClick={() => handleProductDisplayChange('list')}
                className={`p-3 border-2 rounded-lg transition-all ${
                  config.productDisplay === 'list'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary'
                }`}
              >
                <List className="h-5 w-5 mx-auto mb-1" />
                <p className="text-sm font-medium">{t.wizards.blog.design.productDisplay.list}</p>
              </button>
              <button
                onClick={() => handleProductDisplayChange('carousel')}
                className={`p-3 border-2 rounded-lg transition-all ${
                  config.productDisplay === 'carousel'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary'
                }`}
              >
                <ImageIcon className="h-5 w-5 mx-auto mb-1" />
                <p className="text-sm font-medium">{t.wizards.blog.design.productDisplay.carousel}</p>
              </button>
            </div>
          </div>

          {/* Intensité images */}
          <div>
            <Label className="mb-2 block">{t.wizards.blog.design.imageIntensity.title}</Label>
            <RadioGroup 
              value={config.imageIntensity} 
              onValueChange={(value) => handleImageIntensityChange(value as ArticleConfig['imageIntensity'])}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="high" id="high" />
                <Label htmlFor="high">{t.wizards.blog.design.imageIntensity.high}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="medium" />
                <Label htmlFor="medium">{t.wizards.blog.design.imageIntensity.medium}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="low" id="low" />
                <Label htmlFor="low">{t.wizards.blog.design.imageIntensity.low}</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Table des matières */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label>{t.wizards.blog.design.toc.title}</Label>
              <p className="text-sm text-muted-foreground">{t.wizards.blog.design.toc.description}</p>
            </div>
            <Button
              variant={config.includeTOC ? 'default' : 'outline'}
              onClick={handleTOCToggle}
            >
              {config.includeTOC ? t.wizards.blog.design.toc.enabled : t.wizards.blog.design.toc.disabled}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
