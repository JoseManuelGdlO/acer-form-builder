import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type SectionTitleProps = {
  title: string;
  action?: string;
  onAction?: () => void;
  children?: ReactNode;
  className?: string;
};

/** Encabezado de bloque/card con acción opcional. */
export function SectionTitle({ title, action, onAction, children, className }: SectionTitleProps) {
  const trailing = children ?? (
    action ? (
      <Button type="button" variant="ghost" size="sm" onClick={onAction}>
        {action}
      </Button>
    ) : null
  );

  return (
    <div className={cn('mb-4 flex items-center justify-between gap-3', className)}>
      <h2 className="font-display text-base font-semibold">{title}</h2>
      {trailing}
    </div>
  );
}
