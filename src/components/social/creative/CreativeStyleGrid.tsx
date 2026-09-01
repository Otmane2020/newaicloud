import { useMemo, useState } from 'react';
import {
  Check,
  Sparkles,
  Home,
  Square,
  Zap,
  Gift,
  Newspaper,
  Flame,
  Search,
  LayoutGrid,
  Smartphone,
  Monitor,
  ArrowUpRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CREATIVE_STYLES,
  getCategories,
  getSizes,
  type CreativeStyle,
} from '../templates/creativeStyles';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

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
  dynamic: <Flame className="h-3.5 w-3.5" />,
};

const sizeIcons: Record<string, React.ReactNode> = {
  all: <LayoutGrid className="h-4 w-4" />,
  square: <Square className="h-4 w-4" />,
  story: <Smartphone className="h-4 w-4" />,
  landscape: <Monitor className="h-4 w-4" />,
};

const formatLabel = (size: string) => {
  if (size === 'story') return '9:16';
  if (size === 'landscape') return '16:9';
  return '1:1';
};

const previewCanvasClass = (size: string) => {
  if (size === 'story') return 'h-[76%] aspect-[9/16]';
  if (size === 'landscape') return 'w-[80%] aspect-video';
  return 'h-[72%] aspect-square';
};

export function CreativeStyleGrid({ selectedStyle, onSelectStyle }: CreativeStyleGridProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeSize, setActiveSize] = useState<string>('all');
  const [query, setQuery] = useState('');

  const categories = getCategories();
  const sizes = getSizes();

  const filteredStyles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return CREATIVE_STYLES.filter((style) => {
      const categoryMatch = activeCategory === 'all' || style.category === activeCategory;
      const sizeMatch = activeSize === 'all' || style.size === activeSize;
      const searchMatch =
        !normalizedQuery ||
        style.name.toLowerCase().includes(normalizedQuery) ||
        style.moodKeywords.some((keyword) => keyword.toLowerCase().includes(normalizedQuery));

      return categoryMatch && sizeMatch && searchMatch;
    });
  }, [activeCategory, activeSize, query]);

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-muted/40 p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-primary/5 blur-3xl" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Badge variant="secondary" className="mb-3 rounded-full px-2.5 py-1 text-[11px] font-medium">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Galerie de templates IA
            </Badge>
            <h3 className="text-lg font-semibold tracking-tight sm:text-xl">
              Choisissez une direction créative
            </h3>
            <p className="mt-1.5 max-w-xl text-sm leading-6 text-muted-foreground">
              Le template définit l’ambiance, le cadrage et la mise en scène générés par l’IA. Sélectionnez d’abord un univers, puis personnalisez votre création.
            </p>
          </div>

          {selectedStyle ? (
            <div className="flex min-w-0 items-center gap-3 rounded-xl border bg-background/80 p-2.5 pr-4 shadow-sm backdrop-blur-sm">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/20 text-lg shadow-inner"
                style={{ background: selectedStyle.previewGradient }}
              >
                <span className="drop-shadow-sm">{selectedStyle.previewIcon}</span>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Sélection actuelle
                </p>
                <p className="truncate text-sm font-semibold">{selectedStyle.name}</p>
              </div>
              <Check className="ml-1 h-4 w-4 shrink-0 text-primary" />
            </div>
          ) : (
            <div className="rounded-full border bg-background/70 px-3 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur-sm">
              {CREATIVE_STYLES.length} templates disponibles
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-3.5 sm:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher un style…"
              className="h-10 rounded-xl bg-background pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={cn(
                'inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors',
                activeCategory === 'all'
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : 'border-border bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground',
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Tous
            </button>

            {categories.map((category) => (
              <button
                type="button"
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={cn(
                  'inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors',
                  activeCategory === category.id
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                    : 'border-border bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground',
                )}
              >
                {categoryIcons[category.id]}
                {category.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
          <span className="mr-1 text-xs font-medium text-muted-foreground">Format</span>
          <button
            type="button"
            onClick={() => setActiveSize('all')}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors',
              activeSize === 'all'
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
            )}
          >
            {sizeIcons.all}
            Tous
          </button>

          {sizes.map((size) => (
            <button
              type="button"
              key={size.id}
              onClick={() => setActiveSize(size.id)}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors',
                activeSize === size.id
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
              )}
            >
              {sizeIcons[size.id]}
              {size.name}
              <span className="text-[10px] opacity-60">{size.ratio}</span>
            </button>
          ))}

          <span className="ml-auto text-xs text-muted-foreground">
            {filteredStyles.length} résultat{filteredStyles.length > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {filteredStyles.map((style) => {
          const isSelected = selectedStyle?.id === style.id;

          return (
            <button
              type="button"
              key={style.id}
              onClick={() => onSelectStyle(style)}
              aria-pressed={isSelected}
              className={cn(
                'group relative overflow-hidden rounded-2xl border bg-card text-left transition-all duration-200',
                'hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-lg hover:shadow-black/5',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                isSelected && 'border-primary ring-2 ring-primary/20 shadow-md',
              )}
            >
              <div
                className="relative aspect-[4/3] overflow-hidden border-b"
                style={{ background: style.previewGradient }}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/25" />
                <div
                  className="absolute -left-8 -top-8 h-28 w-28 rounded-full opacity-25 blur-2xl"
                  style={{ backgroundColor: style.accentColor }}
                />
                <div
                  className="absolute -bottom-12 -right-8 h-36 w-36 rounded-full opacity-30 blur-3xl"
                  style={{ backgroundColor: style.accentColor }}
                />

                <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5">
                  <Badge className="border-white/15 bg-black/35 px-2 py-0.5 text-[10px] font-medium text-white shadow-sm backdrop-blur-md hover:bg-black/35">
                    {categoryIcons[style.category]}
                    <span className="ml-1 capitalize">{style.category}</span>
                  </Badge>
                  <Badge className="border-white/15 bg-black/35 px-2 py-0.5 text-[10px] font-medium text-white shadow-sm backdrop-blur-md hover:bg-black/35">
                    {formatLabel(style.size)}
                  </Badge>
                </div>

                {isSelected && (
                  <div className="absolute right-3 top-3 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                    <Check className="h-4 w-4" />
                  </div>
                )}

                <div className="absolute inset-0 flex items-center justify-center p-6">
                  <div
                    className={cn(
                      'relative overflow-hidden rounded-xl border border-white/30 bg-white/12 shadow-2xl backdrop-blur-[2px] transition-transform duration-300 group-hover:scale-[1.025]',
                      previewCanvasClass(style.size),
                    )}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/10" />
                    <div className="absolute inset-x-[12%] bottom-[14%] h-[16%] rounded-full bg-black/20 blur-md" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex h-[42%] aspect-square items-center justify-center rounded-[28%] border border-white/25 bg-white/15 text-3xl shadow-xl backdrop-blur-sm">
                        <span className="drop-shadow-lg">{style.previewIcon}</span>
                      </div>
                    </div>
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between rounded-md bg-black/20 px-2 py-1 text-[8px] font-medium uppercase tracking-[0.16em] text-white/85 backdrop-blur-sm">
                      <span>AI creative</span>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: style.accentColor }} />
                    </div>
                  </div>
                </div>

                <div className="absolute inset-x-3 bottom-3 z-10 flex translate-y-2 items-center justify-center opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-background/95 px-3 py-1.5 text-xs font-semibold text-foreground shadow-lg backdrop-blur-md">
                    Utiliser ce template
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className={cn('truncate text-sm font-semibold', isSelected && 'text-primary')}>
                      {style.name}
                    </h4>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {style.size === 'story'
                        ? 'Story & Reel vertical'
                        : style.size === 'landscape'
                          ? 'Bannière & publication paysage'
                          : 'Post social polyvalent'}
                    </p>
                  </div>
                  <div
                    className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-background shadow-sm ring-1 ring-border"
                    style={{ backgroundColor: style.accentColor }}
                    aria-hidden="true"
                  />
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {style.moodKeywords.slice(0, 3).map((keyword) => (
                    <span
                      key={keyword}
                      className="rounded-md bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {filteredStyles.length === 0 && (
        <div className="rounded-2xl border border-dashed bg-muted/20 px-6 py-12 text-center">
          <Search className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <p className="mt-3 text-sm font-medium">Aucun template trouvé</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Essayez un autre mot-clé, une autre catégorie ou un autre format.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setActiveCategory('all');
              setActiveSize('all');
            }}
            className="mt-4 text-xs font-semibold text-primary hover:underline"
          >
            Réinitialiser les filtres
          </button>
        </div>
      )}
    </div>
  );
}
