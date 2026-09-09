import { useState, useMemo, useEffect, useRef } from 'react';
import { Trip, TripInvitation, Client, StaffMember, BusTemplate, TripIncome, TripExpense, TripFinanceSummary } from '@/types/form';
import type { Hotel } from '@/types/hotel';
import { TripCard } from './TripCard';
import { TripCalendar } from './TripCalendar';
import { TripDetailView } from './TripDetailView';
import { TripFormModal, type TripFormSaveData } from './TripFormModal';
import { BusTemplateList } from './BusTemplateList';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Toolbar } from '@/components/layout/Toolbar';
import { SectionTitle } from '@/components/layout/SectionTitle';
import { MapPin, Plus, Mail, Calendar as CalendarIcon, Check, X, Bus, BriefcaseBusiness } from 'lucide-react';
import { toast } from 'sonner';
import { SeatPickerModal } from './SeatPickerModal';
import { StaffCatalogView } from './StaffCatalogView';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface TripListProps {
  trips: Trip[];
  invitations: TripInvitation[];
  availableClients: Client[];
  availableStaffMembers: StaffMember[];
  companiesForInvite: { id: string; name: string }[];
  onCreate: (data: TripFormSaveData) => Promise<void>;
  onUpdate: (tripId: string, data: Partial<Trip> & { invitedCompanyIds?: string[] }) => Promise<void>;
  onDelete: (tripId: string) => Promise<void>;
  onAddParticipants: (tripId: string, data: { clientIds?: string[]; staffMemberIds?: string[]; companions?: { name: string; phone?: string }[] }) => Promise<void>;
  onRemoveParticipant: (tripId: string, participantId: string) => Promise<void>;
  onUpdateParticipantPickup?: (tripId: string, participantId: string, pickupLocation: string | null) => Promise<void>;
  onAcceptInvitation: (invitationId: string) => Promise<void>;
  onRejectInvitation: (invitationId: string) => Promise<void>;
  onResetSeatAssignments: (tripId: string) => Promise<void>;
  onSetSeatAssignment: (tripId: string, participantId: string, seat: { seatNumber?: number; seatId?: string }) => Promise<void>;
  onClearSeatAssignment: (tripId: string, opts: { participantId?: string; clientId?: string; seatId?: string }) => Promise<void>;
  onUpdateTemplateSeatLabel?: (tripId: string, templateId: string, seatId: string, label: string) => Promise<void>;
  onLoadChangeLog: (tripId: string) => void;
  onLoadTripFinance: (tripId: string) => void;
  onDeleteTripIncome: (tripId: string, incomeId: string) => Promise<void>;
  onCreateTripExpense: (
    tripId: string,
    data: { amount: number; expenseDate: string; category?: string; referenceNumber?: string; note?: string }
  ) => Promise<void>;
  onDeleteTripExpense: (tripId: string, expenseId: string) => Promise<void>;
  onCreateStaffMember: (data: { name: string; phone?: string | null; role?: string | null; notes?: string | null }) => Promise<void>;
  onUpdateStaffMember: (id: string, data: { name?: string; phone?: string | null; role?: string | null; notes?: string | null }) => Promise<void>;
  onDeleteStaffMember: (id: string) => Promise<void>;
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
  catalogHotels?: Hotel[];
  onRefreshHotelCatalog?: () => Promise<void>;
  canManageTripHotels?: boolean;
  onAttachTripHotel?: (tripId: string, data: {
    hotelId: string;
    checkInDate: string;
    checkOutDate: string;
    reservedSingles: number;
    reservedDoubles: number;
    reservedTriples: number;
    notes?: string | null;
  }) => Promise<void>;
  onUpdateTripHotel?: (
    tripId: string,
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
  onDetachTripHotel?: (tripId: string, tripHotelId: string) => Promise<void>;
  onAssignTripHotelRoom?: (tripId: string, tripHotelId: string, roomId: string, participantId: string) => Promise<void>;
  onClearTripHotelRoomAssignment?: (tripId: string, tripHotelId: string, roomId: string, participantId: string) => Promise<void>;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  /** Incrementar desde el CTA del header para abrir TripFormModal. */
  createOpenSignal?: number;
  openTripId?: string | null;
  onOpenTripConsumed?: () => void;
  users?: Array<{ id: string; name: string }>;
}

export const TripList = ({
  trips,
  invitations,
  availableClients,
  availableStaffMembers,
  companiesForInvite,
  onCreate,
  onUpdate,
  onDelete,
  onAddParticipants,
  onRemoveParticipant,
  onUpdateParticipantPickup,
  onAcceptInvitation,
  onRejectInvitation,
  onResetSeatAssignments,
  onSetSeatAssignment,
  onClearSeatAssignment,
  onUpdateTemplateSeatLabel,
  onLoadChangeLog,
  onLoadTripFinance,
  onDeleteTripIncome,
  onCreateTripExpense,
  onDeleteTripExpense,
  onCreateStaffMember,
  onUpdateStaffMember,
  onDeleteStaffMember,
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
  catalogHotels = [],
  onRefreshHotelCatalog,
  canManageTripHotels = false,
  onAttachTripHotel,
  onUpdateTripHotel,
  onDetachTripHotel,
  onAssignTripHotelRoom,
  onClearTripHotelRoomAssignment,
  searchQuery: searchQueryProp,
  onSearchChange,
  createOpenSignal,
  openTripId = null,
  onOpenTripConsumed,
  users = [],
}: TripListProps) => {
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const searchQuery = searchQueryProp ?? internalSearchQuery;
  const setSearchQuery = onSearchChange ?? setInternalSearchQuery;
  const lastCreateOpenSignal = useRef(createOpenSignal);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [viewingTripId, setViewingTripId] = useState<string | null>(null);
  const [seatPickerTrip, setSeatPickerTrip] = useState<Trip | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [showBusTemplates, setShowBusTemplates] = useState(false);
  const [showStaffCatalog, setShowStaffCatalog] = useState(false);

  useEffect(() => {
    if (createOpenSignal == null) return;
    if (lastCreateOpenSignal.current === createOpenSignal) return;
    lastCreateOpenSignal.current = createOpenSignal;
    setEditingTrip(null);
    setIsFormOpen(true);
  }, [createOpenSignal]);

  useEffect(() => {
    if (!openTripId) return;
    onFetchTrip?.(openTripId);
    setViewingTripId(openTripId);
    onOpenTripConsumed?.();
  }, [openTripId, onFetchTrip, onOpenTripConsumed]);

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

  const handleSaveTrip = async (data: TripFormSaveData) => {
    try {
      if (editingTrip) {
        await onUpdate(editingTrip.id, {
          title: data.title,
          destination: data.destination,
          notes: data.notes,
          totalSeats: data.totalSeats,
          busTemplateId: data.busTemplateId ?? undefined,
          departureDate: data.departureDate,
          returnDate: data.returnDate,
          reminderConfig: data.reminderConfig,
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

  const seatPicker = seatPickerTrip ? (
    <SeatPickerModal
      trip={trips.find(t => t.id === seatPickerTrip.id) ?? seatPickerTrip}
      open={!!seatPickerTrip}
      onOpenChange={open => { if (!open) setSeatPickerTrip(null); }}
      onAssign={async (participantId, seat) => {
        await onSetSeatAssignment(seatPickerTrip.id, participantId, seat);
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
  ) : null;

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
  if (!reviewerMode && showStaffCatalog) {
    return (
      <StaffCatalogView
        staffMembers={availableStaffMembers}
        onBack={() => setShowStaffCatalog(false)}
        onCreate={onCreateStaffMember}
        onUpdate={onUpdateStaffMember}
        onDelete={onDeleteStaffMember}
      />
    );
  }

  if (viewingTrip) {
    return (
      <>
        <TripDetailView
          trip={viewingTrip}
          availableClients={availableClients}
          availableStaffMembers={availableStaffMembers}
          companiesForInvite={companiesForInvite}
          changeLog={changeLog.filter(e => e.tripId === viewingTrip.id)}
          reviewerMode={reviewerMode}
          users={users}
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
          onRemoveParticipant={async participantId => {
            await onRemoveParticipant(viewingTrip.id, participantId);
          }}
          onUpdateParticipantPickup={
            onUpdateParticipantPickup && !reviewerMode
              ? async (participantId, pickupLocation) => {
                  await onUpdateParticipantPickup(viewingTrip.id, participantId, pickupLocation);
                }
              : undefined
          }
          onOpenSeatPicker={() => setSeatPickerTrip(viewingTrip)}
          onResetSeatAssignments={async () => await onResetSeatAssignments(viewingTrip.id)}
          onLoadChangeLog={() => onLoadChangeLog(viewingTrip.id)}
          onLoadTripFinance={() => onLoadTripFinance(viewingTrip.id)}
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
          catalogHotels={catalogHotels}
          onRefreshHotelCatalog={onRefreshHotelCatalog}
          canManageTripHotels={canManageTripHotels}
          onAttachTripHotel={
            onAttachTripHotel
              ? async (data) => {
                  await onAttachTripHotel(viewingTrip.id, data);
                  onFetchTrip?.(viewingTrip.id);
                }
              : undefined
          }
          onUpdateTripHotel={
            onUpdateTripHotel
              ? async (tripHotelId, data) => {
                  await onUpdateTripHotel(viewingTrip.id, tripHotelId, data);
                  onFetchTrip?.(viewingTrip.id);
                }
              : undefined
          }
          onDetachTripHotel={
            onDetachTripHotel
              ? async (tripHotelId) => {
                  await onDetachTripHotel(viewingTrip.id, tripHotelId);
                  onFetchTrip?.(viewingTrip.id);
                }
              : undefined
          }
          onAssignTripHotelRoom={
            onAssignTripHotelRoom
              ? async (tripHotelId, roomId, participantId) => {
                  await onAssignTripHotelRoom(viewingTrip.id, tripHotelId, roomId, participantId);
                  onFetchTrip?.(viewingTrip.id);
                }
              : undefined
          }
          onClearTripHotelRoomAssignment={
            onClearTripHotelRoomAssignment
              ? async (tripHotelId, roomId, participantId) => {
                  await onClearTripHotelRoomAssignment(viewingTrip.id, tripHotelId, roomId, participantId);
                  onFetchTrip?.(viewingTrip.id);
                }
              : undefined
          }
        />
        {seatPicker}
      </>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
      {!reviewerMode && invitations.length > 0 ? (
        <Card className="mb-5 p-5">
          <SectionTitle title="Invitaciones pendientes" />
          <div className="space-y-3">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-md bg-muted/70 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-display font-semibold">{inv.trip?.title ?? 'Viaje'}</p>
                  {inv.trip?.destination ? (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3.5" />
                      {inv.trip.destination}
                    </p>
                  ) : null}
                  {inv.trip?.departureDate && inv.trip?.returnDate ? (
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarIcon className="size-3.5" />
                      {format(parseISO(inv.trip.departureDate), 'd MMM yyyy', { locale: es })} –{' '}
                      {format(parseISO(inv.trip.returnDate), 'd MMM yyyy', { locale: es })}
                    </p>
                  ) : null}
                  {inv.invitedBy ? (
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="size-3.5" />
                      Invitado por: {inv.invitedBy.name}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={async () => {
                      try {
                        await onRejectInvitation(inv.id);
                        toast.success('Invitación rechazada');
                      } catch (e: any) {
                        toast.error(e.message);
                      }
                    }}
                  >
                    <X />
                    Rechazar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={async () => {
                      try {
                        await onAcceptInvitation(inv.id);
                        toast.success('Invitación aceptada');
                      } catch (e: any) {
                        toast.error(e.message);
                      }
                    }}
                  >
                    <Check />
                    Aceptar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="mb-5 flex flex-wrap gap-2">
        <Button
          type="button"
          variant={viewMode === 'list' ? 'default' : 'outline'}
          onClick={() => setViewMode('list')}
        >
          Lista
        </Button>
        <Button
          type="button"
          variant={viewMode === 'calendar' ? 'default' : 'outline'}
          onClick={() => setViewMode('calendar')}
        >
          Calendario
        </Button>
        {!reviewerMode ? (
          <>
            <Button type="button" variant="outline" onClick={() => setShowStaffCatalog(true)}>
              <BriefcaseBusiness />
              Staff
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowBusTemplates(true)}>
              <Bus />
              Mis camiones
            </Button>
          </>
        ) : null}
      </div>

      <Toolbar
        search={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Buscar por título o destino…"
      >
        {!reviewerMode ? (
          <Button
            type="button"
            onClick={() => {
              setEditingTrip(null);
              setIsFormOpen(true);
            }}
          >
            <Plus />
            Nuevo viaje
          </Button>
        ) : null}
      </Toolbar>

      {viewMode === 'calendar' ? (
        <TripCalendar trips={filteredTrips} onSelectTrip={handleViewTrip} />
      ) : filteredTrips.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted/50">
            <MapPin className="size-8 text-muted-foreground" />
          </div>
          <h3 className="mb-1 font-display text-lg font-semibold text-foreground">
            {searchQuery ? 'Sin resultados' : 'No hay viajes'}
          </h3>
          <p className="mb-4 text-sm text-muted-foreground">
            {searchQuery
              ? 'No se encontraron viajes con ese criterio'
              : reviewerMode
                ? 'Aún no hay viajes registrados'
                : 'Crea un viaje para gestionar fechas, participantes y asientos'}
          </p>
          {!searchQuery && !reviewerMode ? (
            <Button
              type="button"
              onClick={() => {
                setEditingTrip(null);
                setIsFormOpen(true);
              }}
            >
              <Plus />
              Nuevo viaje
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
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

      {!reviewerMode ? (
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
      ) : null}

      {seatPicker}
    </div>
  );
};
