import { useEffect, useMemo, useState } from 'react';
import { Building2, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import { Branch } from '@/types/settings';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalCount}</p>
                <p className="text-sm text-muted-foreground">Total de sucursales</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <span className="text-green-500 font-bold text-lg">✓</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{activeCount}</p>
                <p className="text-sm text-muted-foreground">Sucursales activas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                <X className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalCount - activeCount}</p>
                <p className="text-sm text-muted-foreground">Sucursales inactivas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Catálogo de Sucursales
            </CardTitle>
            <CardDescription className="mt-1">
              Gestiona las sucursales para asignarlas a usuarios y filtrar métricas.
            </CardDescription>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Agregar Sucursal
          </Button>
        </CardHeader>

        <CardContent className="space-y-3">
          {sortedItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay sucursales</p>
              <p className="text-sm">Agrega la primera sucursal para comenzar</p>
            </div>
          ) : (
            sortedItems.map((item, index) => (
              <div
                key={item.id}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                  item.isActive ? 'border-border/50 bg-card hover:border-primary/30' : 'border-border/30 bg-muted/20 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3 text-muted-foreground cursor-grab">
                  <span className="text-sm font-medium w-6">{index + 1}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${!item.isActive && 'line-through'}`}>{item.name}</p>
                </div>

                <Badge
                  variant={item.isActive ? 'default' : 'secondary'}
                  className={item.isActive ? '' : 'bg-muted text-muted-foreground'}
                >
                  {item.isActive ? 'Activo' : 'Inactivo'}
                </Badge>

                <div className="flex items-center gap-2">
                  <Switch checked={item.isActive} onCheckedChange={() => handleToggle(item.id, item.isActive)} />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingItem(item);
                      setEditName(item.name);
                    }}
                    className="h-9 w-9"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteItemId(item.id)}
                    className="h-9 w-9 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
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
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Agregar Sucursal
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAdd} className="gap-2">
              <Save className="w-4 h-4" />
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
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              Editar Sucursal
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
              variant="outline"
              onClick={() => {
                setEditingItem(null);
                setEditName('');
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleEdit} className="gap-2">
              <Save className="w-4 h-4" />
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteItemId} onOpenChange={() => setDeleteItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar esta sucursal?</AlertDialogTitle>
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
    </div>
  );
};

