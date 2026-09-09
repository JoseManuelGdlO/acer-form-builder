import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';
import type { ShellView } from '@/auth/viewPermissions';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AppHeader, type AppHeaderCta } from './AppHeader';
import { PageChrome } from './PageChrome';
import { SHELL_VIEW_META } from './shellNav';

export type AppShellProps = {
  currentView: ShellView;
  viewingAs?: boolean;
  onNavigate: (view: ShellView) => void;
  clientCount?: number | null;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  cta?: AppHeaderCta | null;
  children: ReactNode;
};

/**
 * Chrome autenticado: header TravelUp + título de vista.
 * No lee `?view=` ni llama stores; el caller conserva el orquestador.
 */
export function AppShell({
  currentView,
  viewingAs = false,
  onNavigate,
  clientCount,
  searchValue,
  onSearchChange,
  cta,
  children,
}: AppShellProps) {
  const meta = SHELL_VIEW_META[currentView];

  return (
    <div className={cn('min-h-screen bg-background', viewingAs && 'pt-10')}>
      <AppHeader
        currentView={currentView}
        onNavigate={onNavigate}
        clientCount={clientCount}
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        cta={cta}
        offsetForViewAs={viewingAs}
      />
      <PageChrome title={meta.title} subtitle={meta.subtitle}>
        {cta ? (
          <Button type="button" className="sm:hidden" size="icon" onClick={cta.onClick} aria-label={cta.label}>
            <Plus />
          </Button>
        ) : null}
      </PageChrome>
      {children}
    </div>
  );
}
