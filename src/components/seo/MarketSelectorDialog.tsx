import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Globe, Check } from 'lucide-react';
import { useTranslation } from '@/lib/language';

interface Market {
  code: string;
  name: string;
  flag: string;
}

interface MarketRegion {
  region: string;
  regionLabel: { en: string; fr: string };
  markets: Market[];
}

const MARKET_REGIONS: MarketRegion[] = [
  {
    region: 'europe',
    regionLabel: { en: 'Europe', fr: 'Europe' },
    markets: [
      { code: 'fr', name: 'France', flag: '🇫🇷' },
      { code: 'de', name: 'Allemagne', flag: '🇩🇪' },
      { code: 'it', name: 'Italie', flag: '🇮🇹' },
      { code: 'es', name: 'Espagne', flag: '🇪🇸' },
      { code: 'uk', name: 'Royaume-Uni', flag: '🇬🇧' },
      { code: 'be', name: 'Belgique', flag: '🇧🇪' },
      { code: 'nl', name: 'Pays-Bas', flag: '🇳🇱' },
      { code: 'ch', name: 'Suisse', flag: '🇨🇭' },
      { code: 'at', name: 'Autriche', flag: '🇦🇹' },
      { code: 'pt', name: 'Portugal', flag: '🇵🇹' },
      { code: 'se', name: 'Suède', flag: '🇸🇪' },
      { code: 'no', name: 'Norvège', flag: '🇳🇴' },
      { code: 'dk', name: 'Danemark', flag: '🇩🇰' },
      { code: 'fi', name: 'Finlande', flag: '🇫🇮' },
      { code: 'ie', name: 'Irlande', flag: '🇮🇪' },
      { code: 'pl', name: 'Pologne', flag: '🇵🇱' },
    ],
  },
  {
    region: 'americas',
    regionLabel: { en: 'Americas', fr: 'Amériques' },
    markets: [
      { code: 'us', name: 'États-Unis', flag: '🇺🇸' },
      { code: 'ca', name: 'Canada', flag: '🇨🇦' },
      { code: 'mx', name: 'Mexique', flag: '🇲🇽' },
      { code: 'br', name: 'Brésil', flag: '🇧🇷' },
      { code: 'ar', name: 'Argentine', flag: '🇦🇷' },
      { code: 'cl', name: 'Chili', flag: '🇨🇱' },
    ],
  },
  {
    region: 'middle-east',
    regionLabel: { en: 'Middle East', fr: 'Moyen-Orient' },
    markets: [
      { code: 'ae', name: 'Émirats Arabes Unis', flag: '🇦🇪' },
      { code: 'sa', name: 'Arabie Saoudite', flag: '🇸🇦' },
      { code: 'qa', name: 'Qatar', flag: '🇶🇦' },
      { code: 'kw', name: 'Koweït', flag: '🇰🇼' },
      { code: 'om', name: 'Oman', flag: '🇴🇲' },
      { code: 'il', name: 'Israël', flag: '🇮🇱' },
      { code: 'tr', name: 'Turquie', flag: '🇹🇷' },
    ],
  },
  {
    region: 'asia-pacific',
    regionLabel: { en: 'Asia-Pacific', fr: 'Asie-Pacifique' },
    markets: [
      { code: 'cn', name: 'Chine', flag: '🇨🇳' },
      { code: 'jp', name: 'Japon', flag: '🇯🇵' },
      { code: 'kr', name: 'Corée du Sud', flag: '🇰🇷' },
      { code: 'in', name: 'Inde', flag: '🇮🇳' },
      { code: 'au', name: 'Australie', flag: '🇦🇺' },
      { code: 'nz', name: 'Nouvelle-Zélande', flag: '🇳🇿' },
      { code: 'sg', name: 'Singapour', flag: '🇸🇬' },
      { code: 'th', name: 'Thaïlande', flag: '🇹🇭' },
      { code: 'my', name: 'Malaisie', flag: '🇲🇾' },
      { code: 'id', name: 'Indonésie', flag: '🇮🇩' },
      { code: 'ph', name: 'Philippines', flag: '🇵🇭' },
      { code: 'vn', name: 'Vietnam', flag: '🇻🇳' },
    ],
  },
  {
    region: 'africa',
    regionLabel: { en: 'Africa', fr: 'Afrique' },
    markets: [
      { code: 'za', name: 'Afrique du Sud', flag: '🇿🇦' },
      { code: 'eg', name: 'Égypte', flag: '🇪🇬' },
      { code: 'ma', name: 'Maroc', flag: '🇲🇦' },
      { code: 'ng', name: 'Nigéria', flag: '🇳🇬' },
      { code: 'ke', name: 'Kenya', flag: '🇰🇪' },
    ],
  },
];

