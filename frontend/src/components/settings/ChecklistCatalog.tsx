import { useState, useEffect } from 'react';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import { useAuth } from '@/contexts/AuthContext';
import { ChecklistTemplate } from '@/types/settings';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { SectionTitle } from '@/components/layout/SectionTitle';
import { StatusBadge } from '@/components/layout/StatusBadge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { GripVertical, Pencil, Trash2, ListChecks, Save } from 'lucide-react';
import { toast } from 'sonner';

export const ChecklistCatalog = () => {
  const {
    checklistTemplates,
    addChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
    toggleChecklistItem,
    fetchChecklistTemplates,
  } = useSettingsStore();
  const { token } = useAuth();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ChecklistTemplate | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [newItemLabel, setNewItemLabel] = useState('');
  const [editLabel, setEditLabel] = useState('');

  useEffect(() => {
    if (token && checklistTemplates.length === 0) {
      fetchChecklistTemplates(token).catch((error) => {
        console.error('Failed to fetch checklist templates:', error);
      });
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeCount = checklistTemplates.filter((item) => item.isActive).length;
  const totalCount = checklistTemplates.length;

  const handleAddItem = async () => {
    if (!newItemLabel.trim()) {
      toast.error('El nombre del paso es requerido');
      return;
    }
    try {
      await addChecklistItem(newItemLabel.trim(), token);
      setNewItemLabel('');
      setIsAddModalOpen(false);
      toast.success('Paso agregado al checklist');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error al agregar el paso');
    }
  };

  const handleEditItem = async () => {
    if (!editLabel.trim() || !editingItem) {
      toast.error('El nombre del paso es requerido');
      return;
    }
    try {
      await updateChecklistItem(editingItem.id, { label: editLabel.trim() }, token);
      setEditingItem(null);
      setEditLabel('');
      toast.success('Paso actualizado');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error al actualizar el paso');
    }
  };

  const handleDeleteItem = async () => {
    if (deleteItemId) {
      try {
        await deleteChecklistItem(deleteItemId, token);
        setDeleteItemId(null);
        toast.success('Paso eliminado del checklist');
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : 'Error al eliminar el paso');
      }
    }
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    try {
      await toggleChecklistItem(id, token);
      toast.success(currentStatus ? 'Paso desactivado' : 'Paso activado');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error al cambiar el estado del paso');
    }
  };

  const openEditModal = (item: ChecklistTemplate) => {
    setEditingItem(item);
    setEditLabel(item.label);
  };

  const sortedItems = [...checklistTemplates]
    .filter((template, index, self) => index === self.findIndex((t) => t.id === template.id))
    .sort((a, b) => a.order - b.order);

  return (
    <>
      <Card className="p-5">
        <SectionTitle
          title="Catálogo de checklist"
          action="+ Agregar"
          onAction={() => setIsAddModalOpen(true)}
        />
        <p className="mb-1 text-xs text-muted-foreground">
          {activeCount} activos · {totalCount - activeCount} inactivos
        </p>
        {sortedItems.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            <ListChecks className="mx-auto mb-3 size-10 opacity-50" />
            <p className="text-sm">No hay pasos en el checklist</p>
          </div>
        ) : (
          sortedItems.map((item, index) => (
            <div key={item.id} className="flex items-center gap-3 border-t py-3">
              <GripVertical className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="grid size-5 shrink-0 place-items-center rounded bg-secondary/30 text-[10px] font-bold">
                {index + 1}
              </span>
              <span className={`min-w-0 flex-1 truncate text-sm ${item.isActive ? '' : 'line-through'}`}>
                {item.label}
              </span>
              <StatusBadge tone={item.isActive ? 'success' : 'neutral'}>
                {item.isActive ? 'Activo' : 'Inactivo'}
              </StatusBadge>
              <Switch
                checked={item.isActive}
                onCheckedChange={() => handleToggle(item.id, item.isActive)}
                aria-label={item.isActive ? 'Desactivar paso' : 'Activar paso'}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => openEditModal(item)}
                aria-label="Editar paso"
              >
                <Pencil />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setDeleteItemId(item.id)}
                className="text-destructive hover:text-destructive"
                aria-label="Eliminar paso"
              >
                <Trash2 />
              </Button>
            </div>
          ))
        )}
      </Card>

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Agregar nuevo paso</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground">Nombre del paso</label>
              <Input
                value={newItemLabel}
                onChange={(e) => setNewItemLabel(e.target.value)}
                placeholder="Ej: Revisión de documentos"
                className="mt-1.5"
                onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleAddItem}>
              <Save />
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Editar paso</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground">Nombre del paso</label>
              <Input
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                placeholder="Ej: Revisión de documentos"
                className="mt-1.5"
                onKeyDown={(e) => e.key === 'Enter' && handleEditItem()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditingItem(null)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleEditItem}>
              <Save />
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteItemId} onOpenChange={() => setDeleteItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">¿Eliminar este paso?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El paso será eliminado del catálogo y no aparecerá en los checklists de nuevos clientes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItem}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
