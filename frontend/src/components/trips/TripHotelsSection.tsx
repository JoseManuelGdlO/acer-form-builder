import { useMemo, useState } from 'react';
import type { Trip } from '@/types/form';
import type { Hotel, TripHotelBooking, TripHotelRoomRow, TripHotelRoomType } from '@/types/hotel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Plus, Pencil, Trash2, Users, BedDouble } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

function roomCap(t: TripHotelRoomType): number {
  if (t === 'single') return 1;
  if (t === 'double') return 2;
  return 3;
}

function participantDisplayName(
  trip: Trip,
  participantId: string
): string {
  const p = trip.participants?.find((x) => x.id === participantId);
  if (!p) return participantId.slice(0, 8);
  if (p.participantType === 'companion') return p.companion?.name ?? 'Acompañante';
  if (p.participantType === 'staff') return p.staffMember?.name ?? 'Staff';
  return p.client?.name ?? 'Cliente';
}

interface TripHotelsSectionProps {
  trip: Trip;
  catalogHotels: Hotel[];
  /** Puede agregar/editar hoteles y asignar habitaciones */
  canManage: boolean;
  onRefreshCatalog?: () => Promise<void>;
  onAttach?: (data: {
    hotelId: string;
    checkInDate: string;
    checkOutDate: string;
    reservedSingles: number;
    reservedDoubles: number;
    reservedTriples: number;
    notes?: string | null;
  }) => Promise<void>;
  onUpdate?: (
    tripHotelId: string,
    data: {
      checkInDate?: string;
      checkOutDate?: string;
      reservedSingles?: number;
      reservedDoubles?: number;
      reservedTriples?: number;
      notes?: string | null;
    }
  ) => Promise<void>;
  onDetach?: (tripHotelId: string) => Promise<void>;
  onAssignRoom?: (tripHotelId: string, roomId: string, participantId: string) => Promise<void>;
  onClearRoom?: (tripHotelId: string, roomId: string, participantId: string) => Promise<void>;
  /** Sin Card envolvente (el tab del detalle ya la aporta). */
  embedded?: boolean;
}

