import { Client } from '@/types/form';
import { User as UserType } from '@/types/user';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge, type StatusBadgeTone } from '@/components/layout/StatusBadge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, Trash2, Edit2, UserCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatPhoneNumberDisplay } from '@/lib/phone';
import type { MouseEvent } from 'react';

interface ClientCardProps {
  client: Client;
  onDelete: () => void;
  onView: () => void;
  onEdit: () => void;
  onUpdate?: (clientId: string, updates: Partial<Client>) => void;
  users?: UserType[];
  isAdmin?: boolean;
}

const STATUS_META: Record<Client['status'], { label: string; tone: StatusBadgeTone }> = {
  active: { label: 'Activo', tone: 'success' },
  inactive: { label: 'Inactivo', tone: 'neutral' },
  pending: { label: 'Pendiente', tone: 'warning' },
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function clientContext(client: Client): { label: string; value: string } | null {
  const tripTitles = (client.assignedTrips ?? []).map((trip) => trip.title).filter(Boolean);
  if (tripTitles.length > 0) {
    return { label: 'Viaje', value: tripTitles.join(', ') };
  }
  if (client.product?.title) {
    return { label: 'Producto', value: client.product.title };
  }
  const appointmentDate = client.nextOfficeAppointment?.appointmentDate;
  if (!appointmentDate) return null;
  const parsed = new Date(`${appointmentDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  const formatted = format(parsed, 'd MMM yyyy', { locale: es });
  const note = client.nextOfficeAppointment?.purposeNote?.trim();
  return {
    label: 'Próxima cita',
    value: note ? `${formatted} — ${note}` : formatted,
  };
}

export const ClientCard = ({
  client,
  onDelete,
  onView,
  onEdit,
  onUpdate,
  users = [],
  isAdmin = false,
}: ClientCardProps) => {
  const status = STATUS_META[client.status] ?? STATUS_META.pending;
  const context = clientContext(client);
  const due = client.totalAmountDue;
  const paid = client.totalPaid ?? 0;
  const showPaymentBar = due != null && Number.isFinite(due);
  const paidRatio = showPaymentBar && due > 0 ? Math.min(100, Math.max(0, (paid / due) * 100)) : 0;
  const contactLine = [client.email?.trim(), client.phone ? formatPhoneNumberDisplay(client.phone) : '']
    .filter(Boolean)
    .join(' · ');
  const familyCount = client.children?.length ?? 0;
  const canReassign = Boolean(isAdmin && onUpdate && users.length > 0);

  const handleCardClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-no-view="true"]')) return;
    onView();
  };

  const handleAssignAdvisor = (userId: string) => {
    if (!onUpdate) return;
    onUpdate(client.id, {
      assignedUserId: userId === '__none__' ? (null as unknown as string) : userId,
    } as Partial<Client>);
  };

  return (
    <Card className="group cursor-pointer overflow-hidden border-border p-0 shadow-sm transition-colors hover:border-primary/30">
      <CardContent className="p-5" onClick={handleCardClick}>
        <div className="flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary/35 font-display font-bold text-secondary-foreground">
            {initialsFromName(client.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display font-semibold">{client.name}</h2>
              <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            </div>
            {contactLine ? (
              <p className="mt-1 truncate text-xs text-muted-foreground">{contactLine}</p>
            ) : null}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                data-no-view="true"
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                aria-label="Acciones del cliente"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent data-no-view="true" align="end" className="w-48">
              <DropdownMenuItem data-no-view="true" onClick={onView}>
                <Eye className="mr-2 size-4" />
                Ver detalles
              </DropdownMenuItem>
              <DropdownMenuItem data-no-view="true" onClick={onEdit}>
                <Edit2 className="mr-2 size-4" />
                Editar cliente
              </DropdownMenuItem>
              {canReassign ? (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger data-no-view="true">
                    <UserCircle className="mr-2 size-4" />
                    Reasignar asesor
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent data-no-view="true" className="max-h-64 overflow-y-auto">
                    <DropdownMenuItem data-no-view="true" onClick={() => handleAssignAdvisor('__none__')}>
                      Sin asignar
                    </DropdownMenuItem>
                    {users.map((user) => (
                      <DropdownMenuItem
                        key={user.id}
                        data-no-view="true"
                        onClick={() => handleAssignAdvisor(user.id)}
                      >
                        {user.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                data-no-view="true"
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 size-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
          {context ? (
            <div className="min-w-0">
              <p className="text-muted-foreground">{context.label}</p>
              <p className="mt-1 truncate font-medium" title={context.value}>
                {context.value}
              </p>
            </div>
          ) : null}
          <div className={context ? 'min-w-0' : 'col-span-2 min-w-0'}>
            <p className="text-muted-foreground">Asesor</p>
            <p className="mt-1 truncate font-medium">
              {client.assignedUser?.name ?? 'Sin asignar'}
            </p>
          </div>
          {showPaymentBar ? (
            <div className="col-span-2">
              <div className="mb-1 flex justify-between">
                <span>Pagado</span>
                <span className="font-semibold">
                  {paid.toFixed(2)} / {due.toFixed(2)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${paidRatio}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>

        {familyCount > 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            {familyCount} familiar{familyCount === 1 ? '' : 'es'}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
};
