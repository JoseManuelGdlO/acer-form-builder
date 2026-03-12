import { useState } from 'react';
import { BusTemplate, BusLayout } from '@/types/form';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bus, ArrowLeft, Plus, Pencil, Trash2, Droplets, Layers } from 'lucide-react';
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
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <Button variant="ghost" onClick={onBack} className="mb-2 -ml-2 gap-2">
              <ArrowLeft className="w-4 h-4" />
              Volver a Viajes
            </Button>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Bus className="w-8 h-8 text-primary" />
              Mis camiones
            </h1>
            <p className="text-muted-foreground mt-1">
              Plantillas de camión para reutilizar en tus viajes
            </p>
          </div>
          <Button onClick={() => { setEditingTemplate(null); setFormOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" />
            Nueva plantilla
          </Button>
        </div>

        {templates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bus className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No tienes plantillas de camión aún.</p>
              <Button onClick={() => setFormOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Crear primera plantilla
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {templates.map(t => (
              <Card key={t.id} className="group">
                <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Bus className="w-6 h-6 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-lg">{t.name}</h3>
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5" />
                          {t.totalSeats} plazas, {t.rows} filas
                        </span>
                        <span className="flex items-center gap-1">
                          <Droplets className="w-3.5 h-3.5" />
                          Baño: {BATHROOM_LABELS[t.bathroomPosition] ?? t.bathroomPosition}
                        </span>
                        <span>{t.floors} piso{t.floors === 2 ? 's' : ''}</span>
                        {t.floors === 2 && t.stairsPosition && (
                          <span>Escaleras: {BATHROOM_LABELS[t.stairsPosition] ?? t.stairsPosition}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setEditingTemplate(t); setFormOpen(true); }}
                      className="gap-1.5"
                    >
                      <Pencil className="w-4 h-4" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteConfirmId(t.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar
                    </Button>
                  </div>
                </CardContent>
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
    </div>
  );
};
