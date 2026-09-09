import { useMemo, useState } from 'react';
import { Package, Plus, Tags } from 'lucide-react';
import { getApiBaseURL } from '@/lib/api';
import { Product } from '@/types/product';
import { Category } from '@/types/category';
import { Button } from '@/components/ui/button';
import { Toolbar } from '@/components/layout/Toolbar';
import { cn } from '@/lib/utils';
import { ProductCard } from './ProductCard';

interface ProductsListProps {
  products: Product[];
  onCreate: () => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  categoriesMap?: Record<string, Category>;
  readOnly?: boolean;
  categories?: Category[];
  selectedFilterCategories?: string[];
  onToggleFilterCategory?: (key: string) => void;
  onApplyFilters?: () => void;
  onClearFilters?: () => void;
  canManageCategories?: boolean;
  onManageCategories?: () => void;
  filtersReady?: boolean;
}

export const ProductsList = ({
  products,
  onCreate,
  onEdit,
  onDelete,
  categoriesMap,
  readOnly = false,
  categories = [],
  selectedFilterCategories = [],
  onToggleFilterCategory,
  onApplyFilters,
  onClearFilters,
  canManageCategories = false,
  onManageCategories,
  filtersReady = true,
}: ProductsListProps) => {
  const [search, setSearch] = useState('');

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sortedProducts;
    return sortedProducts.filter(
      (product) =>
        product.title.toLowerCase().includes(q) ||
        (product.description ?? '').toLowerCase().includes(q) ||
        product.includes.toLowerCase().includes(q)
    );
  }, [sortedProducts, search]);

  const getImageUrl = (imagePath?: string | null) => {
    if (!imagePath) return null;
    const apiBase = getApiBaseURL();
    const origin = apiBase.startsWith('/') ? '' : apiBase.replace(/\/api\/?$/, '');
    return `${origin}/uploads/${imagePath}`;
  };

  return (
    <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
      <Toolbar search={search} onSearchChange={setSearch} placeholder="Buscar producto…">
        {canManageCategories && onManageCategories ? (
          <Button type="button" variant="outline" onClick={onManageCategories}>
            <Tags />
            Gestionar categorías
          </Button>
        ) : null}
        {readOnly ? null : (
          <Button type="button" onClick={onCreate}>
            <Plus />
            Nuevo producto
          </Button>
        )}
      </Toolbar>

      {categories.length > 0 && onToggleFilterCategory ? (
        <div className="mb-5 space-y-3">
          <p className="text-xs font-medium text-muted-foreground">Filtrar por categoría</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const active = selectedFilterCategories.includes(cat.key);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onToggleFilterCategory(cat.key)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                    active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-foreground hover:border-primary/30 hover:bg-muted/40',
                  )}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={onApplyFilters} disabled={!filtersReady}>
              Aplicar filtros
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onClearFilters}
              disabled={!filtersReady && selectedFilterCategories.length === 0}
            >
              Quitar filtros
            </Button>
          </div>
        </div>
      ) : null}

      {filteredProducts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted/50">
            <Package className="size-8 text-muted-foreground" />
          </div>
          <h3 className="mb-1 font-display text-lg font-semibold text-foreground">
            {search ? 'Sin resultados' : 'No hay productos'}
          </h3>
          <p className="mb-4 text-sm text-muted-foreground">
            {search
              ? 'No se encontraron productos con ese término'
              : readOnly
                ? 'No hay productos disponibles'
                : 'Crea el primero para armar el catálogo comercial'}
          </p>
          {!search && !readOnly ? (
            <Button type="button" onClick={onCreate}>
              <Plus />
              Crear producto
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              imageUrl={getImageUrl(product.imagePath ?? null)}
              categoriesMap={categoriesMap}
              readOnly={readOnly}
              onEdit={() => onEdit(product)}
              onDelete={() => onDelete(product)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