export const TripHotelsSection = ({
  trip,
  catalogHotels,
  canManage,
  onRefreshCatalog,
  onAttach,
  onUpdate,
  onDetach,
  onAssignRoom,
  onClearRoom,
  embedded = false,
}: TripHotelsSectionProps) => {
  const stays = trip.tripHotels ?? [];
  const [attachOpen, setAttachOpen] = useState(false);
  const [editStay, setEditStay] = useState<TripHotelBooking | null>(null);
  const [roomDialog, setRoomDialog] = useState<{ stay: TripHotelBooking; room: TripHotelRoomRow } | null>(null);

  const [hotelId, setHotelId] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [rs, setRs] = useState('1');
  const [rd, setRd] = useState('0');
  const [rt, setRt] = useState('0');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const selectedHotel = useMemo(() => catalogHotels.find((h) => h.id === hotelId), [catalogHotels, hotelId]);

  const openAttach = async () => {
    setHotelId('');
    setCheckIn(trip.departureDate?.slice(0, 10) ?? '');
    setCheckOut(trip.returnDate?.slice(0, 10) ?? '');
    setRs('1');
    setRd('0');
    setRt('0');
    setNotes('');
    setAttachOpen(true);
    try {
      await onRefreshCatalog?.();
    } catch {
      /* ignore */
    }
  };

  const submitAttach = async () => {
    if (!hotelId) {
      toast.error('Selecciona un hotel');
      return;
    }
    const nS = parseInt(rs, 10);
    const nD = parseInt(rd, 10);
    const nT = parseInt(rt, 10);
    if (Number.isNaN(nS) || Number.isNaN(nD) || Number.isNaN(nT) || nS + nD + nT < 1) {
      toast.error('Indica al menos una habitación reservada');
      return;
    }
    if (!selectedHotel) return;
    if (nS > selectedHotel.totalSingleRooms || nD > selectedHotel.totalDoubleRooms || nT > selectedHotel.totalTripleRooms) {
      toast.error('Las cantidades superan el inventario del hotel en el catálogo');
      return;
    }
    if (!checkIn || !checkOut || checkIn > checkOut) {
      toast.error('Revisa las fechas de entrada y salida');
      return;
    }
    if (!onAttach) return;
    setBusy(true);
    try {
      await onAttach({
        hotelId,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        reservedSingles: nS,
        reservedDoubles: nD,
        reservedTriples: nT,
        notes: notes.trim() || null,
      });
      toast.success('Hotel agregado al viaje');
      setAttachOpen(false);
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo agregar el hotel');
    } finally {
      setBusy(false);
    }
  };

  const submitEdit = async () => {
    if (!editStay) return;
    const nS = parseInt(rs, 10);
    const nD = parseInt(rd, 10);
    const nT = parseInt(rt, 10);
    if (Number.isNaN(nS) || Number.isNaN(nD) || Number.isNaN(nT) || nS + nD + nT < 1) {
      toast.error('Indica al menos una habitación reservada');
      return;
    }
    const h = editStay.hotel;
    if (h && (nS > h.totalSingleRooms || nD > h.totalDoubleRooms || nT > h.totalTripleRooms)) {
      toast.error('Las cantidades superan el inventario del hotel');
      return;
    }
    if (!checkIn || !checkOut || checkIn > checkOut) {
      toast.error('Revisa las fechas');
      return;
    }
    if (!onUpdate) return;
    setBusy(true);
    try {
      await onUpdate(editStay.id, {
        checkInDate: checkIn,
        checkOutDate: checkOut,
        reservedSingles: nS,
        reservedDoubles: nD,
        reservedTriples: nT,
        notes: notes.trim() || null,
      });
      toast.success('Reserva actualizada');
      setEditStay(null);
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo actualizar');
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (stay: TripHotelBooking) => {
    setEditStay(stay);
    setCheckIn(stay.checkInDate.slice(0, 10));
    setCheckOut(stay.checkOutDate.slice(0, 10));
    setRs(String(stay.reservedSingles));
    setRd(String(stay.reservedDoubles));
    setRt(String(stay.reservedTriples));
    setNotes(stay.notes ?? '');
  };

  const confirmDetach = async (stay: TripHotelBooking) => {
    const name = stay.hotel?.name ?? 'este hotel';
    if (!window.confirm(`¿Quitar ${name} de este viaje? Se perderán las asignaciones de habitaciones.`)) return;
    if (!onDetach) return;
    setBusy(true);
    try {
      await onDetach(stay.id);
      toast.success('Hotel quitado del viaje');
    } catch (e: any) {
      toast.error(e?.message || 'Error al quitar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        {!embedded ? (
          <h2 className="flex items-center gap-2 font-display text-base font-semibold">
            <Building2 className="size-5" />
            Hoteles
          </h2>
        ) : (
          <p className="text-sm text-muted-foreground">
            {stays.length === 0 ? 'Aún no hay hoteles en este viaje.' : `${stays.length} hotel(es) asignado(s)`}
          </p>
        )}
        {canManage && onAttach && !embedded ? (
          <Button type="button" size="sm" onClick={openAttach} disabled={busy}>
            <Plus />
            Agregar hotel
          </Button>
        ) : null}
      </div>
      {catalogHotels.length === 0 && canManage ? (
        <p className="mb-3 text-sm text-muted-foreground">
          No hay hoteles en el catálogo o no tienes permiso para verlos. Crea hoteles en la sección Hoteles.
        </p>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        {stays.map((stay) => {
          const h = stay.hotel;
          const loc = [h?.city, h?.country].filter(Boolean).join(', ') || h?.address;
          const roomCount = stay.rooms?.length ?? stay.reservedSingles + stay.reservedDoubles + stay.reservedTriples;
          const guestCount = (stay.rooms ?? []).reduce(
            (n, room) => n + (room.assignments?.length ?? 0),
            0,
          );
          return (
            <div key={stay.id} className="rounded-md bg-muted p-4">
              <BedDouble className="size-5 text-primary" />
              <div className="mt-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-display font-semibold">{h?.name ?? 'Hotel'}</h3>
                  {loc ? <p className="mt-1 text-xs text-muted-foreground">{loc}</p> : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {format(parseISO(stay.checkInDate), 'dd MMM yyyy', { locale: es })} →{' '}
                    {format(parseISO(stay.checkOutDate), 'dd MMM yyyy', { locale: es })}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {roomCount} habitaciones · {guestCount} huéspedes
                  </p>
                  {stay.notes ? <p className="mt-2 text-sm">{stay.notes}</p> : null}
                </div>
                {canManage && (onUpdate || onDetach) ? (
                  <div className="flex gap-1">
                    {onUpdate ? (
                      <Button type="button" variant="outline" size="sm" onClick={() => openEdit(stay)}>
                        <Pencil />
                        Editar
                      </Button>
                    ) : null}
                    {onDetach ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => confirmDetach(stay)}
                        disabled={busy}
                      >
                        <Trash2 />
                        Quitar
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {(stay.rooms ?? []).map((room) => {
                  const cap = roomCap(room.roomType);
                  const assigned = room.assignments ?? [];
                  const full = assigned.length >= cap;
                  return (
                    <button
                      key={room.id}
                      type="button"
                      disabled={(!canManage || !onAssignRoom || !onClearRoom) && assigned.length === 0}
                      onClick={() => {
                        if ((!canManage || !onAssignRoom || !onClearRoom) && assigned.length === 0) return;
                        setRoomDialog({ stay, room });
                      }}
                      className={`rounded-md border bg-card p-2.5 text-left text-sm transition-colors ${
                        (canManage && onAssignRoom && onClearRoom) || assigned.length > 0
                          ? 'cursor-pointer hover:bg-accent/50'
                          : 'opacity-80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-medium">{room.label}</span>
                        <Badge variant={full ? 'default' : 'secondary'} className="shrink-0 text-[10px]">
                          {assigned.length}/{cap}
                        </Badge>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {assigned.length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            {canManage && onAssignRoom ? 'Clic para asignar' : 'Vacía'}
                          </span>
                        ) : (
                          assigned.map((a) => (
                            <Badge key={a.id} variant="outline" className="max-w-full truncate text-[10px] font-normal">
                              {participantDisplayName(trip, a.participantId)}
                            </Badge>
                          ))
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {canManage && onAttach ? (
          <button
            type="button"
            onClick={openAttach}
            disabled={busy}
            className="rounded-md border border-dashed p-4 text-center hover:bg-muted/50"
          >
            <Plus className="mx-auto size-5" />
            <p className="mt-2 text-xs">Asignar otro hotel</p>
          </button>
        ) : stays.length === 0 ? (
          <p className="col-span-full py-4 text-center text-sm text-muted-foreground">
            Aún no hay hoteles asignados a este viaje.
          </p>
        ) : null}
      </div>

      <Dialog open={attachOpen} onOpenChange={setAttachOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Agregar hotel al viaje</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Hotel</Label>
              <Select value={hotelId || undefined} onValueChange={setHotelId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar hotel del catálogo" />
                </SelectTrigger>
                <SelectContent>
                  {catalogHotels.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name}
                      {h.city ? ` — ${h.city}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedHotel && (
              <p className="text-xs text-muted-foreground">
                Disponible en catálogo: sencillas {selectedHotel.totalSingleRooms}, dobles {selectedHotel.totalDoubleRooms},{' '}
                triples {selectedHotel.totalTripleRooms}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Check-in</Label>
                <Input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Check-out</Label>
                <Input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Sencillas</Label>
                <Input type="number" min={0} value={rs} onChange={(e) => setRs(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Dobles</Label>
                <Input type="number" min={0} value={rd} onChange={(e) => setRd(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Triples</Label>
                <Input type="number" min={0} value={rt} onChange={(e) => setRt(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notas (opcional)</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Confirmación, plan de comidas…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttachOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={submitAttach} disabled={busy}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editStay} onOpenChange={(o) => !o && setEditStay(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar reserva en el viaje</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Check-in</Label>
                <Input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Check-out</Label>
                <Input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Sencillas</Label>
                <Input type="number" min={0} value={rs} onChange={(e) => setRs(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Dobles</Label>
                <Input type="number" min={0} value={rd} onChange={(e) => setRd(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Triples</Label>
                <Input type="number" min={0} value={rt} onChange={(e) => setRt(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditStay(null)} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={submitEdit} disabled={busy}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!roomDialog} onOpenChange={(o) => !o && setRoomDialog(null)}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {roomDialog?.room.label}
            </DialogTitle>
          </DialogHeader>
          {roomDialog && (
            <RoomAssignBody
              key={`${roomDialog.stay.id}-${roomDialog.room.id}`}
              trip={trip}
              stay={roomDialog.stay}
              room={roomDialog.room}
              canManage={canManage}
              onAssign={onAssignRoom}
              onClear={onClearRoom}
              onClose={() => setRoomDialog(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

function RoomAssignBody({
  trip,
  stay,
  room,
  canManage,
  onAssign,
  onClear,
  onClose,
}: {
  trip: Trip;
  stay: TripHotelBooking;
  room: TripHotelRoomRow;
  canManage: boolean;
  onAssign: (tripHotelId: string, roomId: string, participantId: string) => Promise<void>;
  onClear: (tripHotelId: string, roomId: string, participantId: string) => Promise<void>;
  onClose: () => void;
}) {
  const cap = roomCap(room.roomType);
  const assignedIds = new Set((room.assignments ?? []).map((a) => a.participantId));
  const [selected, setSelected] = useState<Set<string>>(() => new Set(assignedIds));
  const [saving, setSaving] = useState(false);

  const participants = trip.participants ?? [];

  const toggle = (pid: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) {
        if (!next.has(pid) && prev.size >= cap) {
          toast.error(`Esta habitación admite como máximo ${cap} persona(s).`);
          return prev;
        }
        next.add(pid);
      } else {
        next.delete(pid);
      }
      return next;
    });
  };

  const save = async () => {
    if (!onAssign || !onClear) return;
    setSaving(true);
    try {
      const toAdd = [...selected].filter((id) => !assignedIds.has(id));
      const toRemove = [...assignedIds].filter((id) => !selected.has(id));
      for (const pid of toRemove) {
        await onClear(stay.id, room.id, pid);
      }
      for (const pid of toAdd) {
        await onAssign(stay.id, room.id, pid);
      }
      toast.success('Asignación actualizada');
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <p className="text-sm text-muted-foreground mb-2">
        Capacidad: {cap} persona(s). Selecciona los participantes del viaje para esta habitación.
      </p>
      <ul className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
        {participants.map((p) => {
          const label = participantDisplayName(trip, p.id);
          const isChecked = selected.has(p.id);
          return (
            <li key={p.id} className="flex items-center gap-2">
              <Checkbox
                id={`hr-${p.id}`}
                checked={isChecked}
                disabled={!canManage}
                onCheckedChange={(c) => toggle(p.id, c === true)}
              />
              <label htmlFor={`hr-${p.id}`} className="text-sm flex-1 cursor-pointer">
                {label}
              </label>
            </li>
          );
        })}
      </ul>
      {canManage && (
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      )}
    </>
  );
}
