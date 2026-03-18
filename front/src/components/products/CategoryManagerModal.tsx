import { useEffect, useState } from 'react';
import { Category } from '@/types/category';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface CategoryManagerModalProps {
  open: boolean;
  categories: Category[];
  onClose: () => void;
  onCreate: (data: { name: string; color?: string }) => Promise<void>;
  onUpdate: (id: string, data: { name?: string; color?: string | null }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const COLOR_OPTIONS = ['info', 'success', 'warning', 'secondary', 'outline'] as const;

export const CategoryManagerModal = ({
  open,
  categories,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}: CategoryManagerModalProps) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setName('');
      setColor('');
      setEditingId(null);
    }
  }, [open]);

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setName(cat.name);
    setColor(cat.color || '');
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setColor('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    setIsSubmitting(true);
    try {
      if (editingId) {
        await onUpdate(editingId, { name: trimmedName, color: color || null });
      } else {
        await onCreate({ name: trimmedName, color: color || undefined });
      }
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, label: string) => {
    const confirmed = window.confirm(
      `¿Seguro que quieres eliminar la categoría "${label}"? No debe estar asignada a productos.`
    );
    if (!confirmed) return;
    await onDelete(id);
    if (editingId === id) resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isSubmitting && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestionar categorías de productos</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Nombre
              <span className="text-destructive ml-0.5">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Viaja por tu cuenta"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Color del badge</label>
            <select
              className="border rounded-md px-2 py-1 text-sm bg-background"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            >
              <option value="">Por defecto</option>
              {COLOR_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={resetForm} disabled={isSubmitting}>
              Limpiar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {editingId ? (isSubmitting ? 'Guardando...' : 'Actualizar') : isSubmitting ? 'Creando...' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>

        <div className="mt-6 space-y-2">
          <h3 className="text-sm font-semibold">Categorías existentes</h3>
          {categories.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Aún no tienes categorías configuradas. Crea una arriba.
            </p>
          ) : (
            <div className="border rounded-md divide-y">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div className="flex flex-col">
                    <span className="font-medium">{cat.name}</span>
                    <span className="text-xs text-muted-foreground">
                      Clave: <code>{cat.key}</code>{' '}
                      {cat.color ? `(color: ${cat.color})` : '(color por defecto)'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => startEdit(cat)}
                      disabled={isSubmitting}
                    >
                      Editar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(cat.id, cat.name)}
                      disabled={isSubmitting}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

