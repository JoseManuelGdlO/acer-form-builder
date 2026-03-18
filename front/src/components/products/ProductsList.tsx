import { useMemo } from 'react';
import { Product } from '@/types/product';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Category } from '@/types/category';

interface ProductsListProps {
  products: Product[];
  onCreate: () => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  categoriesMap?: Record<string, Category>;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const ProductsList = ({ products, onCreate, onEdit, onDelete, categoriesMap }: ProductsListProps) => {
  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    [products]
  );

  const getImageUrl = (imagePath?: string | null) => {
    if (!imagePath) return null;
    const base = API_URL.replace(/\/api\/?$/, '');
    return `${base}/uploads/${imagePath}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-primary">Productos</h1>
          <Button onClick={onCreate}>Crear producto</Button>
        </div>

        {sortedProducts.length === 0 ? (
          <div className="border rounded-lg p-8 text-center text-muted-foreground bg-card">
            <p className="mb-3">Aún no tienes productos creados.</p>
            <Button onClick={onCreate}>Crear el primer producto</Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sortedProducts.map((product) => {
              const imageUrl = getImageUrl(product.imagePath ?? null);
              return (
                <div
                  key={product.id}
                  className="border rounded-lg overflow-hidden bg-card flex flex-col shadow-sm"
                >
                  {imageUrl && (
                    <div className="h-40 w-full overflow-hidden bg-muted">
                      <img
                        src={imageUrl}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-4 flex flex-col gap-2 flex-1">
                    <h2 className="font-semibold text-lg line-clamp-1">{product.title}</h2>
                    {product.categories && product.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {product.categories.map((catKey) => {
                          const cat = categoriesMap?.[catKey];
                          const label = cat?.name || catKey;
                          const variant = (cat?.color as any) || 'secondary';
                          return (
                            <Badge
                              key={catKey}
                              variant={variant}
                              className="text-[10px] font-normal px-2 py-0.5"
                            >
                              {label}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {product.description}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <Button variant="outline" size="sm" onClick={() => onEdit(product)}>
                        Editar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onDelete(product)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

