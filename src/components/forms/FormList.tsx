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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface FormListProps {
  forms: Form[];
  onSelectForm: (formId: string) => void;
  onCreateForm: (name: string, description?: string) => void;
  onDeleteForm: (formId: string) => void;
}

export const FormList = ({ forms, onSelectForm, onCreateForm, onDeleteForm }: FormListProps) => {
  const [search, setSearch] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newFormName, setNewFormName] = useState('');
  const [newFormDescription, setNewFormDescription] = useState('');

  const filteredForms = forms.filter(
    form =>
      form.name.toLowerCase().includes(search.toLowerCase()) ||
      form.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateForm = () => {
    if (newFormName.trim()) {
      onCreateForm(newFormName.trim(), newFormDescription.trim() || undefined);
      setNewFormName('');
      setNewFormDescription('');
      setIsCreateDialogOpen(false);
    }
  };

  const handleDuplicate = (form: Form) => {
    onCreateForm(`${form.name} (copia)`, form.description);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold text-foreground">FormBuilder</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Mis Formularios</h2>
            <p className="text-muted-foreground mt-1">
              Crea y gestiona formularios para tus clientes de visa
            </p>
          </div>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="gradient-primary text-primary-foreground gap-2"
          >
            <Plus className="w-4 h-4" />
            Nuevo Formulario
          </Button>
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
                onEdit={() => onSelectForm(form.id)}
                onDelete={() => onDeleteForm(form.id)}
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
                : 'Crea tu primer formulario para empezar a recopilar información de tus clientes'}
            </p>
            {!search && (
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

      {/* Create Form Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
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
    </div>
  );
};
