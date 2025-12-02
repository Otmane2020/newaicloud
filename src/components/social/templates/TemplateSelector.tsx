import { useState } from 'react';
import { SOCIAL_TEMPLATES, SocialTemplate, getRandomTemplate, getSmartTemplate } from './socialTemplates';
import { TemplatePreview } from './TemplatePreview';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shuffle, Sparkles, Grid3X3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemplateSelectorProps {
  selectedTemplate: SocialTemplate | null;
  onSelectTemplate: (template: SocialTemplate) => void;
  productImage?: string;
  productTitle?: string;
  productPrice?: string;
  comparePrice?: string;
  logoUrl?: string;
  contentType?: 'product' | 'collection' | 'article';
  language?: 'fr' | 'en';
}

export function TemplateSelector({
  selectedTemplate,
  onSelectTemplate,
  productImage,
  productTitle,
  productPrice,
  comparePrice,
  logoUrl,
  contentType = 'product',
  language = 'fr'
}: TemplateSelectorProps) {
  const [mode, setMode] = useState<'manual' | 'random' | 'smart'>('manual');

  const handleRandomTemplate = () => {
    const template = getRandomTemplate({ category: 'post' });
    onSelectTemplate(template);
    setMode('random');
  };

  const handleSmartTemplate = () => {
    const template = getSmartTemplate({ contentType });
    onSelectTemplate(template);
    setMode('smart');
  };

  const handleManualSelect = (template: SocialTemplate) => {
    onSelectTemplate(template);
    setMode('manual');
  };

  const t = {
    fr: {
      selectTemplate: 'Choisir un template',
      randomMode: 'Aléatoire',
      smartMode: 'Smart AI',
      manualMode: 'Manuel',
      posts: 'Posts',
      carousels: 'Carrousels',
      selected: 'Sélectionné'
    },
    en: {
      selectTemplate: 'Select a template',
      randomMode: 'Random',
      smartMode: 'Smart AI',
      manualMode: 'Manual',
      posts: 'Posts',
      carousels: 'Carousels',
      selected: 'Selected'
    }
  }[language];

  const postTemplates = SOCIAL_TEMPLATES.filter(t => t.category === 'post');
  const carouselTemplates = SOCIAL_TEMPLATES.filter(t => t.category === 'carousel');

  return (
    <div className="space-y-4">
      {/* Mode Selection */}
      <div className="flex items-center gap-2">
        <Button
          variant={mode === 'manual' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('manual')}
          className="gap-1"
        >
          <Grid3X3 className="h-3 w-3" />
          {t.manualMode}
        </Button>
        <Button
          variant={mode === 'random' ? 'default' : 'outline'}
          size="sm"
          onClick={handleRandomTemplate}
          className="gap-1"
        >
          <Shuffle className="h-3 w-3" />
          {t.randomMode}
        </Button>
        <Button
          variant={mode === 'smart' ? 'default' : 'outline'}
          size="sm"
          onClick={handleSmartTemplate}
          className="gap-1"
        >
          <Sparkles className="h-3 w-3" />
          {t.smartMode}
        </Button>
      </div>

      {/* Templates Grid */}
      <div className="space-y-4">
        {/* Posts */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            {t.posts}
            <Badge variant="secondary" className="text-xs">
              {postTemplates.length}
            </Badge>
          </h4>
          <div className="grid grid-cols-3 gap-3">
            {postTemplates.map((template) => (
              <div key={template.id} className="space-y-1">
                <TemplatePreview
                  template={template}
                  productImage={productImage}
                  productTitle={productTitle}
                  productPrice={productPrice}
                  comparePrice={comparePrice}
                  logoUrl={logoUrl}
                  selected={selectedTemplate?.id === template.id}
                  onClick={() => handleManualSelect(template)}
                  size="small"
                />
                <p className="text-[10px] text-center text-muted-foreground truncate">
                  {language === 'fr' ? template.name : template.nameEn}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Carousels */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            {t.carousels}
            <Badge variant="secondary" className="text-xs">
              {carouselTemplates.length}
            </Badge>
          </h4>
          <div className="grid grid-cols-3 gap-3">
            {carouselTemplates.map((template) => (
              <div key={template.id} className="space-y-1">
                <TemplatePreview
                  template={template}
                  productImage={productImage}
                  productTitle={productTitle}
                  selected={selectedTemplate?.id === template.id}
                  onClick={() => handleManualSelect(template)}
                  size="small"
                />
                <p className="text-[10px] text-center text-muted-foreground truncate">
                  {language === 'fr' ? template.name : template.nameEn}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Template Info */}
      {selectedTemplate && (
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="default" className="text-xs">
              {t.selected}
            </Badge>
            <span className="font-medium text-sm">
              {language === 'fr' ? selectedTemplate.name : selectedTemplate.nameEn}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {language === 'fr' ? selectedTemplate.description : selectedTemplate.descriptionEn}
          </p>
        </div>
      )}
    </div>
  );
}
