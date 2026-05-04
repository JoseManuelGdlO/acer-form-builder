import { Client } from '@/types/form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ClientStatusBadge } from './ClientStatusBadge';
import { Separator } from '@/components/ui/separator';
import { User, Mail, Phone, MapPin, FileText, Calendar, Clock, Bus } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatPhoneOptional } from '@/lib/phone';

interface ClientDetailModalProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ClientDetailModal = ({
  client,
  open,
  onOpenChange,
}: ClientDetailModalProps) => {
  if (!client) return null;

  const accountStatus =
    client.status === 'active'
      ? { label: 'Activo', color: '#16a34a' }
      : client.status === 'inactive'
        ? { label: 'Inactivo', color: '#64748b' }
        : { label: 'Pendiente', color: '#ca8a04' };

  const formatBirthDate = (value?: string | null) => {
    if (!value) return 'No registrada';
    const normalized = value.length >= 10 ? value.slice(0, 10) : value;
    const parsedDate = new Date(`${normalized}T00:00:00`);
    if (Number.isNaN(parsedDate.getTime())) return normalized;
    return format(parsedDate, "d 'de' MMMM, yyyy", { locale: es });
  };

  const infoItems = [
    ...(client.parentClientId
      ? []
      : [
          { icon: Mail, label: 'Correo electrónico', value: client.email },
          { icon: Phone, label: 'Teléfono', value: formatPhoneOptional(client.phone) },
          { icon: MapPin, label: 'Dirección', value: client.address || 'No registrada' },
        ]),
    ...(client.parentClientId
      ? [
          { icon: Calendar, label: 'Fecha de nacimiento', value: formatBirthDate(client.birthDate) },
          { icon: User, label: 'Parentesco con titular', value: client.relationshipToHolder?.trim() || 'No registrado' },
        ]
      : []),
    { icon: FileText, label: 'Formularios completados', value: `${client.formsCompleted}` },
    { 
      icon: Calendar, 
      label: 'Fecha de registro', 
      value: format(client.createdAt, "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es }) 
    },
    { 
      icon: Clock, 
      label: 'Última actualización', 
      value: format(client.updatedAt, "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es }) 
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">
                  {client.name}
                </DialogTitle>
                <ClientStatusBadge label={accountStatus.label} color={accountStatus.color} />
              </div>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <div className="space-y-4 py-4">
          {infoItems.map((item, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                <item.icon className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="font-medium text-foreground">{item.value}</p>
              </div>
            </div>
          ))}
          {client.assignedTrips && client.assignedTrips.length > 0 && (
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                <Bus className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">En viaje(s)</p>
                <p className="font-medium text-foreground">{client.assignedTrips.map(t => t.title).join(', ')}</p>
              </div>
            </div>
          )}
        </div>

        {client.notes && (
          <>
            <Separator />
            <div className="py-4">
              <h4 className="font-medium text-foreground mb-2">Notas</h4>
              <p className="text-muted-foreground bg-muted/30 p-3 rounded-lg">
                {client.notes}
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
