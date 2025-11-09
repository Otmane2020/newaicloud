import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check, Settings2 } from "lucide-react";
import { LandingConfig } from "./LandingConfigDialog";
import { useTranslation } from "@/lib/language";

interface Template {
  id: string;
  name: string;
  description: string;
  preview: string;
  category: string;
  config: LandingConfig;
}

interface LandingTemplateGalleryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (config: LandingConfig) => void;
  onCustomize: () => void;
  productTitle?: string;
}

const TEMPLATES: Template[] = [
  {
    id: 'modern-minimal',
    name: 'Modern Minimal',
    description: 'Clean and elegant design with minimalist aesthetics',
    preview: '✨',
    category: 'Modern',
    config: {
      style: 'minimaliste',
      layout: '1 colonne',
      colorScheme: '#000000',
      contentLength: 'courte (400 mots)',
      vendorSource: 'extract',
      customHighlights: '',
    }
  },
  {
    id: 'professional-blue',
    name: 'Professional Blue',
    description: 'Corporate style with professional blue tones',
    preview: '💼',
    category: 'Professional',
    config: {
      style: 'moderne',
      layout: '2 colonnes',
      colorScheme: '#0066CC',
      contentLength: 'moyenne (800 mots)',
      vendorSource: 'shopify',
      customHighlights: '',
    }
  },
  {
    id: 'luxury-gold',
    name: 'Luxury Gold',
    description: 'Premium design with elegant gold accents',
    preview: '👑',
    category: 'Luxury',
    config: {
      style: 'premium',
      layout: 'hero à gauche',
      colorScheme: '#DAA520',
      contentLength: 'longue (1500 mots)',
      vendorSource: 'generate',
      customHighlights: 'Premium quality materials\nExclusive design\nHandcrafted with care',
    }
  },
  {
    id: 'scandinavian-fresh',
    name: 'Scandinavian Fresh',
    description: 'Nordic-inspired design with natural green tones',
    preview: '🌲',
    category: 'Natural',
    config: {
      style: 'scandinave',
      layout: '2 colonnes',
      colorScheme: '#388E3C',
      contentLength: 'moyenne (800 mots)',
      vendorSource: 'extract',
      customHighlights: 'Eco-friendly materials\nSustainable production\nMinimal environmental impact',
    }
  },
  {
    id: 'vibrant-colorful',
    name: 'Vibrant & Bold',
    description: 'Eye-catching design with energetic colors',
    preview: '🎨',
    category: 'Creative',
    config: {
      style: 'coloré',
      layout: 'hero à droite',
      colorScheme: '#F44336',
      contentLength: 'courte (400 mots)',
      vendorSource: 'extract',
      customHighlights: '',
    }
  },
  {
    id: 'earthy-natural',
    name: 'Earthy Natural',
    description: 'Warm and welcoming with natural brown tones',
    preview: '🌾',
    category: 'Natural',
    config: {
      style: 'neutre',
      layout: '2 colonnes',
      colorScheme: '#795548',
      contentLength: 'moyenne (800 mots)',
      vendorSource: 'shopify',
      customHighlights: 'Natural materials\nArtisan crafted\nTimeless design',
    }
  },
  {
    id: 'tech-modern',
    name: 'Tech Modern',
    description: 'Sleek and futuristic for tech products',
    preview: '⚡',
    category: 'Tech',
    config: {
      style: 'moderne',
      layout: 'hero à gauche',
      colorScheme: '#3399FF',
      contentLength: 'longue (1500 mots)',
      vendorSource: 'generate',
      customHighlights: 'Latest technology\nHigh performance\nInnovative features',
    }
  },
  {
    id: 'elegant-neutral',
    name: 'Elegant Neutral',
    description: 'Sophisticated and versatile neutral palette',
    preview: '⬜',
    category: 'Timeless',
    config: {
      style: 'neutre',
      layout: '1 colonne',
      colorScheme: '#666666',
      contentLength: 'courte (400 mots)',
      vendorSource: 'extract',
      customHighlights: '',
    }
  }
];

export function LandingTemplateGallery({
  open,
  onOpenChange,
  onSelectTemplate,
  onCustomize,
  productTitle,
}: LandingTemplateGalleryProps) {
  const { t } = useTranslation();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template.id);
    onSelectTemplate(template.config);
    onOpenChange(false);
  };

  const categories = Array.from(new Set(TEMPLATES.map(t => t.category)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[95vw] md:max-w-[900px] lg:max-w-[1100px] max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl">Landing Page Templates</DialogTitle>
                <DialogDescription className="text-sm mt-1">
                  {productTitle 
                    ? `Choose a template for: ${productTitle.substring(0, 40)}...` 
                    : "Choose a pre-made template or customize your own"}
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onCustomize();
                onOpenChange(false);
              }}
              className="gap-2"
            >
              <Settings2 className="w-4 h-4" />
              Custom Config
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1 pb-4">
          {/* Category filters */}
          <div className="flex flex-wrap gap-2 sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10">
            {categories.map((category) => (
              <Badge
                key={category}
                variant="secondary"
                className="cursor-pointer hover:bg-primary/20 transition-colors"
              >
                {category}
              </Badge>
            ))}
          </div>

          {/* Template grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {TEMPLATES.map((template, index) => (
              <Card
                key={template.id}
                className={`group relative cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] overflow-hidden ${
                  selectedTemplate === template.id
                    ? 'ring-2 ring-primary shadow-2xl scale-[1.02]'
                    : ''
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => handleSelectTemplate(template)}
                onMouseEnter={() => setHoveredTemplate(template.id)}
                onMouseLeave={() => setHoveredTemplate(null)}
              >
                {/* Preview icon */}
                <div 
                  className="h-32 flex items-center justify-center text-6xl transition-transform duration-300 group-hover:scale-110"
                  style={{
                    background: `linear-gradient(135deg, ${template.config.colorScheme}20, ${template.config.colorScheme}10)`
                  }}
                >
                  {template.preview}
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-sm">{template.name}</h3>
                    {selectedTemplate === template.id && (
                      <Check className="w-5 h-5 text-primary shrink-0 animate-scale-in" />
                    )}
                  </div>
                  
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                    {template.description}
                  </p>

                  {/* Template details */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {template.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {template.config.contentLength}
                      </span>
                    </div>

                    {/* Color preview */}
                    <div className="flex gap-1">
                      <div
                        className="w-6 h-6 rounded border shadow-sm"
                        style={{ backgroundColor: template.config.colorScheme }}
                        title={template.config.colorScheme}
                      />
                      <div className="flex-1 flex items-center">
                        <span className="text-xs text-muted-foreground capitalize">
                          {template.config.layout}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hover overlay */}
                {hoveredTemplate === template.id && (
                  <div className="absolute inset-0 bg-primary/5 flex items-center justify-center pointer-events-none">
                    <div className="text-center p-4">
                      <Sparkles className="w-8 h-8 text-primary mx-auto mb-2 animate-pulse" />
                      <p className="text-sm font-semibold text-primary">Click to use</p>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* Info banner */}
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 p-4 border-primary/20">
            <div className="flex gap-3">
              <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm mb-1">AI-Powered Customization</h4>
                <p className="text-xs text-muted-foreground">
                  All templates are fully customizable and will be enhanced with AI-generated content 
                  tailored to your product. Vision AI will analyze your product image to create 
                  compelling descriptions.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
