import { useState } from 'react';
import { Plus, Search, FileText } from 'lucide-react';
import { Form } from '@/types/form';
import { FormCard } from './FormCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface FormListProps {
  forms: Form[];
  onSelectForm: (formId: string) => void | Promise<void>;
  onCreateForm: (name: string, description?: string) => void | Promise<void>;
  onDeleteForm: (formId: string) => void | Promise<void>;
  /** Duplicar vía API (copia secciones); preferido frente a crear vacío */
  onDuplicateForm?: (formId: string) => void | Promise<void>;
  /** Revisor: sin crear/eliminar/editar; solo ver público y duplicar */
  readOnly?: boolean;
}

export const FormList = ({
  forms,
  onSelectForm,
  onCreateForm,
  onDeleteForm,
  onDuplicateForm,
  readOnly = false,
}: FormListProps) => {
  const [search, setSearch] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newFormName, setNewFormName] = useState('');
  const [newFormDescription, setNewFormDescription] = useState('');
  const [formToDelete, setFormToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredForms = forms.filter(
    form =>
      form.name.toLowerCase().includes(search.toLowerCase()) ||
      form.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateForm = async () => {
    if (newFormName.trim()) {
      try {
        await onCreateForm(newFormName.trim(), newFormDescription.trim() || undefined);
        setNewFormName('');
        setNewFormDescription('');
        setIsCreateDialogOpen(false);
      } catch (error) {
        console.error('Failed to create form:', error);
      }
    }
  };

  const handleDuplicate = async (form: Form) => {
    try {
      if (onDuplicateForm) {
        await onDuplicateForm(form.id);
      } else {
        await onCreateForm(`${form.name} (copia)`, form.description);
      }
    } catch (error) {
      console.error('Failed to duplicate form:', error);
    }
  };

  const openPublicForm = (formId: string) => {
    window.open(`${window.location.origin}/form/${formId}`, '_blank', 'noopener,noreferrer');
  };

  const handleDelete = (form: Form) => {
    setFormToDelete({ id: form.id, name: form.name });
  };

  const handleConfirmDelete = async () => {
    if (!formToDelete || isDeleting) return;

    setIsDeleting(true);
    try {
      await onDeleteForm(formToDelete.id);
      setFormToDelete(null);
    } catch (error) {
      console.error('Failed to delete form:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-background">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Mis Formularios</h2>
            <p className="text-muted-foreground mt-1">
              {readOnly
                ? 'Consulta y duplica formularios existentes'
                : 'Crea y gestiona formularios para tus clientes de visa'}
            </p>
          </div>
          {!readOnly && (
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="gradient-primary text-primary-foreground gap-2"
            >
              <Plus className="w-4 h-4" />
              Nuevo Formulario
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar formularios..."
            className="pl-10 max-w-md"
          />
        </div>

        {/* Forms Grid */}
        {filteredForms.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredForms.map(form => (
              <FormCard
                key={form.id}
                form={form}
                readOnly={readOnly}
                onViewPublic={() => openPublicForm(form.id)}
                onEdit={() => onSelectForm(form.id)}
                onDelete={() => handleDelete(form)}
                onDuplicate={() => handleDuplicate(form)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 px-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {search ? 'Sin resultados' : 'No tienes formularios'}
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              {search
                ? 'Intenta con otro término de búsqueda'
                : readOnly
                  ? 'No hay formularios disponibles'
                  : 'Crea tu primer formulario para empezar a recopilar información de tus clientes'}
            </p>
            {!search && !readOnly && (
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="gradient-primary text-primary-foreground gap-2"
              >
                <Plus className="w-4 h-4" />
                Crear Formulario
              </Button>
            )}
          </div>
        )}
      </main>

      {/* Create Form Dialog (solo admin) */}
      <Dialog open={!readOnly && isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Formulario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del formulario</Label>
              <Input
                id="name"
                value={newFormName}
                onChange={e => setNewFormName(e.target.value)}
                placeholder="Ej: Solicitud de Visa B1/B2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea
                id="description"
                value={newFormDescription}
                onChange={e => setNewFormDescription(e.target.value)}
                placeholder="Describe el propósito de este formulario..."
                className="min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateForm}
              disabled={!newFormName.trim()}
              className="gradient-primary text-primary-foreground"
            >
              Crear Formulario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!formToDelete}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setFormToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar formulario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El formulario
              {formToDelete ? ` "${formToDelete.name}"` : ''} se marcará como eliminado y dejará de estar disponible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
