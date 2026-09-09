import { useState } from 'react';
import { Plus, FileText } from 'lucide-react';
import { Form } from '@/types/form';
import { FormCard } from './FormCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Toolbar } from '@/components/layout/Toolbar';
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
    <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
      <Toolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Buscar formulario…"
      >
        {readOnly ? null : (
          <Button type="button" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus />
            Nuevo formulario
          </Button>
        )}
      </Toolbar>

      {filteredForms.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted/50">
            <FileText className="size-8 text-muted-foreground" />
          </div>
          <h3 className="mb-1 font-display text-lg font-semibold text-foreground">
            {search ? 'Sin resultados' : 'No hay formularios'}
          </h3>
          <p className="mb-4 text-sm text-muted-foreground">
            {search
              ? 'No se encontraron formularios con ese término'
              : readOnly
                ? 'No hay formularios disponibles'
                : 'Crea el primero para recopilar información de tus clientes'}
          </p>
          {!search && !readOnly ? (
            <Button type="button" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus />
              Crear formulario
            </Button>
          ) : null}
        </div>
      )}

      <Dialog open={!readOnly && isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Nuevo formulario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del formulario</Label>
              <Input
                id="name"
                value={newFormName}
                onChange={e => setNewFormName(e.target.value)}
                placeholder="Ej: Registro de pasajero"
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
            <Button onClick={handleCreateForm} disabled={!newFormName.trim()}>
              Crear formulario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <AlertDialogTitle className="font-display">¿Eliminar formulario?</AlertDialogTitle>
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
