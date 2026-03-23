import { useState, useEffect } from 'react';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import { useAuth } from '@/contexts/AuthContext';
import { VisaStatusTemplate } from '@/types/settings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
import { Plus, GripVertical, Pencil, Trash2, CheckCircle2, ListChecks, Save, X } from 'lucide-react';
import { toast } from 'sonner';

export const VisaStatusCatalog = () => {
  const {
    visaStatusTemplates,
    addVisaStatusItem,
    updateVisaStatusItem,
    deleteVisaStatusItem,
    toggleVisaStatusItem,
    fetchVisaStatusTemplates,
  } = useSettingsStore();
  const { token } = useAuth();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VisaStatusTemplate | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [newItemLabel, setNewItemLabel] = useState('');
  const [editLabel, setEditLabel] = useState('');

  useEffect(() => {
    if (token && visaStatusTemplates.length === 0) {
      fetchVisaStatusTemplates(token).catch((error) => {
        console.error('Failed to fetch visa status templates:', error);
      });
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeCount = visaStatusTemplates.filter((item) => item.isActive).length;
  const totalCount = visaStatusTemplates.length;

  const handleAddItem = async () => {
    if (!newItemLabel.trim()) {
      toast.error('El nombre del estado es requerido');
      return;
    }
    try {
      await addVisaStatusItem(newItemLabel.trim(), token);
      setNewItemLabel('');
      setIsAddModalOpen(false);
      toast.success('Estado agregado');
    } catch (error: any) {
      toast.error(error.message || 'Error al agregar el estado');
    }
  };

  const handleEditItem = async () => {
    if (!editLabel.trim() || !editingItem) {
      toast.error('El nombre del estado es requerido');
      return;
    }
    try {
      await updateVisaStatusItem(editingItem.id, { label: editLabel.trim() }, token);
      setEditingItem(null);
      setEditLabel('');
      toast.success('Estado actualizado');
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar el estado');
    }
  };

  const handleDeleteItem = async () => {
    if (!deleteItemId) return;
    try {
      await deleteVisaStatusItem(deleteItemId, token);
      setDeleteItemId(null);
      toast.success('Estado eliminado');
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar el estado');
    }
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    try {
      await toggleVisaStatusItem(id, token);
      toast.success(currentStatus ? 'Estado desactivado' : 'Estado activado');
    } catch (error: any) {
      toast.error(error.message || 'Error al cambiar el estado');
    }
  };

  const sortedItems = [...visaStatusTemplates]
    .filter((template, index, self) => index === self.findIndex((t) => t.id === template.id))
    .sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <ListChecks className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalCount}</p>
                <p className="text-sm text-muted-foreground">Total de estados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{activeCount}</p>
                <p className="text-sm text-muted-foreground">Estados activos</p>
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
                <p className="text-sm text-muted-foreground">Estados inactivos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Catálogo de Estados de Visa
            </CardTitle>
            <CardDescription className="mt-1">
              Gestiona los estados de visa que se asignan a cada cliente
            </CardDescription>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Agregar Estado
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {sortedItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ListChecks className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay estados de visa</p>
              <p className="text-sm">Agrega el primer estado para comenzar</p>
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
                  <GripVertical className="w-5 h-5" />
                  <span className="text-sm font-medium w-6">{index + 1}</span>
                </div>
                <div className="flex-1">
                  <p className={`font-medium ${!item.isActive && 'line-through'}`}>{item.label}</p>
                </div>
                <Badge
                  variant={item.isActive ? 'default' : 'secondary'}
                  className={item.isActive ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20' : 'bg-muted text-muted-foreground'}
                >
                  {item.isActive ? 'Activo' : 'Inactivo'}
                </Badge>
                <div className="flex items-center gap-2">
                  <Switch checked={item.isActive} onCheckedChange={() => handleToggle(item.id, item.isActive)} />
                  <Button variant="ghost" size="icon" onClick={() => { setEditingItem(item); setEditLabel(item.label); }} className="h-9 w-9">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteItemId(item.id)} className="h-9 w-9 text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Agregar Estado
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <label className="text-sm font-medium text-foreground">
              Nombre del estado
              <Input
                value={newItemLabel}
                onChange={(e) => setNewItemLabel(e.target.value)}
                placeholder="Ej: Aprobada"
                className="mt-1.5"
                onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
              />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddItem} className="gap-2">
              <Save className="w-4 h-4" />
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              Editar Estado
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <label className="text-sm font-medium text-foreground">
              Nombre del estado
              <Input
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                placeholder="Ej: Aprobada"
                className="mt-1.5"
                onKeyDown={(e) => e.key === 'Enter' && handleEditItem()}
              />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>Cancelar</Button>
            <Button onClick={handleEditItem} className="gap-2">
              <Save className="w-4 h-4" />
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteItemId} onOpenChange={() => setDeleteItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este estado?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El estado será eliminado del catálogo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteItem} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
