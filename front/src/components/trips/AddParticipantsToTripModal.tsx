import { useState, useMemo } from 'react';
import { Client, StaffMember } from '@/types/form';
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
  availableStaffMembers: StaffMember[];
  totalSeats: number;
  currentCount: number;
  onAdd: (data: { clientIds?: string[]; staffMemberIds?: string[]; companions?: { name: string; phone?: string }[] }) => Promise<void>;
}

export const AddParticipantsToTripModal = ({
  open,
  onOpenChange,
  tripTitle,
  currentParticipantIds,
  availableClients,
  availableStaffMembers,
  totalSeats,
  currentCount,
  onAdd,
}: AddParticipantsToTripModalProps) => {
  const [clientSearch, setClientSearch] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<string>>(new Set());
  const [companions, setCompanions] = useState<Array<{ name: string; phone: string }>>([{ name: '', phone: '' }]);
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
  const filteredStaffMembers = useMemo(() => {
    const list = availableStaffMembers.filter((s) => !currentSet.has(s.id));
    if (!staffSearch.trim()) return list;
    const q = staffSearch.toLowerCase();
    return list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(staffSearch)) ||
        (s.role && s.role.toLowerCase().includes(q))
    );
  }, [availableStaffMembers, currentSet, staffSearch]);
  const toggleStaff = (id: string) => {
    setSelectedStaffIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const validCompanions = companions.filter(c => c.name.trim());
  const countNewClients = selectedClientIds.size + selectedStaffIds.size;
  const countNewCompanions = validCompanions.length;
  const wouldExceed = currentCount + countNewClients + countNewCompanions > totalSeats;

  const handleSubmit = async () => {
    const clientIds = Array.from(selectedClientIds);
    const staffMemberIds = Array.from(selectedStaffIds);
    if (clientIds.length === 0 && staffMemberIds.length === 0 && validCompanions.length === 0) {
      toast.info('Selecciona un cliente o captura al menos un acompañante');
      return;
    }
    if (wouldExceed) {
      toast.error(`Se ha alcanzado el límite de plazas (${totalSeats}). Quedarían ${currentCount + countNewClients}.`);
      return;
    }
    setIsLoading(true);
    try {
      await onAdd({
        clientIds: clientIds.length ? clientIds : undefined,
        staffMemberIds: staffMemberIds.length ? staffMemberIds : undefined,
        companions: validCompanions.length ? validCompanions : undefined,
      });
      setSelectedClientIds(new Set());
      setSelectedStaffIds(new Set());
      setClientSearch('');
      setStaffSearch('');
      setCompanions([{ name: '', phone: '' }]);
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

          <div className="space-y-2">
            <Label>Staff</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar staff..."
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <ScrollArea className="border rounded-md h-[120px]">
              <div className="p-2 space-y-1">
                {filteredStaffMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No hay staff disponible o ya está en el viaje.</p>
                ) : (
                  filteredStaffMembers.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50 cursor-pointer">
                      <Checkbox checked={selectedStaffIds.has(s.id)} onCheckedChange={() => toggleStaff(s.id)} />
                      <span className="text-sm truncate">{s.name}</span>
                      {s.role && <span className="text-xs text-muted-foreground">({s.role})</span>}
                    </label>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="space-y-2">
            <Label>Acompañantes</Label>
            <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
              {companions.map((companion, idx) => (
                <div key={`companion-${idx}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <Input
                    placeholder="Nombre del acompañante"
                    value={companion.name}
                    onChange={(e) =>
                      setCompanions(prev =>
                        prev.map((c, i) => (i === idx ? { ...c, name: e.target.value } : c))
                      )
                    }
                  />
                  <Input
                    placeholder="Teléfono (opcional)"
                    value={companion.phone}
                    onChange={(e) =>
                      setCompanions(prev =>
                        prev.map((c, i) => (i === idx ? { ...c, phone: e.target.value } : c))
                      )
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setCompanions(prev => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)))
                    }
                    disabled={companions.length <= 1}
                  >
                    Quitar
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCompanions(prev => [...prev, { name: '', phone: '' }])}
            >
              Agregar acompañante
            </Button>
          </div>

          {(countNewClients > 0 || countNewCompanions > 0) && (
            <p className="text-sm text-muted-foreground">
              Se agregarán {countNewClients + countNewCompanions} participante(s). Total: {currentCount + countNewClients + countNewCompanions}/{totalSeats}.
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
          <Button type="button" onClick={handleSubmit} disabled={isLoading || wouldExceed}>
            {isLoading ? 'Agregando...' : 'Agregar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
