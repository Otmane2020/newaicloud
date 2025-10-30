import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatNumber } from '@/lib/utils';

interface ProductCardProps {
  id: string;
  title: string;
  description: string | null;
  vendor: string | null;
  product_type: string | null;
  status: string;
  price: number | null;
  compare_at_price: number | null;
  currency: string;
  image_url: string | null;
  inventory_quantity: number;
}

export function ProductCard({
  title,
  description,
  vendor,
  product_type,
  status,
  price,
  compare_at_price,
  currency,
  image_url,
  inventory_quantity,
}: ProductCardProps) {
  const hasDiscount = compare_at_price && price && compare_at_price > price;
  const discountPercent = hasDiscount
    ? Math.round(((compare_at_price - price) / compare_at_price) * 100)
    : 0;

  const truncateText = (text: string | null, maxLength: number) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border-border">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {image_url ? (
          <img
            src={image_url}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <span className="text-muted-foreground text-sm">Pas d'image</span>
          </div>
        )}
        
        {/* Status badge */}
        <Badge
          variant={status === 'active' ? 'default' : 'secondary'}
          className="absolute top-2 right-2"
        >
          {status === 'active' ? 'Actif' : 'Brouillon'}
        </Badge>

        {/* Discount badge */}
        {hasDiscount && (
          <Badge variant="destructive" className="absolute top-2 left-2">
            -{discountPercent}%
          </Badge>
        )}
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Title */}
        <h3 className="font-semibold text-lg line-clamp-2 min-h-[3.5rem]">
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
            {truncateText(description.replace(/<[^>]*>/g, ''), 100)}
          </p>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">
            {price ? `${price} ${currency}` : 'Prix non défini'}
          </span>
          {hasDiscount && compare_at_price && (
            <span className="text-sm text-muted-foreground line-through">
              {compare_at_price} {currency}
            </span>
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex flex-col gap-1">
            {vendor && (
              <span className="text-xs text-muted-foreground">
                {vendor}
              </span>
            )}
            {product_type && (
              <span className="text-xs text-muted-foreground">
                {product_type}
              </span>
            )}
          </div>

          {/* Stock badge */}
          <Badge variant={inventory_quantity > 0 ? 'success' : 'destructive'}>
            {inventory_quantity > 0 ? `Stock: ${formatNumber(inventory_quantity)}` : 'Rupture'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
