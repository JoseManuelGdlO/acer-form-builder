import { ClientStatus, CLIENT_STATUS_CONFIG } from '@/types/form';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

interface ClientStatusBadgeProps {
  status: ClientStatus;
}

const statusIcons: Record<ClientStatus, React.ReactNode> = {
  active: <CheckCircle2 className="w-3.5 h-3.5" />,
  inactive: <XCircle className="w-3.5 h-3.5" />,
  pending: <Clock className="w-3.5 h-3.5" />,
};

export const ClientStatusBadge = ({ status }: ClientStatusBadgeProps) => {
  const config = CLIENT_STATUS_CONFIG[status];
  
  return (
    <Badge variant={config.color as 'success' | 'destructive' | 'warning'} className="gap-1.5">
      {statusIcons[status]}
      {config.label}
    </Badge>
  );
};
