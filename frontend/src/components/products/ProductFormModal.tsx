import { useEffect, useState } from 'react';
import { Product } from '@/types/product';
import { Category } from '@/types/category';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

interface ProductFormModalProps {
  open: boolean;
  product?: Product | null;
  onClose: () => void;
  availableCategories?: Category[];
  onSubmit: (data: {
    title: string;
    includes: string;
    price: number;
    description?: string;
    requirements?: string;
    categories?: string[];
    imageFile?: File | null;
  }) => Promise<void>;
}

export const ProductFormModal = ({
  open,
  product,
  onClose,
  availableCategories,
  onSubmit,
}: ProductFormModalProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [includes, setIncludes] = useState('');
  const [price, setPrice] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  useEffect(() => {
    if (product) {
      setTitle(product.title);
      setDescription(product.description ?? '');
      setRequirements(product.requirements ?? '');
      setIncludes(product.includes);
      setPrice(product.price != null ? String(product.price) : '');
      setImageFile(null);
      setPreviewUrl(null);
      setSelectedCategories(Array.isArray(product.categories) ? product.categories : []);
    } else {
      setTitle('');
      setDescription('');
      setRequirements('');
      setIncludes('');
      setPrice('');
      setImageFile(null);
      setPreviewUrl(null);
      setSelectedCategories([]);
    }
  }, [product, open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const toggleCategory = (key: string) => {
    setSelectedCategories((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedIncludes = includes.trim();
    const trimmedDescription = description.trim();
    const trimmedRequirements = requirements.trim();
    const priceValue = parseInt(price, 10);

    if (!trimmedTitle || !trimmedIncludes || Number.isNaN(priceValue) || priceValue <= 0) {
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit({
        title: trimmedTitle,
        includes: trimmedIncludes,
        price: priceValue,
        description: trimmedDescription || undefined,
        requirements: trimmedRequirements || undefined,
        categories: selectedCategories,
        imageFile,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isSubmitting && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{product ? 'Editar producto' : 'Crear producto'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>
              Título
              <span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Paquete Chiapas 7 días"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción general del producto o servicio..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Requerimientos</Label>
            <Textarea
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="Lista de requisitos (puedes usar saltos de línea)..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Puedes escribir los requisitos separados por saltos de línea para que tu cliente
              los vea claros.
            </p>
          </div>
          <div className="space-y-2">
            <Label>
              Qué incluye
              <span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Textarea
              value={includes}
              onChange={(e) => setIncludes(e.target.value)}
              placeholder="Detalle de lo que incluye este producto o servicio..."
              rows={4}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>
              Precio
              <span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Ej. 1500"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Categorías</Label>
            {availableCategories && availableCategories.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {availableCategories.map((cat) => {
                    const checked = selectedCategories.includes(cat.key);
                    return (
                      <div
                        key={cat.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleCategory(cat.key)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleCategory(cat.key);
                          }
                        }}
                        className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-2 py-1 text-left hover:bg-muted/40"
                      >
                        <Badge
                          variant={(checked ? (cat.color as any) : 'outline') || (checked ? 'secondary' : 'outline')}
                          className="text-xs font-normal"
                        >
                          {cat.name}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Puedes asignar una o varias categorías para agrupar mejor tus productos.
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                Aún no hay categorías configuradas. Usa \"Gestionar categorías\" para crear algunas.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Imagen promocional</Label>
            <Input type="file" accept="image/*" onChange={handleFileChange} />
            {previewUrl && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-1">Vista previa:</p>
                <img
                  src={previewUrl}
                  alt="Vista previa"
                  className="h-32 w-full rounded-md border border-border object-cover"
                />
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

