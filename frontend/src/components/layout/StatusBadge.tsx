import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type StatusBadgeTone = 'success' | 'warning' | 'accent' | 'neutral';

export type StatusBadgeProps = {
  children: ReactNode;
  tone?: StatusBadgeTone;
  className?: string;
};

const TONE_CLASSES: Record<StatusBadgeTone, string> = {
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning-foreground',
  accent: 'bg-primary/15 text-primary',
  neutral: 'bg-muted text-muted-foreground',
};

/** Badge de estado con tokens semánticos. No reemplaza `@/components/ui/badge`. */
export function StatusBadge({ children, tone = 'neutral', className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
