import { useState, useMemo, useEffect } from 'react';
import { Trip, BusLayoutElement } from '@/types/form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Armchair, UserMinus, RotateCcw, Droplets, ArrowUpDown, DoorOpen, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BusLayoutRenderer } from './bus-layout/BusLayoutRenderer';

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const SEAT_SIZE = 44;

const ELEMENT_ICONS: Record<string, typeof Armchair> = {
  seat: Armchair,
  bathroom: Droplets,
  stairs: ArrowUpDown,
  door: DoorOpen,
  driver: User,
};

interface SeatPickerModalProps {
  trip: Trip;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: (participantId: string, seat: { seatNumber?: number; seatId?: string }) => Promise<void>;
  onClear: (opts: { participantId?: string; clientId?: string; seatId?: string }) => Promise<void>;
  onReset: () => Promise<void>;
  onUpdateTemplateSeatLabel?: (tripId: string, templateId: string, seatId: string, label: string) => Promise<void>;
  /** Revisor: solo asignar asientos, sin quitar ni reiniciar */
  reviewerSeatMode?: boolean;
}

export function SeatPickerModal({
  trip,
  open,
  onOpenChange,
  onAssign,
  onClear,
  onReset,
  onUpdateTemplateSeatLabel,
  reviewerSeatMode = false,
}: SeatPickerModalProps) {
  const [pendingSeatNumber, setPendingSeatNumber] = useState<number | null>(null);
  const [pendingSeatId, setPendingSeatId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [resetting, setResetting] = useState(false);

  const totalSeats = trip.totalSeats ?? 0;
  const busTemplate = trip.busTemplate ?? null;
  const layout = busTemplate?.layout ?? null;
  const hasLayout = !!layout?.floors?.length;

  const seatLabel = (seatNumber: number) =>
    busTemplate?.seatLabels?.[seatNumber - 1] ?? String(seatNumber);

  const seatAssignments = trip.seatAssignments ?? [];
  const assignmentBySeatNumber = useMemo(() => {
    const m: Record<number, (typeof seatAssignments)[0]> = {};
    seatAssignments.forEach((a) => {
      if (a.seatNumber != null) m[a.seatNumber] = a;
    });
    return m;
  }, [seatAssignments]);

  const assignmentBySeatId = useMemo(() => {
    const m: Record<string, (typeof seatAssignments)[0]> = {};
    seatAssignments.forEach((a) => {
      if (a.seatId) m[a.seatId] = a;
    });
    return m;
  }, [seatAssignments]);

  const participantsWithoutSeat = useMemo(
    () =>
      (trip.participants ?? []).filter(
        (p) => !seatAssignments.some((s) => (s.participantId ?? s.clientId) === p.id)
      ),
    [trip.participants, seatAssignments]
  );

  const handleSeatClickNumber = (seatNum: number) => {
    if (assignmentBySeatNumber[seatNum]) return;
    setPendingSeatNumber(seatNum);
    setPendingSeatId(null);
  };

  const handleSeatClickLayout = (seatId: string) => {
    setPendingSeatId(seatId);
    setPendingSeatNumber(null);
  };

  const handleAssign = async (participantId: string) => {
    if (pendingSeatId) {
      setAssigning(true);
      try {
        await onAssign(participantId, { seatId: pendingSeatId });
        setPendingSeatId(null);
      } finally {
        setAssigning(false);
      }
      return;
    }
    if (pendingSeatNumber != null) {
      setAssigning(true);
      try {
        await onAssign(participantId, { seatNumber: pendingSeatNumber });
        setPendingSeatNumber(null);
      } finally {
        setAssigning(false);
      }
    }
  };

  const handleClear = async (opts: { participantId?: string; clientId?: string; seatId?: string }) => {
    try {
      await onClear(opts);
    } catch (_) {}
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await onReset();
      setPendingSeatNumber(null);
      setPendingSeatId(null);
      onOpenChange(false);
    } finally {
      setResetting(false);
    }
  };

  const pendingSeatLabel = pendingSeatId
    ? (() => {
        for (const floor of layout?.floors ?? []) {
          const el = floor.elements?.find((e) => e.type === 'seat' && e.id === pendingSeatId);
          if (el) return el.label ?? el.id;
        }
        return pendingSeatId;
      })()
    : pendingSeatNumber != null
      ? seatLabel(pendingSeatNumber)
      : '—';

  if (totalSeats < 1 && !hasLayout) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogDescription className="sr-only">
            Este viaje no tiene plazas configuradas.
          </DialogDescription>
          <p className="text-muted-foreground">Este viaje no tiene plazas configuradas.</p>
        </DialogContent>
      </Dialog>
    );
  }

  if (hasLayout) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Armchair className="w-5 h-5" />
              Selección de asientos — {trip.title}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Haz clic en un asiento para ver nombre y asignar un participante.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-[1.7fr_1fr_1fr] gap-4 flex-1 min-h-0">
            <div className="flex flex-col min-h-0">
              <p className="text-xs text-muted-foreground mb-2">
                {reviewerSeatMode
                  ? 'Haz clic en un asiento libre para asignar un participante.'
                  : 'Haz clic en un asiento para asignar o quitar.'}
              </p>
              <Tabs defaultValue="0" className="flex-1 flex flex-col min-h-0">
                <TabsList className="grid w-full shrink-0" style={{ gridTemplateColumns: `repeat(${layout!.floors.length}, 1fr)` }}>
                  {layout!.floors.map((_, i) => (
                    <TabsTrigger key={i} value={String(i)}>Piso {i + 1}</TabsTrigger>
                  ))}
                </TabsList>
                {layout!.floors.map((floor, fi) => (
                  <TabsContent key={fi} value={String(fi)} className="flex-1 m-0 mt-2 overflow-auto">
                    <BusLayoutRenderer
                      layout={layout!}
                      floorIndex={fi}
                      pendingSeatId={pendingSeatId}
                      assignmentBySeatId={assignmentBySeatId as any}
                      onSeatClick={handleSeatClickLayout}
                    />
                  </TabsContent>
                ))}
              </Tabs>
              {!reviewerSeatMode && (
                <Button variant="outline" size="sm" className="mt-2 gap-2" onClick={handleReset} disabled={resetting}>
                  <RotateCcw className="w-4 h-4" />
                  Reiniciar asignaciones
                </Button>
              )}
            </div>

            <div className="flex flex-col gap-2 min-h-0">
              <h4 className="text-sm font-medium">Asiento: {pendingSeatLabel}</h4>
              {(pendingSeatId || pendingSeatNumber != null) && (
                <>
                  {pendingSeatId && busTemplate?.id && onUpdateTemplateSeatLabel && (
                    <SeatLabelEditor
                      seatId={pendingSeatId}
                      layout={layout!}
                      tripId={trip.id}
                      templateId={busTemplate.id}
                      onUpdate={onUpdateTemplateSeatLabel}
                    />
                  )}
                  <ScrollArea className="flex-1 min-h-[120px] border rounded-lg p-2">
                    <ul className="space-y-1">
                      {participantsWithoutSeat.length === 0 ? (
                        <li className="text-sm text-muted-foreground">Todos tienen asiento.</li>
                      ) : (
                        participantsWithoutSeat.map((p) => (
                          <li key={p.id}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start gap-2"
                              onClick={() => handleAssign(p.id)}
                              disabled={assigning}
                            >
                              {p.client?.name ?? p.staffMember?.name ?? p.companion?.name ?? p.id}
                              {p.client?.company && (
                                <span className="text-muted-foreground text-xs">({p.client.company.name})</span>
                              )}
                            </Button>
                          </li>
                        ))
                      )}
                    </ul>
                  </ScrollArea>
                  {pendingSeatId && assignmentBySeatId[pendingSeatId] && (
                    <div className="text-sm flex items-center gap-2 flex-wrap">
                      <span className="text-muted-foreground">Asignado a: </span>
                      <span>
                        {(assignmentBySeatId[pendingSeatId] as any)?.client?.name ??
                          assignmentBySeatId[pendingSeatId].participant?.name ??
                          assignmentBySeatId[pendingSeatId].clientId}
                      </span>
                      {!reviewerSeatMode && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleClear({ seatId: pendingSeatId })}
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                          Quitar
                        </Button>
                      )}
                    </div>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => { setPendingSeatId(null); setPendingSeatNumber(null); }}>
                    Cancelar
                  </Button>
                </>
              )}
            </div>

            <div className="flex flex-col min-h-0">
              <h4 className="text-sm font-medium mb-2">Asignaciones actuales</h4>
              <ScrollArea className="flex-1 border rounded-lg p-2 min-h-[120px]">
                <ul className="space-y-2">
                  {seatAssignments.map((a) => {
                    const label = a.seatId
                      ? (() => {
                          for (const floor of layout?.floors ?? []) {
                            const el = floor.elements?.find((e) => e.id === a.seatId);
                            if (el) return el.label ?? el.id;
                          }
                          return a.seatId;
                        })()
                      : seatLabel(a.seatNumber!);
                    return (
                      <li key={(a as any).id ?? (a.participantId ?? a.clientId) + (a.seatId ?? a.seatNumber)} className="flex items-center justify-between gap-2 text-sm">
                        <span>
                          Asiento {label}: {(a as any).client?.name ?? a.participant?.name ?? a.clientId}
                          {(a as any).client?.company && (
                            <span className="text-muted-foreground text-xs ml-1">({(a as any).client.company.name})</span>
                          )}
                        </span>
                        {!reviewerSeatMode && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="shrink-0 text-destructive hover:text-destructive"
                            onClick={() => handleClear(a.seatId ? { seatId: a.seatId! } : { clientId: a.clientId })}
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </li>
                    );
                  })}
                  {seatAssignments.length === 0 && (
                    <li className="text-sm text-muted-foreground">Ninguna asignación.</li>
                  )}
                </ul>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const seatsPerRow = 2;
  const rows = Math.ceil(totalSeats / seatsPerRow);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Armchair className="w-5 h-5" />
            Selección de asientos — {trip.title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Asigna participantes a asientos del viaje. Haz clic en un asiento libre y elige un participante.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-[1.7fr_1fr_1fr] gap-4 flex-1 min-h-0">
          <div className="flex flex-col min-h-0">
            <div className="rounded-lg border bg-muted/20 p-3 overflow-auto flex-1 min-h-[200px]">
              <p className="text-xs text-muted-foreground mb-2">Haz clic en un asiento libre para asignar.</p>
              <div className="flex flex-col gap-2">
                {Array.from({ length: rows }, (_, rowIndex) => (
                  <div key={rowIndex} className="flex gap-2 justify-center">
                    {Array.from({ length: seatsPerRow }, (_, colIndex) => {
                      const seatNum = rowIndex * seatsPerRow + colIndex + 1;
                      if (seatNum > totalSeats) return null;
                      const assigned = assignmentBySeatNumber[seatNum];
                      const isReserved = !!assigned;
                      const isPending = pendingSeatNumber === seatNum;
                      return (
                        <button
                          key={seatNum}
                          type="button"
                          onClick={() => handleSeatClickNumber(seatNum)}
                          disabled={isReserved}
                          className={cn(
                            'w-14 h-14 rounded-lg border-2 flex flex-col items-center justify-center text-xs font-medium transition-colors shrink-0',
                            isReserved && 'bg-muted border-muted-foreground/40 cursor-not-allowed text-muted-foreground',
                            isPending && 'bg-primary text-primary-foreground border-primary ring-2 ring-primary/50',
                            !isReserved && !isPending && 'bg-background border-border hover:border-primary hover:bg-primary/10 cursor-pointer'
                          )}
                          title={isReserved ? `Asiento ${seatLabel(seatNum)}: ${(assigned as any)?.client?.name ?? 'Ocupado'}` : `Asiento ${seatLabel(seatNum)} - Clic para asignar`}
                        >
                          <span>{seatLabel(seatNum)}</span>
                          {isReserved && (
                            <span className="truncate max-w-full px-0.5" title={(assigned as any)?.client?.name}>
                              {(assigned as any)?.client?.name?.split(' ')[0] ?? '—'}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            {!reviewerSeatMode && (
              <Button variant="outline" size="sm" className="mt-2 gap-2" onClick={handleReset} disabled={resetting}>
                <RotateCcw className="w-4 h-4" />
                Reiniciar asignaciones
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-2 min-h-0">
            <h4 className="text-sm font-medium">Asignar a asiento {pendingSeatLabel}</h4>
            {pendingSeatNumber != null && (
              <>
                <ScrollArea className="flex-1 min-h-[120px] border rounded-lg p-2">
                  <ul className="space-y-1">
                    {participantsWithoutSeat.length === 0 ? (
                      <li className="text-sm text-muted-foreground">Todos tienen asiento.</li>
                    ) : (
                      participantsWithoutSeat.map((p) => (
                        <li key={p.id}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start gap-2"
                            onClick={() => handleAssign(p.id)}
                            disabled={assigning}
                          >
                            {p.client?.name ?? p.staffMember?.name ?? p.companion?.name ?? p.id}
                            {p.client?.company && (
                              <span className="text-muted-foreground text-xs">({p.client.company.name})</span>
                            )}
                          </Button>
                        </li>
                      ))
                    )}
                  </ul>
                </ScrollArea>
                <Button variant="ghost" size="sm" onClick={() => setPendingSeatNumber(null)}>
                  Cancelar
                </Button>
              </>
            )}
          </div>

          <div className="flex flex-col min-h-0">
            <h4 className="text-sm font-medium mb-2">Asignaciones actuales</h4>
            <ScrollArea className="flex-1 border rounded-lg p-2 min-h-[120px]">
              <ul className="space-y-2">
                {[...seatAssignments]
                  .filter((a) => a.seatNumber != null)
                  .sort((a, b) => (a.seatNumber ?? 0) - (b.seatNumber ?? 0))
                  .map((a) => (
                    <li key={(a.participantId ?? a.clientId) + (a.seatNumber ?? '')} className="flex items-center justify-between gap-2 text-sm">
                      <span>
                        Asiento {seatLabel(a.seatNumber!)}: {(a as any).client?.name ?? a.participant?.name ?? a.clientId}
                        {(a as any).client?.company && (
                          <span className="text-muted-foreground text-xs ml-1">({(a as any).client.company.name})</span>
                        )}
                      </span>
                      {!reviewerSeatMode && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0 text-destructive hover:text-destructive"
                          onClick={() => handleClear({ participantId: a.participantId, clientId: a.clientId ?? undefined })}
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </li>
                  ))}
                {seatAssignments.length === 0 && (
                  <li className="text-sm text-muted-foreground">Ninguna asignación.</li>
                )}
              </ul>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SeatLabelEditor({
  seatId,
  layout,
  tripId,
  templateId,
  onUpdate,
}: {
  seatId: string;
  layout: { floors: { elements: BusLayoutElement[] }[] };
  tripId: string;
  templateId: string;
  onUpdate: (tripId: string, templateId: string, seatId: string, label: string) => Promise<void>;
}) {
  const element = useMemo(() => {
    for (const floor of layout.floors ?? []) {
      const el = floor.elements?.find((e) => e.id === seatId && e.type === 'seat');
      if (el) return el;
    }
    return null;
  }, [layout, seatId]);
  const [label, setLabel] = useState(element?.label ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (element) setLabel(element.label ?? '');
  }, [element?.label]);

  if (!element) return null;

  const handleBlur = () => {
    if (label === (element.label ?? '')) return;
    setSaving(true);
    onUpdate(tripId, templateId, seatId, label)
      .finally(() => setSaving(false));
  };

  return (
    <div className="space-y-1">
      <Label className="text-xs">Nombre del asiento</Label>
      <Input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={handleBlur}
        placeholder="Ej. 1A"
        disabled={saving}
      />
    </div>
  );
}
