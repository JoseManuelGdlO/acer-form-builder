import { useMemo, useState } from 'react';
import type { Trip } from '@/types/form';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SectionTitle } from '@/components/layout/SectionTitle';
import { cn } from '@/lib/utils';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { MapPin } from 'lucide-react';

const WEEKDAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const CELL_TRIP_LIMIT = 2;

function monthGridDays(month: Date): Date[] {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
}

function dateKey(day: Date): string {
  return format(day, 'yyyy-MM-dd');
}

function tripOverlapsDay(trip: Trip, key: string): boolean {
  const dep = trip.departureDate.slice(0, 10);
  const ret = trip.returnDate.slice(0, 10);
  return key >= dep && key <= ret;
}

type TripCalendarProps = {
  trips: Trip[];
  onSelectTrip: (tripId: string) => void;
};

/**
 * Calendario local de viajes (departure/return). No usa GET /calendar ni CalendarPage.
 */
export function TripCalendar({ trips, onSelectTrip }: TripCalendarProps) {
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const gridDays = useMemo(() => monthGridDays(visibleMonth), [visibleMonth]);

  const tripsByDate = useMemo(() => {
    const map = new Map<string, Trip[]>();
    for (const day of gridDays) {
      const key = dateKey(day);
      map.set(
        key,
        trips.filter((trip) => tripOverlapsDay(trip, key)),
      );
    }
    return map;
  }, [gridDays, trips]);

  const selectedKey = dateKey(selectedDate);
  const selectedTrips = tripsByDate.get(selectedKey) ?? [];

  const monthTitle = format(visibleMonth, 'MMMM yyyy', { locale: es });
  const prettyMonthTitle = monthTitle.charAt(0).toUpperCase() + monthTitle.slice(1);

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
            const dayTrips = tripsByDate.get(key) ?? [];
            const extraCount = Math.max(0, dayTrips.length - CELL_TRIP_LIMIT);
            const inMonth = isSameMonth(day, visibleMonth);
            const selected = isSameDay(day, selectedDate);
            const hasTrips = dayTrips.length > 0;
            const label = format(day, "d 'de' MMMM yyyy", { locale: es });

            return (
              <button
                key={key}
                type="button"
                onClick={() => handleSelectDay(day)}
                aria-pressed={selected}
                aria-label={`${label}${hasTrips ? `, ${dayTrips.length} viajes` : ''}`}
                className={cn(
                  'min-h-20 border-b border-r border-border p-2 text-left text-xs hover:bg-muted',
                  !inMonth && 'opacity-30',
                  hasTrips && 'bg-secondary/15',
                  selected && 'bg-primary/10 ring-1 ring-inset ring-primary',
                  isToday(day) && 'font-semibold',
                )}
              >
                <span>{format(day, 'd')}</span>
                {dayTrips.slice(0, CELL_TRIP_LIMIT).map((trip) => {
                  const isDeparture = trip.departureDate.slice(0, 10) === key;
                  return (
                    <span
                      key={trip.id}
                      className="mt-1 block max-w-full truncate rounded bg-primary px-1.5 py-1 text-[9px] font-medium leading-tight text-primary-foreground"
                      title={trip.title}
                    >
                      {isDeparture ? trip.title : trip.destination || trip.title}
                    </span>
                  );
                })}
                {extraCount > 0 ? (
                  <span className="mt-1 block text-[9px] text-muted-foreground">+{extraCount} más</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle title="Viajes del día">
          <span className="text-xs font-normal text-muted-foreground">
            {format(selectedDate, "d 'de' MMMM yyyy", { locale: es })}
          </span>
        </SectionTitle>

        {selectedTrips.length === 0 ? (
          <div className="rounded-md bg-muted px-4 py-10 text-center">
            <p className="text-sm text-muted-foreground">No hay viajes en esta fecha.</p>
          </div>
        ) : (
          selectedTrips.map((trip) => {
            const dep = format(parseISO(trip.departureDate), 'd MMM', { locale: es });
            const ret = format(parseISO(trip.returnDate), 'd MMM', { locale: es });
            return (
              <button
                key={trip.id}
                type="button"
                onClick={() => onSelectTrip(trip.id)}
                className="mb-3 w-full rounded-md bg-muted p-3 text-left hover:bg-muted/80"
              >
                <p className="text-xs font-semibold">
                  {dep} – {ret}
                </p>
                <p className="mt-1 text-sm font-medium">{trip.title}</p>
                {trip.destination ? (
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3.5" />
                    {trip.destination}
                  </p>
                ) : null}
              </button>
            );
          })
        )}
      </Card>
    </div>
  );
}
