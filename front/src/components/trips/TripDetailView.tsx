import { useState, useEffect } from 'react';
import { Trip, Client, Group, TripChangeLogEntry } from '@/types/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  MapPin,
  ArrowLeft,
  Pencil,
  Trash2,
  UserPlus,
  Search,
  Mail,
  Calendar,
  Armchair,
  RotateCcw,
  History,
  Building2,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AddParticipantsToTripModal } from './AddParticipantsToTripModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const ACTION_LABELS: Record<string, string> = {
  trip_created: 'Viaje creado',
  trip_updated: 'Viaje actualizado',
  participant_added: 'Participante(s) agregado(s)',
  participant_removed: 'Participante quitado',
  seat_assigned: 'Asiento asignado',
  seat_cleared: 'Asiento liberado',
  seat_assignments_reset: 'Asignaciones reiniciadas',
  invitation_sent: 'Invitación enviada',
  invitation_accepted: 'Invitación aceptada',
  invitation_rejected: 'Invitación rechazada',
};

interface TripDetailViewProps {
  trip: Trip;
  availableClients: Client[];
  availableGroups: Group[];
  companiesForInvite: { id: string; name: string }[];
  changeLog: TripChangeLogEntry[];
  onBack: () => void;
  onEdit: (trip: Trip) => void;
  onDelete: (tripId: string) => Promise<void>;
  onAddParticipants: (data: { clientIds?: string[]; groupIds?: string[] }) => Promise<void>;
  onRemoveParticipant: (clientId: string) => Promise<void>;
  onOpenSeatPicker: () => void;
  onResetSeatAssignments: () => Promise<void>;
  onLoadChangeLog: () => void;
  onInviteCompanies: (invitedCompanyIds: string[]) => Promise<void>;
}

