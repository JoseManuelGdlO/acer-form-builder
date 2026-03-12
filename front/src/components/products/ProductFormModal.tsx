import { useEffect, useState } from 'react';
import { Product } from '@/types/product';
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

interface ProductFormModalProps {
  open: boolean;
  product?: Product | null;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description: string;
    requirements: string;
    imageFile?: File | null;
  }) => Promise<void>;
}

export const ProductFormModal = ({
  open,
  product,
  onClose,
  onSubmit,
}: ProductFormModalProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (product) {
      setTitle(product.title);
      setDescription(product.description);
      setRequirements(product.requirements);
      setImageFile(null);
      setPreviewUrl(null);
    } else {
      setTitle('');
      setDescription('');
      setRequirements('');
      setImageFile(null);
      setPreviewUrl(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !requirements.trim()) {
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        requirements: requirements.trim(),
        imageFile,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isSubmitting && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product ? 'Editar producto' : 'Crear producto'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Título
              <span className="text-destructive ml-0.5">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Visa de turista USA"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Descripción
              <span className="text-destructive ml-0.5">*</span>
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción general del servicio de visa..."
              rows={3}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Requerimientos
              <span className="text-destructive ml-0.5">*</span>
            </label>
            <Textarea
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="Lista de requisitos (puedes usar saltos de línea)..."
              rows={4}
              required
            />
            <p className="text-xs text-muted-foreground">
              Puedes escribir los requisitos separados por saltos de línea para que tu cliente
              los vea claros.
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Imagen promocional</label>
            <Input type="file" accept="image/*" onChange={handleFileChange} />
            {previewUrl && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-1">Vista previa:</p>
                <img
                  src={previewUrl}
                  alt="Vista previa"
                  className="h-32 w-full object-cover rounded-md border"
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

