import { useMemo, useState } from 'react';
import type { Trip } from '@/types/form';
import type { Hotel, TripHotelBooking, TripHotelRoomRow, TripHotelRoomType } from '@/types/hotel';
import { Card, CardContent } from '@/components/ui/card';
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
import { Building2, Plus, Pencil, Trash2, Users } from 'lucide-react';
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

  const participants = trip.participants ?? [];

  return (
    <>
      <Card className="w-full">
        <CardContent className="p-4 w-full">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Hoteles
            </h2>
            {canManage && onAttach && (
              <Button type="button" size="sm" className="gap-1" onClick={openAttach} disabled={busy}>
                <Plus className="w-4 h-4" />
                Agregar hotel
              </Button>
            )}
          </div>
          {catalogHotels.length === 0 && canManage && (
            <p className="text-sm text-muted-foreground mb-3">
              No hay hoteles en el catálogo o no tienes permiso para verlos. Crea hoteles en la sección Hoteles.
            </p>
          )}
          {stays.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">Aún no hay hoteles asignados a este viaje.</p>
          ) : (
            <div className="space-y-4">
              {stays.map((stay) => {
                const h = stay.hotel;
                const loc = [h?.city, h?.country].filter(Boolean).join(', ') || h?.address;
                return (
                  <div key={stay.id} className="border rounded-lg p-3 space-y-3 bg-muted/20">
                    <div className="flex flex-wrap justify-between gap-2">
                      <div>
                        <p className="font-medium">{h?.name ?? 'Hotel'}</p>
                        {loc && <p className="text-xs text-muted-foreground">{loc}</p>}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(parseISO(stay.checkInDate), 'dd MMM yyyy', { locale: es })} →{' '}
                          {format(parseISO(stay.checkOutDate), 'dd MMM yyyy', { locale: es })}
                        </p>
                        {stay.notes && <p className="text-sm mt-1">{stay.notes}</p>}
                      </div>
                      {canManage && (onUpdate || onDetach) && (
                        <div className="flex gap-1">
                          {onUpdate && (
                            <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => openEdit(stay)}>
                              <Pencil className="w-3.5 h-3.5" />
                              Editar
                            </Button>
                          )}
                          {onDetach && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive gap-1"
                              onClick={() => confirmDetach(stay)}
                              disabled={busy}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Quitar
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
                            className={`text-left border rounded-md p-2.5 text-sm transition-colors ${
                              (canManage && onAssignRoom && onClearRoom) || assigned.length > 0
                                ? 'hover:bg-accent/50 cursor-pointer'
                                : 'opacity-80'
                            }`}
                          >
                            <div className="flex justify-between items-start gap-1">
                              <span className="font-medium">{room.label}</span>
                              <Badge variant={full ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                                {assigned.length}/{cap}
                              </Badge>
                            </div>
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {assigned.length === 0 ? (
                                <span className="text-muted-foreground text-xs">
                                  {canManage && onAssignRoom ? 'Clic para asignar' : 'Vacía'}
                                </span>
                              ) : (
                                assigned.map((a) => (
                                  <Badge key={a.id} variant="outline" className="text-[10px] font-normal truncate max-w-full">
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
            </div>
          )}
        </CardContent>
      </Card>

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
