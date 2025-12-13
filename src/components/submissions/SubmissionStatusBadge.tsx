import { SubmissionStatus, SUBMISSION_STATUS_CONFIG } from '@/types/form';
import { Badge } from '@/components/ui/badge';
import { Clock, Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface SubmissionStatusBadgeProps {
  status: SubmissionStatus;
}

const statusIcons: Record<SubmissionStatus, React.ReactNode> = {
  pending: <Clock className="w-3 h-3" />,
  in_progress: <Loader2 className="w-3 h-3 animate-spin" />,
  completed: <CheckCircle2 className="w-3 h-3" />,
  cancelled: <XCircle className="w-3 h-3" />,
};

export const SubmissionStatusBadge = ({ status }: SubmissionStatusBadgeProps) => {
  const config = SUBMISSION_STATUS_CONFIG[status];
  
  return (
    <Badge 
      variant={config.color as 'warning' | 'info' | 'success' | 'destructive'}
      className="flex items-center gap-1.5"
    >
      {statusIcons[status]}
      {config.label}
    </Badge>
  );
};
