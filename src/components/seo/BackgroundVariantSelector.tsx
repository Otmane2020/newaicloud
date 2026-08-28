import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Download, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/language';
import { getImageUiTranslations } from '@/lib/imageUiTranslations';

interface BackgroundVariant {
  variantId: string;
  imageUrl: string;
  prompt: string;
  style: string;
  description: string;
  qualityScore: number;
  isCentered?: boolean;
  resolution?: string;
  imageBase64?: string;
}

interface BackgroundVariantSelectorProps {
  variants: BackgroundVariant[];
  originalImage: string;
  onSelect: (variantId: string) => void;
  onApply: (variantId: string) => Promise<void>;
  onDownloadHD?: (variantId: string, imageUrl: string) => void;
  isApplying?: boolean;
}

export const BackgroundVariantSelector = ({
  variants,
  originalImage,
  onSelect,
  onApply,
  onDownloadHD,
  isApplying = false,
}: BackgroundVariantSelectorProps) => {
  const { language } = useTranslation();
  const ui = getImageUiTranslations(language);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [hoveredVariant, setHoveredVariant] = useState<string | null>(null);

  const handleSelect = (variantId: string) => {
    setSelectedVariant(variantId);
    onSelect(variantId);
  };

  const handleApply = async () => {
    if (!selectedVariant) {
      toast.error(ui.variants.selectVariantError);
      return;
    }
    await onApply(selectedVariant);
  };

  const handleDownload = (variantId: string, imageUrl: string) => {
    if (onDownloadHD) {
      onDownloadHD(variantId, imageUrl);
      return;
    }

    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `background-variant-${variantId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(ui.variants.downloadStarted);
  };

  const getQualityColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="text-center px-2">
        <h3 className="text-base sm:text-lg font-semibold mb-2">{ui.variants.title}</h3>
        <p className="text-xs sm:text-sm text-muted-foreground">{ui.variants.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 px-2 sm:px-0">
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {variants.map((variant) => {
              const imageUrl = variant.imageUrl || (variant.imageBase64 ? `data:image/png;base64,${variant.imageBase64}` : '');
              return (
                <Card
                  key={variant.variantId}
                  className={`relative overflow-hidden cursor-pointer transition-all duration-200 ${
                    selectedVariant === variant.variantId
                      ? 'ring-2 ring-primary shadow-lg scale-[1.02]'
                      : 'hover:shadow-md hover:scale-[1.01]'
                  }`}
                  onClick={() => handleSelect(variant.variantId)}
                  onMouseEnter={() => setHoveredVariant(variant.variantId)}
                  onMouseLeave={() => setHoveredVariant(null)}
                >
                  <div className="aspect-square relative bg-muted">
                    <img src={imageUrl} alt={variant.description} className="w-full h-full object-cover" />

                    {(hoveredVariant === variant.variantId || selectedVariant === variant.variantId) && (
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
                        {selectedVariant === variant.variantId && (
                          <div className="bg-primary text-primary-foreground rounded-full p-3">
                            <Check className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                    )}

                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="backdrop-blur-sm bg-background/80">
                        <span className={getQualityColor(variant.qualityScore)}>⭐ {variant.qualityScore}/100</span>
                      </Badge>
                    </div>

                    {selectedVariant === variant.variantId && (
                      <div className="absolute top-2 left-2">
                        <Badge variant="default">{ui.common.selected}</Badge>
                      </div>
                    )}
                  </div>

                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm capitalize">{variant.style}</h4>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDownload(variant.variantId, imageUrl);
                        }}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{variant.description}</p>
                    {variant.resolution && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        {variant.resolution}
                      </p>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-1">
          <Card className="overflow-hidden h-full">
            <div className="p-3 sm:p-4 bg-muted/50">
              <h4 className="font-semibold text-xs sm:text-sm mb-2">{ui.variants.originalImage}</h4>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{ui.variants.reference}</p>
            </div>
            <div className="aspect-square relative bg-muted">
              <img src={originalImage} alt={ui.variants.originalImage} className="w-full h-full object-cover" />
            </div>
          </Card>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4 px-2 sm:px-0">
        <Button
          size="lg"
          onClick={handleApply}
          disabled={!selectedVariant || isApplying}
          className="min-w-[200px] h-10 sm:h-11 text-sm sm:text-base"
        >
          {isApplying ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              <span className="text-xs sm:text-base">{ui.common.applying}</span>
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              <span className="text-xs sm:text-base">{ui.common.apply}</span>
            </>
          )}
        </Button>

        {selectedVariant && (
          <Button
            size="lg"
            variant="outline"
            onClick={() => {
              const variant = variants.find((item) => item.variantId === selectedVariant);
              if (!variant) return;
              const imageUrl = variant.imageUrl || (variant.imageBase64 ? `data:image/png;base64,${variant.imageBase64}` : '');
              handleDownload(variant.variantId, imageUrl);
            }}
            className="min-w-[150px] h-10 sm:h-11 text-sm sm:text-base"
          >
            <Download className="h-4 w-4 mr-2" />
            <span className="text-xs sm:text-base">{ui.common.downloadHd}</span>
          </Button>
        )}
      </div>

      {selectedVariant && (
        <Card className="p-4 bg-primary/5">
          {variants
            .filter((variant) => variant.variantId === selectedVariant)
            .map((variant) => (
              <div key={variant.variantId} className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  {ui.variants.selectedVariant}: {variant.style}
                </h4>
                <p className="text-sm text-muted-foreground">{variant.description}</p>
                {variant.resolution && (
                  <p className="text-xs text-muted-foreground">
                    {ui.common.resolution}: {variant.resolution}
                  </p>
                )}
              </div>
            ))}
        </Card>
      )}
    </div>
  );
};
