import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';
import { cn, contrastingForeground } from '@/lib/utils';

interface ClientStatusBadgeProps {
  label?: string | null;
  color?: string | null;
}

export const ClientStatusBadge = ({ label, color }: ClientStatusBadgeProps) => {
  const fg = color ? contrastingForeground(color) : undefined;
  return (
    <Badge
      variant="secondary"
      className={cn(
        'gap-1.5 border-transparent',
        color && 'shadow-none hover:opacity-90'
      )}
      style={
        color
          ? {
              backgroundColor: color,
              color: fg,
              borderColor: 'transparent',
            }
          : undefined
      }
    >
      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={color ? { color: fg } : undefined} />
      {label || 'Sin estado'}
    </Badge>
  );
};
