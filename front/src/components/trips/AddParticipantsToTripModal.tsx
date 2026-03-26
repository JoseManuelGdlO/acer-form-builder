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
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, UserPlus } from 'lucide-react';

interface AddParticipantsToTripModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripTitle: string;
  currentParticipantIds: string[];
  availableClients: Client[];
  totalSeats: number;
  currentCount: number;
  onAdd: (data: { clientIds?: string[] }) => Promise<void>;
}

export const AddParticipantsToTripModal = ({
  open,
  onOpenChange,
  tripTitle,
  currentParticipantIds,
  availableClients,
  totalSeats,
  currentCount,
  onAdd,
}: AddParticipantsToTripModalProps) => {
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const currentSet = useMemo(() => new Set(currentParticipantIds), [currentParticipantIds]);
  const candidateClients = useMemo(
    () => availableClients.filter(c => !currentSet.has(c.id)),
    [availableClients, currentSet]
  );

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return candidateClients;
    const q = clientSearch.toLowerCase();
    return candidateClients.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(clientSearch))
    );
  }, [candidateClients, clientSearch]);

  const toggleClient = (id: string) => {
    setSelectedClientIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const countNewClients = selectedClientIds.size;
  const wouldExceed = currentCount + countNewClients > totalSeats;

  const handleSubmit = async () => {
    const clientIds = Array.from(selectedClientIds);
    if (clientIds.length === 0) {
      toast.info('Selecciona al menos un cliente');
      return;
    }
    if (wouldExceed) {
      toast.error(`Se ha alcanzado el límite de plazas (${totalSeats}). Quedarían ${currentCount + countNewClients}.`);
      return;
    }
    setIsLoading(true);
    try {
      await onAdd({ clientIds: clientIds.length ? clientIds : undefined });
      setSelectedClientIds(new Set());
      setClientSearch('');
      onOpenChange(false);
      toast.success('Participantes agregados al viaje');
    } catch (err: any) {
      toast.error(err.message || 'Error al agregar participantes');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">Agregar participantes a &quot;{tripTitle}&quot;</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Plazas: {currentCount}/{totalSeats}. Al seleccionar un cliente principal, se incluiran automaticamente sus hijos.
        </p>

        <div className="space-y-4 flex-1 min-h-0 flex flex-col">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Clientes
            </Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente..."
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <ScrollArea className="border rounded-md h-[120px]">
              <div className="p-2 space-y-1">
                {filteredClients.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No hay clientes disponibles o ya están en el viaje.</p>
                ) : (
                  filteredClients.map(c => (
                    <label key={c.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50 cursor-pointer">
                      <Checkbox checked={selectedClientIds.has(c.id)} onCheckedChange={() => toggleClient(c.id)} />
                      <span className="text-sm truncate">{c.name}</span>
                    </label>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {countNewClients > 0 && (
            <p className="text-sm text-muted-foreground">
              Se agregarán {countNewClients} participante(s). Total: {currentCount + countNewClients}/{totalSeats}.
              {wouldExceed && (
                <span className="text-destructive block mt-1">Supera el límite de plazas.</span>
              )}
            </p>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isLoading || selectedClientIds.size === 0 || wouldExceed}>
            {isLoading ? 'Agregando...' : 'Agregar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
