import { useId, type ReactNode } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ToolbarProps = {
  search?: string;
  onSearchChange?: (value: string) => void;
  placeholder?: string;
  onFiltersClick?: () => void;
  filtersLabel?: string;
  children?: ReactNode;
  className?: string;
};

/**
 * Barra de búsqueda + filtros + CTA.
 * `onSearchChange` / `onFiltersClick` son opcionales: no dispara API por sí sola.
 */
export function Toolbar({
  search,
  onSearchChange,
  placeholder = 'Buscar…',
  onFiltersClick,
  filtersLabel = 'Filtros',
  children,
  className,
}: ToolbarProps) {
  const searchId = useId();
  const isControlled = onSearchChange != null;

  return (
    <div className={cn('mb-5 flex flex-wrap gap-2', className)}>
      <label
        htmlFor={searchId}
        className="flex min-w-64 flex-1 items-center gap-2 rounded-md border border-input bg-card px-3"
      >
        <Search className="size-4 text-muted-foreground" aria-hidden />
        <input
          id={searchId}
          type="search"
          {...(isControlled
            ? { value: search ?? '', onChange: (e) => onSearchChange(e.target.value) }
            : { defaultValue: search })}
          className="h-10 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          placeholder={placeholder}
        />
      </label>
      {onFiltersClick ? (
        <Button type="button" variant="outline" onClick={onFiltersClick}>
          <SlidersHorizontal />
          {filtersLabel}
        </Button>
      ) : null}
      {children}
    </div>
  );
}
