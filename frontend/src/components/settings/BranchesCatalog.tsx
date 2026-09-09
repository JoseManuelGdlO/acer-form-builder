import { useEffect, useMemo, useState } from 'react';
import { Building2, Pencil, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import { Branch } from '@/types/settings';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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

export const BranchesCatalog = () => {
  const { token } = useAuth();
  const {
    branches,
    fetchBranches,
    addBranch,
    updateBranch,
    deleteBranch,
    toggleBranch,
  } = useSettingsStore();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Branch | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

  const [newItemName, setNewItemName] = useState('');
  const [editName, setEditName] = useState('');

  useEffect(() => {
    if (token && branches.length === 0) {
      fetchBranches(token).catch((error) => {
        console.error('Failed to fetch branches:', error);
      });
    }
  }, [token]);

  const sortedItems = useMemo(() => {
    return [...branches]
      .filter((item, index, self) => index === self.findIndex((x) => x.id === item.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [branches]);

  const activeCount = sortedItems.filter((b) => b.isActive).length;
  const totalCount = sortedItems.length;

  const handleAdd = async () => {
    const name = newItemName.trim();
    if (!name) {
      toast.error('El nombre de la sucursal es requerido');
      return;
    }

    try {
      await addBranch(name, token, true);
      setNewItemName('');
      setIsAddModalOpen(false);
      toast.success('Sucursal agregada');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error al agregar la sucursal');
    }
  };

  const handleEdit = async () => {
    if (!editingItem) return;
    const name = editName.trim();
    if (!name) {
      toast.error('El nombre de la sucursal es requerido');
      return;
    }

    try {
      await updateBranch(editingItem.id, { name }, token);
      setEditingItem(null);
      setEditName('');
      toast.success('Sucursal actualizada');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error al actualizar la sucursal');
    }
  };

  const handleDelete = async () => {
    if (!deleteItemId) return;
    try {
      await deleteBranch(deleteItemId, token);
      setDeleteItemId(null);
      toast.success('Sucursal desactivada');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error al desactivar la sucursal');
    }
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    try {
      await toggleBranch(id, token);
      toast.success(currentStatus ? 'Sucursal desactivada' : 'Sucursal activada');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error al cambiar el estado');
    }
  };

  return (
    <>
      <Card className="p-5">
        <SectionTitle
          title="Sucursales"
          action="+ Agregar"
          onAction={() => setIsAddModalOpen(true)}
        />
        <p className="mb-1 text-xs text-muted-foreground">
          {activeCount} activas · {totalCount - activeCount} inactivas
        </p>
        {sortedItems.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            <Building2 className="mx-auto mb-3 size-10 opacity-50" />
            <p className="text-sm">No hay sucursales</p>
          </div>
        ) : (
          sortedItems.map((item) => (
            <div key={item.id} className="flex items-center gap-3 border-t py-3">
              <Building2 className="size-4 shrink-0 text-primary" />
              <span className={`min-w-0 flex-1 truncate text-sm ${item.isActive ? '' : 'line-through'}`}>
                {item.name}
              </span>
              <StatusBadge tone={item.isActive ? 'success' : 'neutral'}>
                {item.isActive ? 'Activa' : 'Inactiva'}
              </StatusBadge>
              <Switch
                checked={item.isActive}
                onCheckedChange={() => handleToggle(item.id, item.isActive)}
                aria-label={item.isActive ? 'Desactivar sucursal' : 'Activar sucursal'}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setEditingItem(item);
                  setEditName(item.name);
                }}
                aria-label="Editar sucursal"
              >
                <Pencil />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setDeleteItemId(item.id)}
                className="text-destructive hover:text-destructive"
                aria-label="Desactivar sucursal"
              >
                <Trash2 />
              </Button>
            </div>
          ))
        )}
      </Card>

      <Dialog
        open={isAddModalOpen}
        onOpenChange={(open) => {
          setIsAddModalOpen(open);
          if (!open) setNewItemName('');
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Agregar sucursal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <label className="text-sm font-medium text-foreground">
              Nombre de la sucursal
              <Input
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Ej: CDMX Norte"
                className="mt-1.5"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleAdd}>
              <Save />
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingItem}
        onOpenChange={(open) => {
          if (!open) {
            setEditingItem(null);
            setEditName('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Editar sucursal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <label className="text-sm font-medium text-foreground">
              Nombre de la sucursal
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Ej: CDMX Norte"
                className="mt-1.5"
                onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
              />
            </label>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditingItem(null);
                setEditName('');
              }}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleEdit}>
              <Save />
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteItemId} onOpenChange={() => setDeleteItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">¿Desactivar esta sucursal?</AlertDialogTitle>
            <AlertDialogDescription>
              La sucursal se marcará como inactiva. Los usuarios existentes conservarán su referencia, pero no se usará en nuevas asignaciones.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
