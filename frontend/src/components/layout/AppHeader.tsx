import { useMemo, useState } from 'react';
import { ChevronDown, LogOut, Menu, Plus, Search, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { VIEW_ENTRY_PERMISSIONS, type ShellView } from '@/auth/viewPermissions';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  HEADER_SEARCHABLE_VIEWS,
  SHELL_NAV_GROUPS,
  SHELL_VIEW_META,
  type ShellNavGroup,
  type ShellNavItem,
} from './shellNav';

export type AppHeaderCta = {
  label: string;
  onClick: () => void;
};

export type AppHeaderProps = {
  currentView: ShellView;
  onNavigate: (view: ShellView) => void;
  clientCount?: number | null;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  cta?: AppHeaderCta | null;
  offsetForViewAs?: boolean;
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function TopNavGroup({
  group,
  currentView,
  onNavigate,
  clientCount,
}: {
  group: ShellNavGroup;
  currentView: ShellView;
  onNavigate: (view: ShellView) => void;
  clientCount?: number | null;
}) {
  const active = group.items.some((item) => item.id === currentView);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'h-14 rounded-none border-b-2 px-4 font-display',
            active
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:border-primary/40 hover:text-foreground',
          )}
        >
          {group.label}
          <ChevronDown className="size-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 p-2">
        {group.items.map((item) => (
          <NavDropdownItem
            key={item.id}
            item={item}
            currentView={currentView}
            onNavigate={onNavigate}
            clientCount={clientCount}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NavDropdownItem({
  item,
  currentView,
  onNavigate,
  clientCount,
}: {
  item: ShellNavItem;
  currentView: ShellView;
  onNavigate: (view: ShellView) => void;
  clientCount?: number | null;
}) {
  const Icon = item.icon;
  const isActive = currentView === item.id;
  const meta = SHELL_VIEW_META[item.id];

  return (
    <DropdownMenuItem
      onSelect={() => onNavigate(item.id)}
      className={cn('cursor-pointer gap-3 p-3', isActive && 'bg-primary/10 text-primary')}
    >
      <span
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-md bg-muted',
          isActive && 'bg-primary text-primary-foreground',
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="block text-sm font-semibold">{item.label}</span>
          {item.id === 'clients' && clientCount != null && clientCount > 0 ? (
            <span className="rounded-full bg-secondary/20 px-1.5 py-0.5 text-[10px] font-semibold text-secondary-foreground">
              {clientCount}
            </span>
          ) : null}
        </span>
        <span className="block text-[11px] text-muted-foreground">{meta.subtitle}</span>
      </span>
    </DropdownMenuItem>
  );
}

function MobileNavButton({
  item,
  currentView,
  onNavigate,
  clientCount,
}: {
  item: ShellNavItem;
  currentView: ShellView;
  onNavigate: (view: ShellView) => void;
  clientCount?: number | null;
}) {
  const Icon = item.icon;
  const isActive = currentView === item.id;

  return (
    <Button
      type="button"
      variant={isActive ? 'default' : 'ghost'}
      className="justify-start"
      onClick={() => onNavigate(item.id)}
    >
      <Icon />
      <span className="flex-1 text-left">{item.label}</span>
      {item.id === 'clients' && clientCount != null && clientCount > 0 ? (
        <span className="rounded-full bg-secondary/20 px-1.5 py-0.5 text-[10px] font-semibold text-secondary-foreground">
          {clientCount}
        </span>
      ) : null}
    </Button>
  );
}

export function AppHeader({
  currentView,
  onNavigate,
  clientCount,
  searchValue = '',
  onSearchChange,
  cta,
  offsetForViewAs = false,
}: AppHeaderProps) {
  const { user, company, logout, canAny } = useAuth();
  const { tenant } = useTenant();
  const companyName = company?.name || tenant?.company?.name || 'Compañía';
  const logoUrl = company?.logoUrl ?? tenant?.company?.logoUrl ?? null;
  const [mobileNav, setMobileNav] = useState(false);
  const searchEnabled = HEADER_SEARCHABLE_VIEWS.includes(currentView);
  const pageTitle = SHELL_VIEW_META[currentView]?.title;

  const visibleGroups = useMemo(
    () =>
      SHELL_NAV_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter((item) => canAny(VIEW_ENTRY_PERMISSIONS[item.id])),
      })).filter((group) => group.items.length > 0),
    [canAny],
  );

  const go = (view: ShellView) => {
    onNavigate(view);
    setMobileNav(false);
  };

  const searchPlaceholder = searchEnabled
    ? currentView === 'clients'
      ? 'Buscar clientes…'
      : currentView === 'trips'
        ? 'Buscar viajes…'
        : currentView === 'quotes'
          ? 'Buscar cotizaciones…'
          : 'Buscar productos…'
    : 'Buscar en esta vista…';

  return (
    <header className={cn('sticky z-30 shadow-sm', offsetForViewAs ? 'top-10' : 'top-0')}>
      <div className="bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex h-20 max-w-[1600px] items-center gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 shrink-0 items-center gap-2.5">
            {logoUrl ? (
              <img src={logoUrl} alt={companyName} className="h-11 w-auto max-w-40 shrink-0 object-contain object-left" />
            ) : (
              <span className="truncate font-display text-lg font-bold text-sidebar-foreground">{companyName}</span>
            )}
            {logoUrl ? (
              <span className="hidden truncate font-display text-sm font-semibold text-sidebar-foreground min-[420px]:block max-w-[10rem]">
                {companyName}
              </span>
            ) : null}
          </div>

          <label
            className={cn(
              'mx-auto hidden w-full max-w-xl items-center gap-2 rounded-md border border-sidebar-border bg-sidebar-accent px-3 py-2 lg:flex',
              !searchEnabled && 'opacity-60',
            )}
          >
            <Search className="size-4 opacity-60" aria-hidden />
            <input
              value={searchValue}
              onChange={(event) => onSearchChange?.(event.target.value)}
              disabled={!searchEnabled}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-sidebar-foreground/50"
              placeholder={searchPlaceholder}
              aria-label="Búsqueda de la vista activa"
            />
          </label>

          <div className="ml-auto flex items-center gap-2">
            {cta ? (
              <Button
                type="button"
                className="hidden bg-primary text-primary-foreground hover:bg-primary/90 sm:inline-flex"
                onClick={cta.onClick}
              >
                <Plus />
                {cta.label}
              </Button>
            ) : null}

            <NotificationBell triggerClassName="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="hidden items-center gap-3 border-l border-sidebar-border pl-3 sm:flex"
                    aria-label="Menú de usuario"
                  >
                    <div className="text-right">
                      <p className="text-xs font-semibold">{user.name}</p>
                      <p className="text-[10px] text-sidebar-foreground/60">{user.role?.name ?? user.email}</p>
                    </div>
                    <div className="grid size-9 place-items-center rounded-full bg-secondary font-display text-xs font-bold text-secondary-foreground">
                      {initialsFromName(user.name)}
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="mr-2 size-4" />
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}

            <Button
              variant="ghost"
              size="icon"
              className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground lg:hidden"
              onClick={() => setMobileNav((open) => !open)}
              aria-label={mobileNav ? 'Cerrar menú' : 'Abrir menú'}
            >
              {mobileNav ? <X /> : <Menu />}
            </Button>
          </div>
        </div>
      </div>

      <div className="hidden border-b border-border bg-card lg:block">
        <nav className="mx-auto flex h-14 max-w-[1600px] items-center gap-1 px-8" aria-label="Navegación principal">
          {visibleGroups.map((group) => (
            <TopNavGroup
              key={group.label}
              group={group}
              currentView={currentView}
              onNavigate={go}
              clientCount={clientCount}
            />
          ))}
          {pageTitle ? <p className="ml-auto text-xs text-muted-foreground">{pageTitle}</p> : null}
        </nav>
      </div>

      {mobileNav ? (
        <div className="max-h-[calc(100vh-5rem)] overflow-y-auto border-b border-border bg-card p-4 shadow-xl lg:hidden">
          <label className="mb-4 flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2">
            <Search className="size-4 text-muted-foreground" aria-hidden />
            <input
              value={searchValue}
              onChange={(event) => onSearchChange?.(event.target.value)}
              disabled={!searchEnabled}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              placeholder={searchPlaceholder}
              aria-label="Búsqueda de la vista activa"
            />
          </label>
          <nav className="grid gap-5 sm:grid-cols-3" aria-label="Navegación móvil">
            {visibleGroups.map((group) => (
              <div key={group.label}>
                <p className="mb-2 px-2 text-[10px] font-semibold uppercase text-muted-foreground">{group.label}</p>
                <div className="grid gap-1">
                  {group.items.map((item) => (
                    <MobileNavButton
                      key={item.id}
                      item={item}
                      currentView={currentView}
                      onNavigate={go}
                      clientCount={clientCount}
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>
          {user ? (
            <div className="mt-6 border-t border-border pt-4">
              <p className="px-2 text-sm font-medium">{user.name}</p>
              <p className="px-2 text-xs text-muted-foreground">{user.email}</p>
              <Button
                variant="ghost"
                onClick={logout}
                className="mt-2 w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="mr-2 size-4" />
                Cerrar Sesión
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
