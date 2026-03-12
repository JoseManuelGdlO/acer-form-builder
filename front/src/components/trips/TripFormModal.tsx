import { useState, useEffect } from 'react';
import { Trip, BusTemplate } from '@/types/form';
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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, Users } from 'lucide-react';

interface TripFormModalProps {
  trip?: Trip | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    title: string;
    destination?: string;
    departureDate: string;
    returnDate: string;
    notes?: string;
    totalSeats: number;
    invitedCompanyIds?: string[];
    busTemplateId?: string | null;
  }) => Promise<void>;
  companiesForInvite: { id: string; name: string }[];
  busTemplates?: BusTemplate[];
}

export const TripFormModal = ({
  trip,
  open,
  onOpenChange,
  onSave,
  companiesForInvite,
  busTemplates = [],
}: TripFormModalProps) => {
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [notes, setNotes] = useState('');
  const [totalSeats, setTotalSeats] = useState(30);
  const [busTemplateId, setBusTemplateId] = useState<string | null>(null);
  const [invitedCompanyIds, setInvitedCompanyIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (trip) {
      setTitle(trip.title);
      setDestination(trip.destination ?? '');
      setDepartureDate(trip.departureDate ? trip.departureDate.slice(0, 10) : '');
      setReturnDate(trip.returnDate ? trip.returnDate.slice(0, 10) : '');
      setNotes(trip.notes ?? '');
      setTotalSeats(trip.totalSeats);
      setBusTemplateId(trip.busTemplateId ?? null);
      setInvitedCompanyIds(new Set((trip.sharedCompanies ?? []).map(c => c.id)));
    } else {
      setTitle('');
      setDestination('');
      const today = new Date().toISOString().slice(0, 10);
      setDepartureDate(today);
      setReturnDate(today);
      setNotes('');
      setTotalSeats(30);
      setBusTemplateId(null);
      setInvitedCompanyIds(new Set());
    }
    setError('');
    setIsLoading(false);
  }, [trip, open]);

  const handleToggleCompany = (id: string) => {
    setInvitedCompanyIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('El título es obligatorio');
      return;
    }
    if (!departureDate || !returnDate) {
      setError('Fechas de partida y regreso son obligatorias');
      return;
    }
    if (new Date(returnDate) < new Date(departureDate)) {
      setError('La fecha de regreso debe ser posterior a la de partida');
      return;
    }
    if (totalSeats < 1) {
      setError('El número de plazas debe ser al menos 1');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await onSave({
        title: title.trim(),
        destination: destination.trim() || undefined,
        departureDate,
        returnDate,
        notes: notes.trim() || undefined,
        totalSeats,
        invitedCompanyIds: Array.from(invitedCompanyIds),
        busTemplateId: busTemplateId || null,
      });
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Error al guardar el viaje');
    } finally {
      setIsLoading(false);
    }
  };

  const isEditing = !!trip;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEditing ? 'Editar viaje' : 'Nuevo viaje'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="trip-title">Título del viaje *</Label>
            <Input
              id="trip-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ej. Viaje a consulado enero"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="trip-destination" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Destino
            </Label>
            <Input
              id="trip-destination"
              value={destination}
              onChange={e => setDestination(e.target.value)}
              placeholder="Ej. Ciudad de México"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="trip-departure">Fecha partida *</Label>
              <Input
                id="trip-departure"
                type="date"
                value={departureDate}
                onChange={e => setDepartureDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trip-return">Fecha regreso *</Label>
              <Input
                id="trip-return"
                type="date"
                value={returnDate}
                onChange={e => setReturnDate(e.target.value)}
                required
              />
            </div>
          </div>

          {busTemplates.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="trip-bus-template">Usar plantilla de camión</Label>
              <select
                id="trip-bus-template"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={busTemplateId ?? ''}
                onChange={e => {
                  const id = e.target.value || null;
                  setBusTemplateId(id);
                  if (id) {
                    const t = busTemplates.find(x => x.id === id);
                    if (t) setTotalSeats(t.totalSeats);
                  }
                }}
              >
                <option value="">Ninguna</option>
                {busTemplates.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.totalSeats} plazas)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="trip-seats" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Plazas del camión *
            </Label>
            <Input
              id="trip-seats"
              type="number"
              min={1}
              value={totalSeats}
              onChange={e => setTotalSeats(Number(e.target.value) || 1)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="trip-notes">Notas</Label>
            <Textarea
              id="trip-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Notas adicionales..."
              rows={2}
              className="resize-none"
            />
          </div>

          {companiesForInvite.length > 0 && (
            <div className="space-y-2 flex-1 min-h-0 flex flex-col">
              <Label>Invitar a compañías</Label>
              <ScrollArea className="border rounded-md flex-1 min-h-[80px] max-h-[120px]">
                <div className="p-2 space-y-2">
                  {companiesForInvite.map(c => (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={invitedCompanyIds.has(c.id)}
                        onCheckedChange={() => handleToggleCompany(c.id)}
                      />
                      <span className="text-sm">{c.name}</span>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

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
              {isLoading ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear viaje'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
