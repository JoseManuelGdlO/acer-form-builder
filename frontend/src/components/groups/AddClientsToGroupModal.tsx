import { useState, useMemo } from 'react';
import { Client } from '@/types/form';
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
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, UserPlus } from 'lucide-react';

interface AddClientsToGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupTitle: string;
  currentClientIds: string[];
  availableClients: Client[];
  onAdd: (clientIds: string[]) => Promise<void>;
}

export const AddClientsToGroupModal = ({
  open,
  onOpenChange,
  groupTitle,
  currentClientIds,
  availableClients,
  onAdd,
}: AddClientsToGroupModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const currentSet = useMemo(() => new Set(currentClientIds), [currentClientIds]);
  const candidates = useMemo(
    () => availableClients.filter(c => !currentSet.has(c.id)),
    [availableClients, currentSet]
  );

  const filteredCandidates = useMemo(() => {
    if (!searchQuery.trim()) return candidates;
    const q = searchQuery.toLowerCase();
    return candidates.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(searchQuery))
    );
  }, [candidates, searchQuery]);

  const handleToggle = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    const toAdd = Array.from(selectedIds);
    if (toAdd.length === 0) {
      toast.info('Selecciona al menos un cliente');
      return;
    }
    setIsLoading(true);
    try {
      await onAdd(toAdd);
      setSelectedIds(new Set());
      setSearchQuery('');
      onOpenChange(false);
      toast.success(`${toAdd.length} cliente(s) agregado(s) al grupo`);
    } catch (err: any) {
      toast.error(err.message || 'Error al agregar clientes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSearchQuery('');
      setSelectedIds(new Set());
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <UserPlus className="size-5" />
            Agregar clientes a {groupTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-2 flex flex-col flex-1 min-h-0">
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, email o teléfono..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="text-sm text-muted-foreground">
            {filteredCandidates.length === 0
              ? candidates.length === 0
                ? 'No hay más clientes disponibles para agregar.'
                : 'No hay resultados para la búsqueda.'
              : `${filteredCandidates.length} cliente(s) disponible(s)`}
          </div>

          <ScrollArea className="min-h-[160px] max-h-[280px] flex-1 rounded-md border border-border">
            <div className="space-y-1 p-2">
              {filteredCandidates.map(client => (
                <label
                  key={client.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 hover:bg-muted/50"
                >
                  <Checkbox
                    checked={selectedIds.has(client.id)}
                    onCheckedChange={() => handleToggle(client.id)}
                  />
                  <span className="text-sm font-medium truncate">{client.name}</span>
                  {client.email && (
                    <span className="text-xs text-muted-foreground truncate">{client.email}</span>
                  )}
                </label>
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || selectedIds.size === 0}>
            {isLoading ? 'Agregando...' : `Agregar (${selectedIds.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
