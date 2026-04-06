import { useState, useMemo } from 'react';
import { Trip, TripInvitation, Client, BusTemplate, TripIncome, TripExpense, TripFinanceSummary } from '@/types/form';
import { TripCard } from './TripCard';
import { TripDetailView } from './TripDetailView';
import { TripFormModal } from './TripFormModal';
import { BusTemplateList } from './BusTemplateList';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Plus, Search, Mail, Calendar as CalendarIcon, Check, X, List, CalendarDays, Bus } from 'lucide-react';
import { toast } from 'sonner';
import { SeatPickerModal } from './SeatPickerModal';
import { format, startOfWeek, getDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import type { Event } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = dateFnsLocalizer({ format, startOfWeek, getDay, locales: { es } });

interface TripListProps {
  trips: Trip[];
  invitations: TripInvitation[];
  availableClients: Client[];
  companiesForInvite: { id: string; name: string }[];
  onCreate: (data: {
    title: string;
    destination?: string;
    departureDate: string;
    returnDate: string;
    notes?: string;
    totalSeats: number;
    invitedCompanyIds?: string[];
    busTemplateId?: string | null;
  }) => Promise<void>;
  onUpdate: (tripId: string, data: Partial<Trip> & { invitedCompanyIds?: string[] }) => Promise<void>;
  onDelete: (tripId: string) => Promise<void>;
  onAddParticipants: (tripId: string, data: { clientIds?: string[] }) => Promise<void>;
  onRemoveParticipant: (tripId: string, clientId: string) => Promise<void>;
  onAcceptInvitation: (invitationId: string) => Promise<void>;
  onRejectInvitation: (invitationId: string) => Promise<void>;
  onResetSeatAssignments: (tripId: string) => Promise<void>;
  onSetSeatAssignment: (tripId: string, clientId: string, seat: { seatNumber?: number; seatId?: string }) => Promise<void>;
  onClearSeatAssignment: (tripId: string, opts: { clientId?: string; seatId?: string }) => Promise<void>;
  onUpdateTemplateSeatLabel?: (tripId: string, templateId: string, seatId: string, label: string) => Promise<void>;
  onLoadChangeLog: (tripId: string) => void;
  onLoadTripFinance: (tripId: string) => void;
  onCreateTripIncome: (
    tripId: string,
    data: { clientId: string; amount: number; paymentDate: string; paymentType?: 'tarjeta' | 'transferencia' | 'efectivo'; referenceNumber?: string; note?: string }
  ) => Promise<void>;
  onDeleteTripIncome: (tripId: string, incomeId: string) => Promise<void>;
  onCreateTripExpense: (
    tripId: string,
    data: { amount: number; expenseDate: string; category?: string; referenceNumber?: string; note?: string }
  ) => Promise<void>;
  onDeleteTripExpense: (tripId: string, expenseId: string) => Promise<void>;
  financeSummary: TripFinanceSummary | null;
  tripIncomes: TripIncome[];
  tripExpenses: TripExpense[];
  onFetchTrip?: (tripId: string) => void;
  busTemplates?: BusTemplate[];
  onCreateBusTemplate?: (data: { name: string; layout: import('@/types/form').BusLayout }) => Promise<void>;
  onUpdateBusTemplate?: (id: string, data: { name?: string; layout?: import('@/types/form').BusLayout }) => Promise<void>;
  onDeleteBusTemplate?: (id: string) => Promise<void>;
  changeLog: { id: string; tripId: string; userId: string; user?: { id: string; name: string }; action: string; fieldName?: string | null; oldValue?: string | null; newValue?: string | null; createdAt: string }[];
  /** Revisor: sin camiones, crear/editar viaje, invitaciones, finanzas */
  reviewerMode?: boolean;
}

export const TripList = ({
  trips,
  invitations,
  availableClients,
  companiesForInvite,
  onCreate,
  onUpdate,
  onDelete,
  onAddParticipants,
  onRemoveParticipant,
  onAcceptInvitation,
  onRejectInvitation,
  onResetSeatAssignments,
  onSetSeatAssignment,
  onClearSeatAssignment,
  onUpdateTemplateSeatLabel,
  onLoadChangeLog,
  onLoadTripFinance,
  onCreateTripIncome,
  onDeleteTripIncome,
  onCreateTripExpense,
  onDeleteTripExpense,
  financeSummary,
  tripIncomes,
  tripExpenses,
  onFetchTrip,
  busTemplates = [],
  onCreateBusTemplate,
  onUpdateBusTemplate,
  onDeleteBusTemplate,
  changeLog,
  reviewerMode = false,
}: TripListProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [viewingTripId, setViewingTripId] = useState<string | null>(null);
  const [seatPickerTrip, setSeatPickerTrip] = useState<Trip | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [showBusTemplates, setShowBusTemplates] = useState(false);

  const filteredTrips = useMemo(() => {
    if (!searchQuery.trim()) return trips;
    const q = searchQuery.toLowerCase();
    return trips.filter(
      t =>
        t.title.toLowerCase().includes(q) ||
        (t.destination && t.destination.toLowerCase().includes(q))
    );
  }, [trips, searchQuery]);

  const viewingTrip = useMemo(
    () => (viewingTripId ? trips.find(t => t.id === viewingTripId) ?? null : null),
    [trips, viewingTripId]
  );

  const calendarEvents = useMemo((): Event<Trip>[] => {
    return filteredTrips.map((trip) => {
      const start = new Date(trip.departureDate);
      const end = endOfDay(new Date(trip.returnDate));
      return {
        id: trip.id,
        title: trip.destination ? `${trip.title} — ${trip.destination}` : trip.title,
        start,
        end,
        resource: trip,
      };
    });
  }, [filteredTrips]);

  const handleSaveTrip = async (data: {
    title: string;
    destination?: string;
    departureDate: string;
    returnDate: string;
    notes?: string;
    totalSeats: number;
    invitedCompanyIds?: string[];
    busTemplateId?: string | null;
  }) => {
    try {
      if (editingTrip) {
        await onUpdate(editingTrip.id, {
          title: data.title,
          destination: data.destination,
          departureDate: data.departureDate,
          returnDate: data.returnDate,
          notes: data.notes,
          totalSeats: data.totalSeats,
          busTemplateId: data.busTemplateId ?? undefined,
          sharedCompanies: data.invitedCompanyIds?.map(id => {
            const c = companiesForInvite.find(x => x.id === id);
            return c ? { id: c.id, name: c.name } : { id, name: '' };
          }),
        });
        toast.success('Viaje actualizado');
      } else {
        await onCreate(data);
        toast.success('Viaje creado');
      }
      setEditingTrip(null);
      setIsFormOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar');
      throw err;
    }
  };

  const handleDelete = async (tripId: string) => {
    try {
      await onDelete(tripId);
      toast.success('Viaje eliminado');
      setViewingTripId(null);
      setEditingTrip(null);
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar');
      throw err;
    }
  };

  const handleViewTrip = (tripId: string) => {
    onFetchTrip?.(tripId);
    setViewingTripId(tripId);
  };

  if (!reviewerMode && showBusTemplates && onCreateBusTemplate && onUpdateBusTemplate && onDeleteBusTemplate) {
    return (
      <BusTemplateList
        templates={busTemplates}
        onBack={() => setShowBusTemplates(false)}
        onCreate={onCreateBusTemplate}
        onUpdate={onUpdateBusTemplate}
        onDelete={onDeleteBusTemplate}
      />
    );
  }

  if (viewingTrip) {
    return (
      <>
        <TripDetailView
          trip={viewingTrip}
          availableClients={availableClients}
          companiesForInvite={companiesForInvite}
          changeLog={changeLog.filter(e => e.tripId === viewingTrip.id)}
          reviewerMode={reviewerMode}
          onBack={() => {
            setViewingTripId(null);
            setSeatPickerTrip(null);
          }}
          onEdit={t => {
            setSeatPickerTrip(null);
            setEditingTrip(t);
            setViewingTripId(null);
            setIsFormOpen(true);
          }}
          onDelete={handleDelete}
          onAddParticipants={async data => {
            await onAddParticipants(viewingTrip.id, data);
          }}
          onRemoveParticipant={async clientId => {
            await onRemoveParticipant(viewingTrip.id, clientId);
          }}
          onOpenSeatPicker={() => setSeatPickerTrip(viewingTrip)}
          onResetSeatAssignments={async () => await onResetSeatAssignments(viewingTrip.id)}
          onLoadChangeLog={() => onLoadChangeLog(viewingTrip.id)}
          onLoadTripFinance={() => onLoadTripFinance(viewingTrip.id)}
          onCreateTripIncome={async (data) => onCreateTripIncome(viewingTrip.id, data)}
          onDeleteTripIncome={async (incomeId) => onDeleteTripIncome(viewingTrip.id, incomeId)}
          onCreateTripExpense={async (data) => onCreateTripExpense(viewingTrip.id, data)}
          onDeleteTripExpense={async (expenseId) => onDeleteTripExpense(viewingTrip.id, expenseId)}
          financeSummary={financeSummary}
          tripIncomes={tripIncomes}
          tripExpenses={tripExpenses}
          onInviteCompanies={async (invitedCompanyIds) => {
            await onUpdate(viewingTrip.id, { invitedCompanyIds });
            onFetchTrip?.(viewingTrip.id);
          }}
        />
        {seatPickerTrip && (
          <SeatPickerModal
            trip={trips.find(t => t.id === seatPickerTrip.id) ?? seatPickerTrip}
            open={!!seatPickerTrip}
            onOpenChange={open => { if (!open) setSeatPickerTrip(null); }}
            onAssign={async (clientId, seat) => {
              await onSetSeatAssignment(seatPickerTrip.id, clientId, seat);
            }}
            onClear={async (opts) => {
              await onClearSeatAssignment(seatPickerTrip.id, opts);
            }}
            onReset={async () => {
              await onResetSeatAssignments(seatPickerTrip.id);
            }}
            reviewerSeatMode={reviewerMode}
            onUpdateTemplateSeatLabel={onUpdateTemplateSeatLabel && !reviewerMode ? (tripId, templateId, seatId, label) => onUpdateTemplateSeatLabel(tripId, templateId, seatId, label) : undefined}
          />
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Viajes</h1>
            <p className="text-muted-foreground mt-1">
              {reviewerMode
                ? 'Consulta viajes, participantes y asientos'
                : 'Gestiona viajes, invitaciones y asientos'}
            </p>
          </div>
          {!reviewerMode && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowBusTemplates(true)} className="gap-2">
                <Bus className="w-4 h-4" />
                Mis camiones
              </Button>
              <Button onClick={() => { setEditingTrip(null); setIsFormOpen(true); }} className="gap-2">
                <Plus className="w-4 h-4" />
                Nuevo viaje
              </Button>
            </div>
          )}
        </div>

        {!reviewerMode && invitations.length > 0 && (
          <Card className="border-primary/30">
            <CardContent className="p-4">
              <h2 className="font-semibold text-lg mb-3">Invitaciones pendientes</h2>
              <div className="space-y-3">
                {invitations.map(inv => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/40 border"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{inv.trip?.title ?? 'Viaje'}</p>
                      {inv.trip?.destination && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {inv.trip.destination}
                        </p>
                      )}
                      {inv.trip?.departureDate && inv.trip?.returnDate && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <CalendarIcon className="w-3.5 h-3.5" />
                          {format(new Date(inv.trip.departureDate), 'd MMM yyyy', { locale: es })} –{' '}
                          {format(new Date(inv.trip.returnDate), 'd MMM yyyy', { locale: es })}
                        </p>
                      )}
                      {inv.invitedBy && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Mail className="w-3.5 h-3.5" />
                          Invitado por: {inv.invitedBy.name}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-destructive hover:text-destructive"
                        onClick={async () => {
                          try {
                            await onRejectInvitation(inv.id);
                            toast.success('Invitación rechazada');
                          } catch (e: any) {
                            toast.error(e.message);
                          }
                        }}
                      >
                        <X className="w-4 h-4" />
                        Rechazar
                      </Button>
                      <Button
                        size="sm"
                        className="gap-1"
                        onClick={async () => {
                          try {
                            await onAcceptInvitation(inv.id);
                            toast.success('Invitación aceptada');
                          } catch (e: any) {
                            toast.error(e.message);
                          }
                        }}
                      >
                        <Check className="w-4 h-4" />
                        Aceptar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Buscar por título o destino..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
          <div className="flex rounded-lg border p-1 bg-muted/30">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className="gap-1.5"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
              Lista
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              className="gap-1.5"
              onClick={() => setViewMode('calendar')}
            >
              <CalendarDays className="w-4 h-4" />
              Calendario
            </Button>
          </div>
        </div>

        {viewMode === 'calendar' ? (
          <div className="rounded-lg border bg-card overflow-hidden" style={{ height: 500 }}>
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              onSelectEvent={(event) => handleViewTrip((event.resource as Trip).id)}
              views={['month', 'agenda']}
              defaultView="month"
              messages={{
                next: 'Sig',
                previous: 'Ant',
                today: 'Hoy',
                month: 'Mes',
                agenda: 'Agenda',
                date: 'Fecha',
                time: 'Hora',
                event: 'Viaje',
                noEventsInRange: 'No hay viajes en este rango',
              }}
            />
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
              <MapPin className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">No hay viajes</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? 'No se encontraron viajes con ese criterio'
                : reviewerMode
                  ? 'Aún no hay viajes registrados'
                  : 'Crea un viaje para gestionar fechas, participantes y asientos'}
            </p>
            {!searchQuery && !reviewerMode && (
              <Button onClick={() => { setEditingTrip(null); setIsFormOpen(true); }} className="gap-2">
                <Plus className="w-4 h-4" />
                Nuevo viaje
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTrips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                readOnly={reviewerMode}
                onView={() => handleViewTrip(trip.id)}
                onEdit={() => {
                  setEditingTrip(trip);
                  setIsFormOpen(true);
                }}
                onDelete={() => handleDelete(trip.id)}
              />
            ))}
          </div>
        )}

        {!reviewerMode && (
          <TripFormModal
            trip={editingTrip}
            open={isFormOpen}
            onOpenChange={open => {
              setIsFormOpen(open);
              if (!open) setEditingTrip(null);
            }}
            onSave={handleSaveTrip}
            companiesForInvite={companiesForInvite}
            busTemplates={busTemplates}
          />
        )}

        {seatPickerTrip && (
          <SeatPickerModal
            trip={trips.find(t => t.id === seatPickerTrip.id) ?? seatPickerTrip}
            open={!!seatPickerTrip}
            onOpenChange={open => { if (!open) setSeatPickerTrip(null); }}
            onAssign={async (clientId, seat) => {
              await onSetSeatAssignment(seatPickerTrip.id, clientId, seat);
            }}
            onClear={async (opts) => {
              await onClearSeatAssignment(seatPickerTrip.id, opts);
            }}
            onReset={async () => {
              await onResetSeatAssignments(seatPickerTrip.id);
            }}
            reviewerSeatMode={reviewerMode}
            onUpdateTemplateSeatLabel={onUpdateTemplateSeatLabel && !reviewerMode ? (tripId, templateId, seatId, label) => onUpdateTemplateSeatLabel(tripId, templateId, seatId, label) : undefined}
          />
        )}
      </div>
    </div>
  );
};