export const TripDetailView = ({
  trip,
  availableClients,
  availableGroups,
  companiesForInvite,
  changeLog,
  onBack,
  onEdit,
  onDelete,
  onAddParticipants,
  onRemoveParticipant,
  onOpenSeatPicker,
  onResetSeatAssignments,
  onLoadChangeLog,
  onInviteCompanies,
}: TripDetailViewProps) => {
  const [memberSearch, setMemberSearch] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [inviteCompanyModalOpen, setInviteCompanyModalOpen] = useState(false);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<Set<string>>(new Set());
  const [isInviting, setIsInviting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const sharedIds = (trip.sharedCompanies ?? []).map(c => c.id);
  const companiesAvailableToInvite = companiesForInvite.filter(c => !sharedIds.includes(c.id));

  // Cargar historial al entrar al detalle del viaje (solo cuando cambia trip.id)
  useEffect(() => {
    onLoadChangeLog();
  }, [trip.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refrescar historial cada 30 minutos mientras se está en la pantalla
  useEffect(() => {
    const interval = setInterval(() => {
      onLoadChangeLog();
    }, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [trip.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const participants = trip.participants ?? [];
  const filteredParticipants = memberSearch.trim()
    ? participants.filter(p => {
        const c = p.client;
        if (!c) return false;
        const q = memberSearch.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.phone && c.phone.includes(memberSearch)) ||
          (c.company?.name && c.company.name.toLowerCase().includes(q))
        );
      })
    : participants;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(trip.id);
      toast.success('Viaje eliminado');
      onBack();
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar');
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  const handleResetSeats = async () => {
    setIsResetting(true);
    try {
      await onResetSeatAssignments();
      toast.success('Asignaciones de asientos reiniciadas');
    } catch (err: any) {
      toast.error(err.message || 'Error al reiniciar');
    } finally {
      setIsResetting(false);
    }
  };

  const handleToggleInviteCompany = (id: string) => {
    setSelectedCompanyIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleInviteCompanies = async () => {
    if (selectedCompanyIds.size === 0) {
      toast.error('Selecciona al menos una empresa');
      return;
    }
    setIsInviting(true);
    try {
      const fullList = [...sharedIds, ...Array.from(selectedCompanyIds)];
      await onInviteCompanies(fullList);
      toast.success('Invitación enviada a la(s) empresa(s)');
      setInviteCompanyModalOpen(false);
      setSelectedCompanyIds(new Set());
    } catch (err: any) {
      toast.error(err.message || 'Error al invitar');
    } finally {
      setIsInviting(false);
    }
  };

  const openInviteModal = () => {
    setSelectedCompanyIds(new Set());
    setInviteCompanyModalOpen(true);
  };

  const departureStr = trip.departureDate ? format(new Date(trip.departureDate), "d 'de' MMMM yyyy", { locale: es }) : '';
  const returnStr = trip.returnDate ? format(new Date(trip.returnDate), "d 'de' MMMM yyyy", { locale: es }) : '';

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <Button variant="ghost" onClick={onBack} className="mb-2 -ml-2 gap-2">
              <ArrowLeft className="w-4 h-4" />
              Volver al listado
            </Button>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <MapPin className="w-8 h-8 text-primary" />
              {trip.title}
            </h1>
            {trip.destination && (
              <p className="text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="w-4 h-4" />
                {trip.destination}
              </p>
            )}
            <p className="text-muted-foreground flex items-center gap-1 mt-0.5">
              <Calendar className="w-4 h-4" />
              {departureStr} – {returnStr}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {participants.length}/{trip.totalSeats} plazas
            </p>
            {trip.notes && (
              <p className="text-sm text-muted-foreground mt-2 max-w-xl">{trip.notes}</p>
            )}
            {(trip.sharedCompanies ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                <span className="text-sm text-muted-foreground">Compañías:</span>
                {(trip.sharedCompanies ?? []).map(c => (
                  <Badge key={c.id} variant="secondary" className="text-xs">
                    {c.name}
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              <Button type="button" variant="outline" size="sm" onClick={() => onEdit(trip)} className="gap-2">
                <Pencil className="w-4 h-4" />
                Editar viaje
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  (e.currentTarget as HTMLButtonElement).blur();
                  onOpenSeatPicker();
                }}
                className="gap-2"
              >
                <Armchair className="w-4 h-4" />
                Seleccionar asientos
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetSeats}
                disabled={isResetting || (trip.seatAssignments?.length ?? 0) === 0}
                className="gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reiniciar asignaciones
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmOpen(true)}
                className="gap-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar viaje
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Button onClick={() => setAddModalOpen(true)} className="gap-2">
            <UserPlus className="w-4 h-4" />
            Agregar participantes
          </Button>
          <Button
            variant="outline"
            onClick={openInviteModal}
            className="gap-2"
            disabled={companiesAvailableToInvite.length === 0}
            title={companiesAvailableToInvite.length === 0 ? 'No hay más empresas disponibles para invitar' : 'Invitar a otra empresa a colaborar en el viaje'}
          >
            <Building2 className="w-4 h-4" />
            Invitar empresa
          </Button>
        </div>
        </div>

        <Card>
          <CardContent className="p-4">
            <h2 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Participantes
            </h2>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, email, compañía..."
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {filteredParticipants.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center">
                {participants.length === 0
                  ? 'Aún no hay participantes. Agrega clientes o grupos.'
                  : 'No hay resultados para la búsqueda.'}
              </p>
            ) : (
              <ScrollArea className="h-[280px]">
                <ul className="divide-y">
                  {filteredParticipants.map(p => {
                    const c = p.client;
                    if (!c) return null;
                    return (
                      <li
                        key={p.id ?? c.id}
                        className="flex items-center justify-between gap-4 px-3 py-2.5 hover:bg-muted/30"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium truncate">{c.name}</p>
                            {c.company && (
                              <Badge variant="outline" className="text-xs shrink-0">
                                <Building2 className="w-3 h-3 mr-0.5" />
                                {c.company.name}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                            {c.email && (
                              <span className="flex items-center gap-1 truncate">
                                <Mail className="w-3.5 h-3.5 shrink-0" />
                                {c.email}
                              </span>
                            )}
                            {c.totalAmountDue != null && c.totalAmountDue !== undefined && (
                              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                <DollarSign className="w-3.5 h-3.5" />
                                Debe: ${Number(c.totalAmountDue).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive shrink-0"
                          onClick={() => onRemoveParticipant(c.id)}
                        >
                          Quitar
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h2 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <History className="w-5 h-5" />
              Historial de cambios
            </h2>
            {changeLog.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-sm">Aún no hay cambios registrados.</p>
            ) : (
              <ScrollArea className="h-[200px]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-2">Fecha</th>
                      <th className="pb-2 pr-2">Usuario</th>
                      <th className="pb-2 pr-2">Acción</th>
                      <th className="pb-2">Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {changeLog.map(entry => (
                      <tr key={entry.id} className="border-b border-border/50">
                        <td className="py-2 pr-2 whitespace-nowrap text-muted-foreground">
                          {format(new Date(entry.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                        </td>
                        <td className="py-2 pr-2">{entry.user?.name ?? '—'}</td>
                        <td className="py-2 pr-2">{ACTION_LABELS[entry.action] ?? entry.action}</td>
                        <td className="py-2 text-muted-foreground">
                          {entry.fieldName && entry.oldValue != null && entry.newValue != null
                            ? `${entry.fieldName}: ${entry.oldValue} → ${entry.newValue}`
                            : entry.newValue ?? entry.oldValue ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <AddParticipantsToTripModal
          open={addModalOpen}
          onOpenChange={setAddModalOpen}
          tripTitle={trip.title}
          currentParticipantIds={participants.map(p => p.client?.id).filter(Boolean) as string[]}
          availableClients={availableClients}
          availableGroups={availableGroups}
          totalSeats={trip.totalSeats}
          currentCount={participants.length}
          onAdd={onAddParticipants}
        />

        <Dialog open={inviteCompanyModalOpen} onOpenChange={setInviteCompanyModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Invitar empresa a colaborar
              </DialogTitle>
              <DialogDescription>
                Selecciona una o más empresas para invitarlas a ver y gestionar este viaje.
              </DialogDescription>
            </DialogHeader>
            {companiesAvailableToInvite.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No hay más empresas disponibles para invitar. Las que ya colaboran aparecen en el detalle del viaje.
              </p>
            ) : (
              <div className="grid gap-3 py-2 max-h-[240px] overflow-y-auto">
                {companiesAvailableToInvite.map(c => (
                  <div key={c.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`invite-company-${c.id}`}
                      checked={selectedCompanyIds.has(c.id)}
                      onCheckedChange={() => handleToggleInviteCompany(c.id)}
                    />
                    <Label
                      htmlFor={`invite-company-${c.id}`}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {c.name}
                    </Label>
                  </div>
                ))}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteCompanyModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleInviteCompanies}
                disabled={isInviting || selectedCompanyIds.size === 0}
              >
                {isInviting ? 'Enviando...' : 'Invitar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar viaje?</AlertDialogTitle>
              <AlertDialogDescription>
                Se eliminará el viaje &quot;{trip.title}&quot; y todas sus asignaciones. Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? 'Eliminando...' : 'Eliminar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};
