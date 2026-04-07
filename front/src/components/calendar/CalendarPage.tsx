import { useEffect, useMemo, useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { CalendarEvent } from '@/types/form';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

const EVENT_LABELS: Record<CalendarEvent['type'], string> = {
  office: 'Oficina',
  cas: 'CAS',
  consular: 'Consulado',
  trip_departure: 'Salida viaje',
  trip_return: 'Regreso viaje',
};

export const CalendarPage = () => {
  const { token } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [visibleMonth, setVisibleMonth] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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

  const selectedDateKey = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  const selectedDateEvents = useMemo(
    () => events.filter((event) => event.date === selectedDateKey),
    [events, selectedDateKey]
  );

  const eventDates = useMemo(() => {
    const unique = Array.from(new Set(events.map((event) => event.date)));
    return unique.map((d) => new Date(`${d}T00:00:00`));
  }, [events]);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Calendario</h1>
        <p className="text-muted-foreground mt-1">
          Citas internas, CAS, Consulado y viajes en una sola vista.
        </p>
      </div>

      <div className="grid lg:grid-cols-[420px_1fr] gap-6">
        <Card>
          <CardContent className="p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={visibleMonth}
              onMonthChange={setVisibleMonth}
              modifiers={{ hasEvents: eventDates }}
              modifiersClassNames={{ hasEvents: 'font-bold underline' }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Eventos del {selectedDate ? format(selectedDate, "d 'de' MMMM yyyy", { locale: es }) : 'dia'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando eventos...</p>
            ) : selectedDateEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay eventos para esta fecha.</p>
            ) : (
              <div className="space-y-3">
                {selectedDateEvents.map((event, idx) => (
                  <div key={`${event.type}-${event.date}-${idx}`} className="rounded-md border border-border/60 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary">{EVENT_LABELS[event.type]}</Badge>
                      <span className="text-sm font-medium">{event.title}</span>
                    </div>
                    {event.note && <p className="text-sm text-muted-foreground">{event.note}</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
