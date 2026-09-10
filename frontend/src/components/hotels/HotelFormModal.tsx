import { useEffect, useState } from 'react';
import type { Hotel } from '@/types/hotel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

export interface HotelFormSaveData {
  name: string;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  totalSingleRooms: number;
  totalDoubleRooms: number;
  totalTripleRooms: number;
}

interface HotelFormModalProps {
  open: boolean;
  hotel?: Hotel | null;
  onClose: () => void;
  onSubmit: (data: HotelFormSaveData) => Promise<void>;
}

export const HotelFormModal = ({ open, hotel, onClose, onSubmit }: HotelFormModalProps) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [totalSingleRooms, setTotalSingleRooms] = useState('0');
  const [totalDoubleRooms, setTotalDoubleRooms] = useState('0');
  const [totalTripleRooms, setTotalTripleRooms] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (hotel) {
      setName(hotel.name);
      setAddress(hotel.address ?? '');
      setCity(hotel.city ?? '');
      setCountry(hotel.country ?? '');
      setPhone(hotel.phone ?? '');
      setEmail(hotel.email ?? '');
      setNotes(hotel.notes ?? '');
      setTotalSingleRooms(String(hotel.totalSingleRooms ?? 0));
      setTotalDoubleRooms(String(hotel.totalDoubleRooms ?? 0));
      setTotalTripleRooms(String(hotel.totalTripleRooms ?? 0));
    } else {
      setName('');
      setAddress('');
      setCity('');
      setCountry('');
      setPhone('');
      setEmail('');
      setNotes('');
      setTotalSingleRooms('0');
      setTotalDoubleRooms('0');
      setTotalTripleRooms('0');
    }
  }, [hotel, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const s = parseInt(totalSingleRooms, 10);
    const d = parseInt(totalDoubleRooms, 10);
    const t = parseInt(totalTripleRooms, 10);
    if (Number.isNaN(s) || s < 0 || Number.isNaN(d) || d < 0 || Number.isNaN(t) || t < 0) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        name: trimmed,
        address: address.trim() || null,
        city: city.trim() || null,
        country: country.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        notes: notes.trim() || null,
        totalSingleRooms: s,
        totalDoubleRooms: d,
        totalTripleRooms: t,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isSubmitting && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">{hotel ? 'Editar hotel' : 'Nuevo hotel'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>
              Nombre
              <span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del hotel" required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Ciudad</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ciudad" />
            </div>
            <div className="space-y-2">
              <Label>País</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="País" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Dirección</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Calle, número, colonia…" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
          <div className="space-y-2">
            <p className="font-display text-sm font-semibold">Inventario de habitaciones (catálogo)</p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Sencillas</Label>
                <Input
                  type="number"
                  min={0}
                  value={totalSingleRooms}
                  onChange={(e) => setTotalSingleRooms(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Dobles</Label>
                <Input
                  type="number"
                  min={0}
                  value={totalDoubleRooms}
                  onChange={(e) => setTotalDoubleRooms(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Triples</Label>
                <Input
                  type="number"
                  min={0}
                  value={totalTripleRooms}
                  onChange={(e) => setTotalTripleRooms(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Estos totales limitan cuántas habitaciones de cada tipo puedes reservar al adjuntar el hotel a un viaje.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
