import { Client, ClientStatus } from '@/types/form';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClientStatusBadge } from './ClientStatusBadge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, Trash2, User, Mail, Phone, FileText, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ClientCardProps {
  client: Client;
  onUpdateStatus: (status: ClientStatus) => void;
  onDelete: () => void;
  onView: () => void;
  onEdit: () => void;
}

export const ClientCard = ({
  client,
  onUpdateStatus,
  onDelete,
  onView,
  onEdit,
}: ClientCardProps) => {
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
