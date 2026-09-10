import type { HeaderSearchSection } from '@/hooks/useHeaderGlobalSearch';
import type { ShellView } from '@/auth/viewPermissions';
import { cn } from '@/lib/utils';

type HeaderSearchResultsProps = {
  loading: boolean;
  empty: boolean;
  sections: HeaderSearchSection[];
  onSelectHit: (section: HeaderSearchSection, id: string) => void;
  onSeeAll: (view: ShellView) => void;
};

export function HeaderSearchResults({
  loading,
  empty,
  sections,
  onSelectHit,
  onSeeAll,
}: HeaderSearchResultsProps) {
  return (
    <div className="max-h-80 overflow-y-auto p-2">
      {loading ? (
        <p className="px-2 py-3 text-sm text-muted-foreground">Buscando…</p>
      ) : null}
      {empty ? (
        <p className="px-2 py-3 text-sm text-muted-foreground">Sin resultados en módulos visibles</p>
      ) : null}
      {sections.map((section) => (
        <div key={section.id} className="mb-2 last:mb-0">
          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {section.label}
          </p>
          {section.hits.length === 0 ? (
            <p className="px-2 py-1 text-xs text-muted-foreground">Sin coincidencias</p>
          ) : (
            section.hits.map((hit) => (
              <button
                key={hit.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onSelectHit(section, hit.id)}
                className={cn(
                  'flex w-full flex-col rounded-md px-2 py-1.5 text-left hover:bg-muted',
                )}
              >
                <span className="truncate text-sm font-medium text-foreground">{hit.title}</span>
                {hit.subtitle ? (
                  <span className="truncate text-xs text-muted-foreground">{hit.subtitle}</span>
                ) : null}
              </button>
            ))
          )}
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSeeAll(section.view)}
            className="px-2 py-1 text-xs font-medium text-primary hover:underline"
          >
            Ver todos en {section.label.toLowerCase()}
          </button>
        </div>
      ))}
    </div>
  );
}
