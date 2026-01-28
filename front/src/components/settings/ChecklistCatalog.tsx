import { useState, useEffect } from 'react';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import { useAuth } from '@/contexts/AuthContext';
import { ChecklistTemplate } from '@/types/settings';
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
import { 
  Plus, GripVertical, Pencil, Trash2, CheckSquare, 
  ListChecks, Save, X 
} from 'lucide-react';
import { toast } from 'sonner';

export const ChecklistCatalog = () => {
  const { 
    checklistTemplates, 
    addChecklistItem, 
    updateChecklistItem, 
    deleteChecklistItem,
    toggleChecklistItem,
    fetchChecklistTemplates,
    isLoading
  } = useSettingsStore();
  const { token } = useAuth();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ChecklistTemplate | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [newItemLabel, setNewItemLabel] = useState('');
  const [editLabel, setEditLabel] = useState('');

  // Load checklist templates on mount
  useEffect(() => {
    if (token && checklistTemplates.length === 0) {
      fetchChecklistTemplates(token).catch((error) => {
        console.error('Failed to fetch checklist templates:', error);
      });
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeCount = checklistTemplates.filter(item => item.isActive).length;
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
    } catch (error: any) {
      toast.error(error.message || 'Error al agregar el paso');
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
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar el paso');
    }
  };

  const handleDeleteItem = async () => {
    if (deleteItemId) {
      try {
        await deleteChecklistItem(deleteItemId, token);
        setDeleteItemId(null);
        toast.success('Paso eliminado del checklist');
      } catch (error: any) {
        toast.error(error.message || 'Error al eliminar el paso');
      }
    }
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    try {
      await toggleChecklistItem(id, token);
      toast.success(currentStatus ? 'Paso desactivado' : 'Paso activado');
    } catch (error: any) {
      toast.error(error.message || 'Error al cambiar el estado del paso');
    }
  };

  const openEditModal = (item: ChecklistTemplate) => {
    setEditingItem(item);
    setEditLabel(item.label);
  };

  // Remove duplicates by id and sort
  const sortedItems = [...checklistTemplates]
    .filter((template, index, self) => 
      index === self.findIndex(t => t.id === template.id)
    )
    .sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <ListChecks className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalCount}</p>
                <p className="text-sm text-muted-foreground">Total de pasos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <CheckSquare className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{activeCount}</p>
                <p className="text-sm text-muted-foreground">Pasos activos</p>
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
                <p className="text-sm text-muted-foreground">Pasos inactivos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Checklist Items Card */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-primary" />
              Catálogo de Checklist
            </CardTitle>
            <CardDescription className="mt-1">
              Gestiona los pasos del checklist que se aplicarán a todos los clientes
            </CardDescription>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Agregar Paso
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {sortedItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ListChecks className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay pasos en el checklist</p>
              <p className="text-sm">Agrega el primer paso para comenzar</p>
            </div>
          ) : (
            sortedItems.map((item, index) => (
              <div
                key={item.id}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                  item.isActive 
                    ? 'border-border/50 bg-card hover:border-primary/30' 
                    : 'border-border/30 bg-muted/20 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3 text-muted-foreground cursor-grab">
                  <GripVertical className="w-5 h-5" />
                  <span className="text-sm font-medium w-6">{index + 1}</span>
                </div>
                
                <div className="flex-1">
                  <p className={`font-medium ${!item.isActive && 'line-through'}`}>
                    {item.label}
                  </p>
                </div>

                <Badge 
                  variant={item.isActive ? 'default' : 'secondary'}
                  className={item.isActive 
                    ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20' 
                    : 'bg-muted text-muted-foreground'
                  }
                >
                  {item.isActive ? 'Activo' : 'Inactivo'}
                </Badge>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={item.isActive}
                    onCheckedChange={() => handleToggle(item.id, item.isActive)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditModal(item)}
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

      {/* Add Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Agregar Nuevo Paso
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-foreground">
                Nombre del paso
              </label>
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
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddItem} className="gap-2">
              <Save className="w-4 h-4" />
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              Editar Paso
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-foreground">
                Nombre del paso
              </label>
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
            <Button variant="outline" onClick={() => setEditingItem(null)}>
              Cancelar
            </Button>
            <Button onClick={handleEditItem} className="gap-2">
              <Save className="w-4 h-4" />
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteItemId} onOpenChange={() => setDeleteItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este paso?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El paso será eliminado del catálogo 
              y no aparecerá en los checklists de nuevos clientes.
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
    </div>
  );
};
