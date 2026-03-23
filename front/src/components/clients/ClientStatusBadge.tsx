import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';

interface ClientStatusBadgeProps {
  label?: string | null;
}

export const ClientStatusBadge = ({ label }: ClientStatusBadgeProps) => {
  return (
    <Badge variant="secondary" className="gap-1.5">
      <CheckCircle2 className="w-3.5 h-3.5" />
      {label || 'Sin estado'}
    </Badge>
  );
};
