import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { CalendarEvent } from '@/types/form';
import { CreateCalendarEventDialog } from './CreateCalendarEventDialog';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  APPOINTMENT_TYPE_LABELS,
  appointmentEventRowBorderClass,
  appointmentTypeBadgeClass,
} from '@/lib/appointmentColors';
import { sortCalendarEvents } from '@/lib/calendarEventSort';
import { Clock, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SectionTitle } from '@/components/layout/SectionTitle';

/** Clave interna para eventos sin sucursal en filtros */
const BRANCH_FILTER_NONE = '__sin_sucursal__';
const WEEKDAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const CELL_EVENT_LIMIT = 2;

function branchFilterKey(event: CalendarEvent): string {
  const n = event.branchName?.trim();
  return n || BRANCH_FILTER_NONE;
}

function branchFilterLabel(key: string): string {
  return key === BRANCH_FILTER_NONE ? 'Sin sucursal' : key;
}

function monthGridDays(month: Date): Date[] {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
}

function dateKey(day: Date): string {
  return format(day, 'yyyy-MM-dd');
}

type CalendarPageProps = {
  assignedUserId?: string;
  onOpenClient?: (clientId: string) => void;
};

export const CalendarPage = ({ assignedUserId, onOpenClient }: CalendarPageProps) => {
  const { token, can } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showBranch, setShowBranch] = useState<Record<string, boolean>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const canCreateAppointment = can('appointments.create');

  const loadMonthEvents = useCallback(async (): Promise<CalendarEvent[]> => {
    if (!token) return [];
    const from = format(startOfMonth(visibleMonth), 'yyyy-MM-dd');
    const to = format(endOfMonth(visibleMonth), 'yyyy-MM-dd');
    const data = await api.getCalendarEvents(from, to, token);
    return Array.isArray(data) ? data : [];
  }, [token, visibleMonth]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setIsLoading(true);
    loadMonthEvents()
      .then((data) => {
        if (!cancelled) setEvents(data);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, loadMonthEvents]);

  const branchFilterKeys = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) {
      set.add(branchFilterKey(e));
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  }, [events]);

  useEffect(() => {
    setShowBranch((prev) => {
      const next: Record<string, boolean> = {};
      for (const k of branchFilterKeys) {
        next[k] = prev[k] ?? true;
      }
      return next;
    });
  }, [branchFilterKeys]);

  const visibleEvents = useMemo(
    () => events.filter((e) => showBranch[branchFilterKey(e)] !== false),
    [events, showBranch]
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of visibleEvents) {
      const list = map.get(event.date) ?? [];
      list.push(event);
      map.set(event.date, list);
    }
    for (const [key, list] of map) {
      map.set(key, sortCalendarEvents(list));
    }
    return map;
  }, [visibleEvents]);

  const gridDays = useMemo(() => monthGridDays(visibleMonth), [visibleMonth]);

  const selectedDateKey = dateKey(selectedDate);
  const eventsOnSelectedDateRaw = useMemo(
    () => events.filter((event) => event.date === selectedDateKey),
    [events, selectedDateKey]
  );
  const selectedDateEvents = useMemo(() => {
    return eventsByDate.get(selectedDateKey) ?? [];
  }, [eventsByDate, selectedDateKey]);

  const monthTitle = format(visibleMonth, 'MMMM yyyy', { locale: es });
  const prettyMonthTitle = monthTitle.charAt(0).toUpperCase() + monthTitle.slice(1);

  const formatEventTime = (event: CalendarEvent) => {
    if (event.type === 'office' && event.startTime && /^\d{2}:\d{2}$/.test(event.startTime)) {
      return event.startTime;
    }
    return null;
  };

  const badgeLabel = (event: CalendarEvent) => {
    if (event.type === 'office') {
      return event.branchName?.trim() || 'Sin sucursal';
    }
    return APPOINTMENT_TYPE_LABELS[event.type];
  };

  const shiftMonth = (delta: number) => {
    const next = addMonths(startOfMonth(visibleMonth), delta);
    setVisibleMonth(next);
    setSelectedDate((prev) => {
      if (isSameMonth(prev, next)) return prev;
      const today = new Date();
      if (isSameMonth(today, next)) return today;
      return next;
    });
  };

  const handleSelectDay = (day: Date) => {
    setSelectedDate(day);
    if (!isSameMonth(day, visibleMonth)) {
      setVisibleMonth(startOfMonth(day));
    }
  };

  return (
    <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
      <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-xs font-medium text-muted-foreground">Mostrar sucursales</p>
        {branchFilterKeys.length === 0 ? (
          <p className="text-xs text-muted-foreground">No hay sucursales en los eventos de este mes.</p>
        ) : (
          branchFilterKeys.map((key) => (
            <div key={key} className="flex items-center gap-2">
              <Checkbox
                id={`cal-branch-${key}`}
                checked={showBranch[key] !== false}
                onCheckedChange={(checked) =>
                  setShowBranch((prev) => ({ ...prev, [key]: checked === true }))
                }
              />
              <Label htmlFor={`cal-branch-${key}`} className="cursor-pointer text-xs font-medium">
                {branchFilterLabel(key)}
              </Label>
            </div>
          ))
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card className="p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">{prettyMonthTitle}</h2>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => shiftMonth(-1)}>
                Anterior
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => shiftMonth(1)}>
                Siguiente
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 text-center text-[11px] font-semibold uppercase text-muted-foreground">
            {WEEKDAY_LABELS.map((label) => (
              <span key={label} className="py-2">
                {label}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 overflow-hidden rounded-md border border-border">
            {gridDays.map((day) => {
              const key = dateKey(day);
              const dayEvents = eventsByDate.get(key) ?? [];
              const extraCount = Math.max(0, dayEvents.length - CELL_EVENT_LIMIT);
              const inMonth = isSameMonth(day, visibleMonth);
              const selected = isSameDay(day, selectedDate);
              const hasEvents = dayEvents.length > 0;
              const label = format(day, "d 'de' MMMM yyyy", { locale: es });

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  aria-pressed={selected}
                  aria-label={`${label}${hasEvents ? `, ${dayEvents.length} eventos` : ''}`}
                  className={cn(
                    'min-h-20 border-b border-r border-border p-2 text-left text-xs hover:bg-muted',
                    !inMonth && 'opacity-30',
                    hasEvents && 'bg-secondary/15',
                    selected && 'bg-primary/10 ring-1 ring-inset ring-primary',
                    isToday(day) && 'font-semibold'
                  )}
                >
                  <span>{format(day, 'd')}</span>
                  {dayEvents.slice(0, CELL_EVENT_LIMIT).map((event, idx) => (
                    <span
                      key={`${event.type}-${event.tripId ?? event.clientId ?? event.title}-${idx}`}
                      className={cn(
                        appointmentTypeBadgeClass(event.type),
                        'mt-1 block max-w-full truncate rounded px-1.5 py-1 text-[9px] font-medium leading-tight'
                      )}
                    >
                      {event.title}
                    </span>
                  ))}
                  {extraCount > 0 ? (
                    <span className="mt-1 block text-[9px] text-muted-foreground">+{extraCount} más</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Agenda del día">
            <div className="flex items-center gap-2">
              <span className="text-xs font-normal text-muted-foreground">
                {format(selectedDate, "d 'de' MMMM yyyy", { locale: es })}
              </span>
              {canCreateAppointment && token ? (
                <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="size-4" />
                  Evento
                </Button>
              ) : null}
            </div>
          </SectionTitle>

          {isLoading ? (
            <div className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Cargando eventos...
            </div>
          ) : selectedDateEvents.length === 0 ? (
            <div className="rounded-md bg-muted px-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                {eventsOnSelectedDateRaw.length > 0
                  ? 'Hay eventos este día, pero ninguno coincide con las sucursales activas en los filtros.'
                  : 'No hay eventos para esta fecha.'}
              </p>
              {eventsOnSelectedDateRaw.length === 0 && !canCreateAppointment ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Las citas se crean desde el perfil del cliente.
                </p>
              ) : null}
            </div>
          ) : (
            selectedDateEvents.map((event, idx) => {
              const timeLabel = formatEventTime(event);
              const timeText =
                timeLabel ??
                (event.type === 'office' ? 'Sin hora' : APPOINTMENT_TYPE_LABELS[event.type]);
              const canOpenClient = event.type === 'office' && Boolean(event.clientId) && Boolean(onOpenClient);

              return (
                <div
                  key={`${event.type}-${event.date}-${idx}-${event.title}`}
                  className={cn(
                    'mb-3 rounded-md bg-muted p-3',
                    appointmentEventRowBorderClass(event.type)
                  )}
                >
                  <p className="flex items-center gap-1.5 text-xs font-semibold">
                    <Clock className="size-3.5 shrink-0 opacity-70" aria-hidden />
                    {timeText}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge
                      className={cn(appointmentTypeBadgeClass(event.type), 'max-w-[min(100%,18rem)] truncate')}
                      title={badgeLabel(event)}
                    >
                      {badgeLabel(event)}
                    </Badge>
                  </div>
                  {canOpenClient ? (
                    <button
                      type="button"
                      className="mt-1 text-left text-sm font-medium text-primary hover:underline"
                      onClick={() => onOpenClient?.(event.clientId!)}
                    >
                      {event.title}
                    </button>
                  ) : (
                    <p className="mt-1 text-sm">{event.title}</p>
                  )}
                  {event.type === 'office' && event.advisorName ? (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <User className="size-3.5 shrink-0 opacity-80" aria-hidden />
                      Asesor: <span className="font-medium text-foreground">{event.advisorName}</span>
                    </p>
                  ) : null}
                  {event.note ? (
                    <p className="mt-2 border-t border-border/60 pt-2 text-sm text-muted-foreground">
                      {event.note}
                    </p>
                  ) : null}
                </div>
              );
            })
          )}
        </Card>
      </div>

      {token && canCreateAppointment ? (
        <CreateCalendarEventDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          appointmentDate={selectedDateKey}
          token={token}
          assignedUserId={assignedUserId}
          onCreated={async (clientId) => {
            try {
              const next = await loadMonthEvents();
              setEvents(next);
              const created = next.find(
                (event) =>
                  event.type === 'office' &&
                  event.clientId === clientId &&
                  event.date === selectedDateKey,
              );
              if (created) {
                const key = branchFilterKey(created);
                if (showBranch[key] === false) {
                  toast.message('Se activó la sucursal en el filtro para mostrar la cita.');
                  setShowBranch((prev) => ({ ...prev, [key]: true }));
                }
              }
            } catch {
              toast.error('La cita se creó, pero no se pudo refrescar el calendario');
            }
          }}
        />
      ) : null}
    </div>
  );
};