interface MarketSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMarkets: string[];
  onMarketsChange: (markets: string[]) => void;
}

export function MarketSelectorDialog({
  open,
  onOpenChange,
  selectedMarkets,
  onMarketsChange,
}: MarketSelectorDialogProps) {
  const { language } = useTranslation();

  const toggleMarket = (code: string) => {
    onMarketsChange(
      selectedMarkets.includes(code)
        ? selectedMarkets.filter(m => m !== code)
        : [...selectedMarkets, code]
    );
  };

  const toggleRegion = (region: MarketRegion) => {
    const regionCodes = region.markets.map(m => m.code);
    const allSelected = regionCodes.every(code => selectedMarkets.includes(code));
    
    if (allSelected) {
      onMarketsChange(selectedMarkets.filter(m => !regionCodes.includes(m)));
    } else {
      onMarketsChange([...new Set([...selectedMarkets, ...regionCodes])]);
    }
  };

  const isRegionFullySelected = (region: MarketRegion) => {
    return region.markets.every(m => selectedMarkets.includes(m.code));
  };

  const isRegionPartiallySelected = (region: MarketRegion) => {
    return region.markets.some(m => selectedMarkets.includes(m.code)) && !isRegionFullySelected(region);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            {language === 'fr' ? 'Sélection des marchés' : 'Market Selection'}
          </DialogTitle>
          <DialogDescription>
            {language === 'fr'
              ? 'Choisissez les pays où rechercher les prix concurrents via Google Lens'
              : 'Choose countries where to search competitor prices via Google Lens'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {MARKET_REGIONS.map((region) => (
              <div key={region.region} className="space-y-3">
                {/* Region Header */}
                <div 
                  className="flex items-center gap-3 cursor-pointer group py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                  onClick={() => toggleRegion(region)}
                >
                  <Checkbox
                    checked={isRegionFullySelected(region)}
                    className={isRegionPartiallySelected(region) ? "data-[state=checked]:bg-primary/50" : ""}
                    onClick={(e) => e.stopPropagation()}
                    onCheckedChange={() => toggleRegion(region)}
                  />
                  <span className="text-sm font-semibold">
                    {region.regionLabel[language]}
                  </span>
                  <Badge variant="outline" className="ml-auto text-xs">
                    {region.markets.filter(m => selectedMarkets.includes(m.code)).length}/{region.markets.length}
                  </Badge>
                </div>

                {/* Markets Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pl-8">
                  {region.markets.map((market) => (
                    <div
                      key={market.code}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                      onClick={() => toggleMarket(market.code)}
                    >
                      <Checkbox
                        checked={selectedMarkets.includes(market.code)}
                        onClick={(e) => e.stopPropagation()}
                        onCheckedChange={() => toggleMarket(market.code)}
                      />
                      <label className="text-sm cursor-pointer flex items-center gap-1.5">
                        <span>{market.flag}</span>
                        <span className="group-hover:text-primary transition-colors">{market.name}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Footer with selected count */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">
              {language === 'fr' 
                ? `${selectedMarkets.length} marché(s) sélectionné(s)`
                : `${selectedMarkets.length} market(s) selected`}
            </span>
          </div>
          <Button onClick={() => onOpenChange(false)}>
            {language === 'fr' ? 'Valider' : 'Confirm'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
