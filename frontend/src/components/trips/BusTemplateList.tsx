import { useState } from 'react';
import { BusTemplate, BusLayout } from '@/types/form';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Bus, ArrowLeft, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { BusTemplateFormModal } from './BusTemplateFormModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const BATHROOM_LABELS: Record<string, string> = {
  front: 'Adelante',
  middle: 'En medio',
  back: 'Atrás',
};

interface BusTemplateListProps {
  templates: BusTemplate[];
  onBack: () => void;
  onCreate: (data: { name: string; layout: BusLayout }) => Promise<void>;
  onUpdate: (id: string, data: { name?: string; layout?: BusLayout }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const BusTemplateList = ({
  templates,
  onBack,
  onCreate,
  onUpdate,
  onDelete,
}: BusTemplateListProps) => {
  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<BusTemplate | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSave = async (data: { name: string; layout: BusLayout }) => {
    if (editingTemplate) {
      await onUpdate(editingTemplate.id, data);
      toast.success('Plantilla actualizada');
    } else {
      await onCreate(data);
      toast.success('Plantilla creada');
    }
    setEditingTemplate(null);
    setFormOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    try {
      await onDelete(deleteConfirmId);
      toast.success('Plantilla eliminada');
      setDeleteConfirmId(null);
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
      <Button type="button" variant="ghost" onClick={onBack} className="-ml-2 mb-4 gap-2">
        <ArrowLeft />
        Volver a viajes
      </Button>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold">Mis camiones</h2>
          <p className="text-sm text-muted-foreground">Plantillas de camión para reutilizar en tus viajes</p>
        </div>
        <Button type="button" onClick={() => { setEditingTemplate(null); setFormOpen(true); }}>
          <Plus />
          Nueva plantilla
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <Bus className="mx-auto mb-4 size-12 text-muted-foreground" />
          <p className="mb-4 text-sm text-muted-foreground">No tienes plantillas de camión aún.</p>
          <Button type="button" onClick={() => setFormOpen(true)}>
            <Plus />
            Crear primera plantilla
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/15 text-primary">
                  <Bus className="size-5" />
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => { setEditingTemplate(t); setFormOpen(true); }}
                    aria-label="Editar plantilla"
                  >
                    <Pencil />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteConfirmId(t.id)}
                    aria-label="Eliminar plantilla"
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
              <h3 className="mt-4 font-display font-semibold">{t.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {t.totalSeats} plazas · {t.rows} filas · {t.floors} piso{t.floors === 2 ? 's' : ''}
              </p>
              <div className="mt-3 rounded-md bg-muted p-3 text-xs">
                <p>Baño: {BATHROOM_LABELS[t.bathroomPosition] ?? t.bathroomPosition}</p>
                {t.floors === 2 && t.stairsPosition ? (
                  <p className="mt-1">Escaleras: {BATHROOM_LABELS[t.stairsPosition] ?? t.stairsPosition}</p>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}

        <BusTemplateFormModal
          template={editingTemplate}
          open={formOpen}
          onOpenChange={open => { setFormOpen(open); if (!open) setEditingTemplate(null); }}
          onSave={handleSave}
        />

        <AlertDialog open={!!deleteConfirmId} onOpenChange={open => { if (!open) setDeleteConfirmId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar plantilla?</AlertDialogTitle>
              <AlertDialogDescription>
                Los viajes que usen esta plantilla quedarán sin plantilla asignada. Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {isDeleting ? 'Eliminando...' : 'Eliminar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
};
