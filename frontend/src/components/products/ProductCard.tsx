import { MoreHorizontal, Package, Pencil, Trash2 } from 'lucide-react';
import type { MouseEvent } from 'react';
import { Product } from '@/types/product';
import { Category } from '@/types/category';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProductCardProps {
  product: Product;
  imageUrl: string | null;
  categoriesMap?: Record<string, Category>;
  readOnly?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(price);
}

export const ProductCard = ({
  product,
  imageUrl,
  categoriesMap,
  readOnly = false,
  onEdit,
  onDelete,
}: ProductCardProps) => {
  const detail = product.description?.trim() || product.includes;
  const categories = Array.isArray(product.categories) ? product.categories : [];

  const handleCardClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-no-view="true"]')) return;
    if (readOnly) return;
    onEdit();
  };

  return (
    <Card
      className={`overflow-hidden border-border p-0 shadow-sm transition-colors hover:border-primary/30 ${
        readOnly ? '' : 'group cursor-pointer'
      }`}
    >
      <CardContent className="p-0" onClick={handleCardClick}>
        {imageUrl ? (
          <div className="h-40 w-full overflow-hidden bg-muted">
            <img src={imageUrl} alt={product.title} className="h-full w-full object-cover" />
          </div>
        ) : null}

        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            {imageUrl ? (
              <h2 className="min-w-0 flex-1 font-display font-semibold">{product.title}</h2>
            ) : (
              <div className="grid size-10 shrink-0 place-items-center rounded-md bg-secondary/25 text-secondary-foreground">
                <Package className="size-5" />
              </div>
            )}
            {readOnly ? null : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    data-no-view="true"
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    aria-label="Acciones del producto"
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent data-no-view="true" align="end" className="w-44">
                  <DropdownMenuItem data-no-view="true" onClick={onEdit}>
                    <Pencil className="mr-2 size-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    data-no-view="true"
                    onClick={onDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 size-4" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {imageUrl ? null : <h2 className="mt-4 font-display font-semibold">{product.title}</h2>}
          {detail ? (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{detail}</p>
          ) : null}

          <div className="mt-5 flex items-end justify-between gap-3">
            <div className="flex min-w-0 flex-wrap gap-1">
              {categories.map((catKey) => {
                const cat = categoriesMap?.[catKey];
                const label = cat?.name || catKey;
                const variant = (cat?.color as 'info' | 'success' | 'warning' | 'secondary' | 'outline' | undefined) || 'secondary';
                return (
                  <Badge key={catKey} variant={variant} className="text-[10px] font-normal">
                    {label}
                  </Badge>
                );
              })}
            </div>
            <p className="shrink-0 text-sm font-semibold">{formatPrice(product.price)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
