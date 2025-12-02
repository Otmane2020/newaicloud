import { useState } from 'react';
import { Check, Sparkles, Home, Square, Zap, Gift, Newspaper, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  CREATIVE_STYLES, 
  getCategories, 
  getSizes, 
  type CreativeStyle 
} from '../templates/creativeStyles';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CreativeStyleGridProps {
  selectedStyle: CreativeStyle | null;
  onSelectStyle: (style: CreativeStyle) => void;
}

const categoryIcons: Record<string, React.ReactNode> = {
  luxury: <Sparkles className="h-3.5 w-3.5" />,
  lifestyle: <Home className="h-3.5 w-3.5" />,
  minimal: <Square className="h-3.5 w-3.5" />,
  neon: <Zap className="h-3.5 w-3.5" />,
  seasonal: <Gift className="h-3.5 w-3.5" />,
  editorial: <Newspaper className="h-3.5 w-3.5" />,
  dynamic: <Flame className="h-3.5 w-3.5" />
};

export function CreativeStyleGrid({ selectedStyle, onSelectStyle }: CreativeStyleGridProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeSize, setActiveSize] = useState<string>('all');

  const categories = getCategories();
  const sizes = getSizes();

  // Filter styles
  const filteredStyles = CREATIVE_STYLES.filter(style => {
    const categoryMatch = activeCategory === 'all' || style.category === activeCategory;
    const sizeMatch = activeSize === 'all' || style.size === activeSize;
    return categoryMatch && sizeMatch;
  });

  // Get aspect ratio class for preview
  const getAspectClass = (size: string) => {
    switch (size) {
      case 'story': return 'aspect-[9/16]';
      case 'landscape': return 'aspect-video';
      default: return 'aspect-square';
    }
  };

  return (
    <div className="space-y-4">
      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <Badge
          variant={activeCategory === 'all' ? 'default' : 'outline'}
          className="cursor-pointer hover:bg-primary/90 transition-colors"
          onClick={() => setActiveCategory('all')}
        >
          Tous
        </Badge>
        {categories.map(cat => (
          <Badge
            key={cat.id}
            variant={activeCategory === cat.id ? 'default' : 'outline'}
            className="cursor-pointer hover:bg-primary/90 transition-colors flex items-center gap-1"
            onClick={() => setActiveCategory(cat.id)}
          >
            {categoryIcons[cat.id]}
            {cat.name}
          </Badge>
        ))}
      </div>

      {/* Size Filter */}
      <Tabs value={activeSize} onValueChange={setActiveSize} className="w-full">
        <TabsList className="grid grid-cols-4 w-full max-w-md">
          <TabsTrigger value="all">Tous</TabsTrigger>
          {sizes.map(size => (
            <TabsTrigger key={size.id} value={size.id}>
              {size.name} ({size.ratio})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Style Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {filteredStyles.map(style => {
          const isSelected = selectedStyle?.id === style.id;
          
          return (
            <div
              key={style.id}
              onClick={() => onSelectStyle(style)}
              className={cn(
                "group relative cursor-pointer rounded-xl overflow-hidden transition-all duration-300",
                "hover:scale-[1.02] hover:shadow-lg",
                isSelected && "ring-2 ring-primary ring-offset-2"
              )}
            >
              {/* Preview Card */}
              <div 
                className={cn("relative", getAspectClass(style.size))}
                style={{ background: style.previewGradient }}
              >
                {/* Icon/Emoji centered */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl opacity-80 drop-shadow-lg">
                    {style.previewIcon}
                  </span>
                </div>

                {/* Accent color indicator */}
                <div 
                  className="absolute bottom-2 right-2 w-4 h-4 rounded-full border-2 border-white/50 shadow-sm"
                  style={{ backgroundColor: style.accentColor }}
                />

                {/* Size badge */}
                <Badge 
                  variant="secondary" 
                  className="absolute top-2 left-2 text-[10px] px-1.5 py-0.5 bg-black/50 text-white border-0"
                >
                  {style.size === 'square' ? '1:1' : style.size === 'story' ? '9:16' : '16:9'}
                </Badge>

                {/* Selection check */}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-lg">
                    <Check className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}

                {/* Hover overlay */}
                <div className={cn(
                  "absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity",
                  "flex items-center justify-center p-3"
                )}>
                  <div className="text-center text-white">
                    <p className="font-medium text-sm mb-1">{style.name}</p>
                    <div className="flex flex-wrap gap-1 justify-center">
                      {style.moodKeywords.slice(0, 2).map(kw => (
                        <span key={kw} className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Title below */}
              <div className="p-2 bg-card">
                <p className={cn(
                  "text-xs font-medium truncate text-center",
                  isSelected ? "text-primary" : "text-foreground"
                )}>
                  {style.name}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {filteredStyles.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Aucun style trouvé pour ces filtres
        </div>
      )}
    </div>
  );
}
