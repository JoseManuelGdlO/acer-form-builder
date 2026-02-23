import { Client, ClientStatus } from '@/types/form';
import { User as UserType } from '@/types/user';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClientStatusBadge } from './ClientStatusBadge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, Trash2, User, Mail, Phone, FileText, Edit2, DollarSign, UserCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ClientCardProps {
  client: Client;
  onUpdateStatus: (status: ClientStatus) => void;
  onDelete: () => void;
  onView: () => void;
  onEdit: () => void;
  onUpdate?: (clientId: string, updates: Partial<Client>) => void;
  users?: UserType[];
  isAdmin?: boolean;
}

export const ClientCard = ({
  client,
  onUpdateStatus,
  onDelete,
  onView,
  onEdit,
  onUpdate,
  users = [],
  isAdmin = false,
}: ClientCardProps) => {
  const handleAssignAdvisor = (userId: string) => {
    if (!onUpdate) return;
    onUpdate(client.id, {
      assignedUserId: userId === '__none__' ? (null as unknown as string) : userId,
    } as Partial<Client>);
  };

  return (
    <Card className="group hover:shadow-card-hover transition-all duration-300 border-border/50 hover:border-primary/30">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-lg">
                    {client.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                    <Mail className="w-3.5 h-3.5" />
                    <span>{client.email}</span>
                  </div>
                </div>
              </div>
              <ClientStatusBadge status={client.status} />
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              {client.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-4 h-4" />
                  <span>{client.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                <span>{client.formsCompleted} formularios completados</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <UserCircle className="w-4 h-4 text-muted-foreground shrink-0" />
              {isAdmin && users.length > 0 ? (
                <Select
                  value={client.assignedUserId ?? '__none__'}
                  onValueChange={handleAssignAdvisor}
                >
                  <SelectTrigger className="h-8 w-[200px] border-muted/60 bg-muted/20">
                    <SelectValue placeholder="Asignar asesor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin asignar</SelectItem>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-muted-foreground">
                  Asesor: {client.assignedUser?.name ?? 'Sin asignar'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-sm bg-muted/40 rounded-lg px-3 py-2">
              <DollarSign className="w-4 h-4 text-primary shrink-0" />
              <span className="text-muted-foreground">
                Total a pagar: <span className="font-medium text-foreground">{client.totalAmountDue != null ? client.totalAmountDue.toFixed(2) : '—'}</span>
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">
                Pagado: <span className="font-medium text-foreground">{(client.totalPaid ?? 0).toFixed(2)}</span>
              </span>
            </div>

            {client.notes && (
              <p className="text-sm text-muted-foreground italic bg-muted/30 px-3 py-2 rounded-lg">
                {client.notes}
              </p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onView}>
                <Eye className="w-4 h-4 mr-2" />
                Ver detalles
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                <Edit2 className="w-4 h-4 mr-2" />
                Editar cliente
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onUpdateStatus('active')}>
                Marcar como Activo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUpdateStatus('pending')}>
                Marcar como Pendiente
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUpdateStatus('inactive')}>
                Marcar como Inactivo
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
};
