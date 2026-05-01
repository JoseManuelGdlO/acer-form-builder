import { useState, useEffect, useMemo } from 'react';
import { Group, Client } from '@/types/form';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Search } from 'lucide-react';

interface GroupFormModalProps {
  group?: Group | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { title: string; clientIds: string[] }) => Promise<void>;
  availableClients: Client[];
}

export const GroupFormModal = ({
  group,
  open,
  onOpenChange,
  onSave,
  availableClients,
}: GroupFormModalProps) => {
  const [title, setTitle] = useState('');
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [clientSearch, setClientSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (group) {
      setTitle(group.title);
      setSelectedClientIds(new Set((group.clients ?? []).map(c => c.id)));
    } else {
      setTitle('');
      setSelectedClientIds(new Set());
    }
    setClientSearch('');
    setError('');
    setIsLoading(false);
  }, [group, open]);

  const filteredAvailableClients = useMemo(() => {
    if (!clientSearch.trim()) return availableClients;
    const q = clientSearch.toLowerCase();
    return availableClients.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(clientSearch))
    );
  }, [availableClients, clientSearch]);

  const handleToggleClient = (clientId: string) => {
    setSelectedClientIds(prev => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('El título es obligatorio');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await onSave({ title: title.trim(), clientIds: Array.from(selectedClientIds) });
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Error al guardar el grupo');
      toast.error(err.message || 'Error al guardar el grupo');
    } finally {
      setIsLoading(false);
    }
  };

  const isEditing = !!group;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEditing ? 'Editar grupo' : 'Nuevo grupo'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="group-title" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Título del grupo *
            </Label>
            <Input
              id="group-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ej. Familia Martínez"
              required
            />
          </div>

          <div className="space-y-2 flex-1 min-h-0 flex flex-col">
            <Label>Clientes en el grupo</Label>
            <div className="relative shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, email o teléfono..."
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <ScrollArea className="border rounded-md flex-1 min-h-[120px] max-h-[200px]">
              <div className="p-2 space-y-2">
                {filteredAvailableClients.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    {availableClients.length === 0
                      ? 'No hay clientes disponibles.'
                      : 'No hay resultados para la búsqueda.'}
                  </p>
                ) : (
                  filteredAvailableClients.map(client => (
                    <label
                      key={client.id}
                      className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedClientIds.has(client.id)}
                        onCheckedChange={() => handleToggleClient(client.id)}
                      />
                      <span className="text-sm truncate">{client.name}</span>
                      {client.email && (
                        <span className="text-xs text-muted-foreground truncate">({client.email})</span>
                      )}
                    </label>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear grupo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
