import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { useClientStore } from '@/hooks/useClientStore';
import type { Client } from '@/types/form';

type CreateCalendarEventDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentDate: string;
  token: string;
  assignedUserId?: string;
  onCreated: (clientId: string) => void | Promise<void>;
};

export function CreateCalendarEventDialog({
  open,
  onOpenChange,
  appointmentDate,
  token,
  assignedUserId,
  onCreated,
}: CreateCalendarEventDialogProps) {
  const { pickerClients, fetchClientsForPickers } = useClientStore();
  const [clientQuery, setClientQuery] = useState('');
  const [clientId, setClientId] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [officeRole, setOfficeRole] = useState<'reviewer' | 'admin'>('reviewer');
  const [purposeNote, setPurposeNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !token) return;
    fetchClientsForPickers(token, assignedUserId ? { assignedUserId } : undefined).catch(() => {
      toast.error('No se pudieron cargar los clientes');
    });
  }, [open, token, assignedUserId, fetchClientsForPickers]);

  useEffect(() => {
    if (open) return;
    setClientQuery('');
    setClientId('');
    setAppointmentTime('');
    setOfficeRole('reviewer');
    setPurposeNote('');
    setSubmitting(false);
  }, [open]);

  const titulares = useMemo(
    () => pickerClients.filter((client) => !client.parentClientId),
    [pickerClients],
  );

  const filteredClients = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    if (!q) return titulares.slice(0, 40);
    return titulares
      .filter((client) => {
        const hay = `${client.name} ${client.email} ${client.phone ?? ''}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 40);
  }, [titulares, clientQuery]);

  const selectedClient: Client | undefined = titulares.find((client) => client.id === clientId);

  const handleSubmit = async () => {
    if (!clientId) {
      toast.error('Elige un cliente para crear la cita');
      return;
    }
    if (!purposeNote.trim()) {
      toast.error('El motivo de la cita es obligatorio');
      return;
    }
    setSubmitting(true);
    try {
      await api.createClientInternalAppointment(
        clientId,
        {
          appointmentDate,
          appointmentTime: appointmentTime.trim() || null,
          officeRole,
          purposeNote: purposeNote.trim(),
        },
        token,
      );
      toast.success('Cita creada');
      onOpenChange(false);
      await onCreated(clientId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo crear la cita';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Nueva cita de oficina</DialogTitle>
          <DialogDescription>
            La cita queda ligada al expediente del cliente en la fecha seleccionada ({appointmentDate}).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cal-event-client">Cliente titular</Label>
            <Input
              id="cal-event-client"
              value={selectedClient ? selectedClient.name : clientQuery}
              onChange={(event) => {
                setClientId('');
                setClientQuery(event.target.value);
              }}
              placeholder="Buscar por nombre, correo o teléfono"
            />
            {!clientId ? (
              <div className="max-h-40 overflow-y-auto rounded-md border border-border">
                {filteredClients.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground">Sin clientes visibles</p>
                ) : (
                  filteredClients.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => {
                        setClientId(client.id);
                        setClientQuery(client.name);
                      }}
                      className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      <span className="font-medium">{client.name}</span>
                      <span className="text-xs text-muted-foreground">{client.email || client.phone}</span>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cal-event-time">Hora (opcional)</Label>
              <Input
                id="cal-event-time"
                type="time"
                value={appointmentTime}
                onChange={(event) => setAppointmentTime(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cal-event-role">Rol de oficina</Label>
              <select
                id="cal-event-role"
                value={officeRole}
                onChange={(event) => setOfficeRole(event.target.value as 'reviewer' | 'admin')}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="reviewer">Revisor</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cal-event-purpose">Motivo</Label>
            <Textarea
              id="cal-event-purpose"
              value={purposeNote}
              onChange={(event) => setPurposeNote(event.target.value)}
              placeholder="Motivo de la cita en oficina"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? 'Guardando…' : 'Crear cita'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
