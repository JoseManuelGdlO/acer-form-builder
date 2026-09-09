import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type PageChromeProps = {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
};

/** Título + subtítulo de vista. No incluye fetch ni wiring de `?view=`. */
export function PageChrome({ title, subtitle, children, className }: PageChromeProps) {
  return (
    <div className={cn('border-b border-border bg-card/80', className)}>
      <div className="mx-auto flex min-h-20 max-w-[1600px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <div className="min-w-0">
          <h1 className="truncate font-display text-xl font-semibold sm:text-2xl">{title}</h1>
          {subtitle ? (
            <p className="hidden text-xs text-muted-foreground sm:block">{subtitle}</p>
          ) : null}
        </div>
        {children ? <div className="ml-auto flex shrink-0 items-center gap-2">{children}</div> : null}
      </div>
    </div>
  );
}
