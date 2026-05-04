import { useEffect, useMemo, useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { CalendarEvent } from '@/types/form';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  APPOINTMENT_TYPE_LABELS,
  appointmentEventRowBorderClass,
  appointmentTypeBadgeClass,
} from '@/lib/appointmentColors';
import { sortCalendarEvents } from '@/lib/calendarEventSort';
import { CalendarDays, Clock, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

/** Clave interna para eventos sin sucursal en filtros */
const BRANCH_FILTER_NONE = '__sin_sucursal__';

function branchFilterKey(event: CalendarEvent): string {
  const n = event.branchName?.trim();
  return n || BRANCH_FILTER_NONE;
}

function branchFilterLabel(key: string): string {
  return key === BRANCH_FILTER_NONE ? 'Sin sucursal' : key;
}

export const CalendarPage = () => {
  const { token } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [visibleMonth, setVisibleMonth] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showBranch, setShowBranch] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!token) return;
    const from = format(startOfMonth(visibleMonth), 'yyyy-MM-dd');
    const to = format(endOfMonth(visibleMonth), 'yyyy-MM-dd');
    setIsLoading(true);
    api
      .getCalendarEvents(from, to, token)
      .then((data) => setEvents(Array.isArray(data) ? data : []))
      .catch(() => setEvents([]))
      .finally(() => setIsLoading(false));
  }, [token, visibleMonth]);

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

  const selectedDateKey = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  const eventsOnSelectedDateRaw = useMemo(
    () => events.filter((event) => event.date === selectedDateKey),
    [events, selectedDateKey]
  );
  const selectedDateEvents = useMemo(() => {
    const list = visibleEvents.filter((event) => event.date === selectedDateKey);
    return sortCalendarEvents(list);
  }, [visibleEvents, selectedDateKey]);

  const eventDates = useMemo(() => {
    const unique = Array.from(new Set(visibleEvents.map((event) => event.date)));
    return unique.map((d) => new Date(`${d}T00:00:00`));
  }, [visibleEvents]);

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/10 via-card to-accent/5 p-6 sm:p-8 shadow-sm">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/5 blur-3xl pointer-events-none" aria-hidden />
        <div className="absolute -left-12 bottom-0 h-32 w-32 rounded-full bg-violet-500/10 blur-2xl pointer-events-none" aria-hidden />
        <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-inner">
              <CalendarDays className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">Calendario</h1>
              <p className="text-muted-foreground mt-1 max-w-xl">
                Citas internas y fechas de viajes. Filtra por sucursal; en oficina el distintivo muestra la
                sucursal y el nombre del cliente va en el título.
              </p>
            </div>
          </div>
        </div>
        <div className="relative mt-5 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Mostrar sucursales (solo esta vista)</p>
          {branchFilterKeys.length === 0 ? (
            <p className="text-xs text-muted-foreground/90">No hay sucursales en los eventos de este mes.</p>
          ) : (
            <div className="flex flex-wrap gap-x-4 gap-y-2.5">
              {branchFilterKeys.map((key) => (
                <div
                  key={key}
                  className="flex items-center gap-2 rounded-full bg-background/80 px-2.5 py-1 shadow-sm border border-border/40 max-w-full"
                >
                  <Checkbox
                    id={`cal-branch-${key}`}
                    checked={showBranch[key] !== false}
                    onCheckedChange={(checked) =>
                      setShowBranch((prev) => ({ ...prev, [key]: checked === true }))
                    }
                    className="border-border/80 shrink-0"
                  />
                  <Label
                    htmlFor={`cal-branch-${key}`}
                    className="text-xs font-medium cursor-pointer flex items-center gap-2 min-w-0"
                  >
                    <span className="h-2.5 w-2.5 rounded-full shrink-0 bg-primary/80" aria-hidden />
                    <span className="truncate">{branchFilterLabel(key)}</span>
                  </Label>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,400px)_1fr] gap-8 items-start">
        <Card className="overflow-hidden border-border/60 shadow-md rounded-2xl bg-card/90 backdrop-blur-sm">
          <CardHeader className="pb-2 border-b border-border/40 bg-muted/20">
            <CardTitle className="text-base font-semibold">Mes</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={visibleMonth}
              onMonthChange={setVisibleMonth}
              modifiers={{ hasEvents: eventDates }}
              modifiersClassNames={{
                hasEvents: cn(
                  'font-semibold relative',
                  'after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2',
                  'after:h-1 after:w-1 after:rounded-full after:bg-primary after:shadow-sm'
                ),
              }}
              className="mx-auto w-full max-w-[340px]"
            />
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-border/60 shadow-md rounded-2xl min-h-[420px] flex flex-col bg-card/90 backdrop-blur-sm">
          <CardHeader className="border-b border-border/40 bg-muted/15 pb-4">
            <CardTitle className="text-lg sm:text-xl flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span>Eventos</span>
              <span className="text-muted-foreground font-normal text-base">
                {selectedDate ? format(selectedDate, "d 'de' MMMM yyyy", { locale: es }) : 'Selecciona un día'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-4 sm:p-6">
            {isLoading ? (
              <div className="flex items-center gap-3 text-sm text-muted-foreground py-8">
                <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                Cargando eventos...
              </div>
            ) : selectedDateEvents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-6 py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  {eventsOnSelectedDateRaw.length > 0
                    ? 'Hay eventos este día, pero ninguno coincide con las sucursales activas en los filtros.'
                    : 'No hay eventos para esta fecha.'}
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {selectedDateEvents.map((event, idx) => {
                  const timeLabel = formatEventTime(event);
                  const sidebarLabel =
                    timeLabel != null
                      ? { variant: 'time' as const, text: timeLabel }
                      : event.type === 'office'
                        ? { variant: 'muted' as const, text: 'Sin hora' }
                        : { variant: 'type' as const, text: APPOINTMENT_TYPE_LABELS[event.type] };
                  return (
                    <li
                      key={`${event.type}-${event.date}-${idx}-${event.title}`}
                      className={cn(
                        'group rounded-xl border border-border/50 bg-gradient-to-r from-card to-card/80 p-4 shadow-sm transition-shadow hover:shadow-md',
                        appointmentEventRowBorderClass(event.type)
                      )}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                        {sidebarLabel.variant === 'time' ? (
                          <div className="flex shrink-0 items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm font-mono font-semibold tabular-nums text-foreground border border-border/40">
                            <Clock className="h-4 w-4 text-muted-foreground" aria-hidden />
                            {sidebarLabel.text}
                          </div>
                        ) : (
                          <div
                            className={cn(
                              'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 border border-border/30',
                              sidebarLabel.variant === 'muted'
                                ? 'bg-muted/30 text-xs text-muted-foreground'
                                : 'bg-muted/20 text-xs font-medium text-foreground'
                            )}
                          >
                            <Clock className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                            {sidebarLabel.text}
                          </div>
                        )}
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              className={cn(
                                appointmentTypeBadgeClass(event.type),
                                'max-w-[min(100%,18rem)] truncate shrink'
                              )}
                              title={badgeLabel(event)}
                            >
                              {badgeLabel(event)}
                            </Badge>
                            <span className="text-sm font-semibold text-foreground leading-snug min-w-0">
                              {event.title}
                            </span>
                          </div>
                          {event.type === 'office' && event.advisorName && (
                            <div className="text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                                <span>
                                  Asesor:{' '}
                                  <span className="text-foreground font-medium">{event.advisorName}</span>
                                </span>
                              </span>
                            </div>
                          )}
                          {event.note && (
                            <p className="text-sm text-muted-foreground leading-relaxed border-t border-border/30 pt-2">
                              {event.note}
                            </p>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
