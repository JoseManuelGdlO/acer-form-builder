import { useState, useEffect } from 'react';
import { BusTemplate, BusLayout } from '@/types/form';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bus } from 'lucide-react';
import { BusLayoutEditor } from './bus-layout/BusLayoutEditor';

interface BusTemplateFormModalProps {
  template: BusTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    name: string;
    layout: BusLayout;
  }) => Promise<void>;
}

const defaultLayout = (): BusLayout => ({
  floors: [{ elements: [] }],
  canvas: { width: 400, height: 600, gridSize: 10 },
});

function normalizeIncomingLayout(layout: BusLayout | null | undefined): BusLayout {
  if (typeof layout === 'string') {
    try {
      const parsed = JSON.parse(layout) as BusLayout;
      return normalizeIncomingLayout(parsed);
    } catch {
      return defaultLayout();
    }
  }
  if (!layout || !Array.isArray(layout.floors) || layout.floors.length === 0) return defaultLayout();
  const floors = layout.floors.map((f: any) => ({
    elements: Array.isArray(f?.elements)
      ? [...f.elements]
      : Array.isArray(f?.items)
        ? [...f.items]
        : [],
  }));
  return {
    floors,
    canvas: layout.canvas ?? defaultLayout().canvas,
  };
}

export const BusTemplateFormModal = ({
  template,
  open,
  onOpenChange,
  onSave,
}: BusTemplateFormModalProps) => {
  const [name, setName] = useState('');
  const [layout, setLayout] = useState<BusLayout>(defaultLayout);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setLayout(normalizeIncomingLayout(template.layout as BusLayout | null | undefined));
    } else {
      setName('');
      setLayout(defaultLayout());
    }
  }, [template, open]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setIsLoading(true);
    try {
      // Ensure layout always has the expected structure hints (canvas optional in backend).
      const finalLayout: BusLayout = {
        ...layout,
        floors: Array.isArray(layout.floors) && layout.floors.length ? layout.floors : defaultLayout().floors,
        canvas: layout.canvas ?? defaultLayout().canvas,
      };
      await onSave({ name: name.trim(), layout: finalLayout });
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bus className="w-5 h-5" />
            {template ? 'Editar plantilla de camión' : 'Nueva plantilla de camión'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Usa el editor para arrastrar elementos, editar sus propiedades y guardar el layout como JSON reutilizable.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-hidden">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Camión 30 plazas"
            />
          </div>

          <div className="flex-1 min-h-0 overflow-auto">
            <BusLayoutEditor value={layout} onChange={setLayout} maxFloors={2} />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isLoading || !name.trim()}>
            {isLoading ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
