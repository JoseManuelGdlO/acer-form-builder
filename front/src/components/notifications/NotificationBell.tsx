import { useEffect, useState, useCallback } from 'react';
import { Bell, Loader2, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNotifications } from '@/hooks/useNotifications';
import type { NotificationItem } from '@/types/notifications';
import { cn } from '@/lib/utils';

const getNavigationUrlFromAction = (actionUrl: string): string => {
  const legacyMatch = actionUrl.match(/^\/clients\/([^/?#]+)/);
  if (legacyMatch?.[1]) {
    return `/?view=clients&clientId=${encodeURIComponent(legacyMatch[1])}`;
  }
  return actionUrl;
};

const NotificationBellItem = ({
  n,
  onDismiss,
}: {
  n: NotificationItem;
  onDismiss: (notificationId: string) => Promise<void>;
}) => {
  return (
    <div className="flex w-full items-center gap-2">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className={cn('text-sm font-medium', !n.readAt ? 'text-primary' : 'text-foreground')}>
          {n.title || n.type}
        </div>
        <div className="text-xs text-muted-foreground line-clamp-2">{n.message}</div>
        <div className="text-[10px] text-muted-foreground">{format(n.createdAt, 'HH:mm', { locale: es })}</div>
      </div>
      <Button
        type="button"
        size="icon"
        className="h-8 w-8 shrink-0 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90"
        title="Descartar notificación"
        onClick={async (event) => {
          event.preventDefault();
          event.stopPropagation();
          await onDismiss(n.notificationId);
        }}
      >
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
};

export function NotificationBell() {
  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    ensurePushEnabled,
    markAllAsRead,
    markNotificationRead,
    dismissNotification,
    dismissAllNotifications,
  } = useNotifications();

  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchNotifications().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATIONS_UPDATED') {
        fetchNotifications().catch(() => undefined);
      }
    };

    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [fetchNotifications]);

  const onOpenChange = useCallback(
    async (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (!nextOpen) return;

      // This may trigger a browser permission prompt; it must be invoked from a user gesture.
      await ensurePushEnabled();

      await fetchNotifications();
      await markAllAsRead();
    },
    [ensurePushEnabled, fetchNotifications, markAllAsRead]
  );

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 relative h-8 w-8 p-0">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[26rem] max-w-[90vw]">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificaciones</span>
          {unreadCount > 0 ? <span className="text-xs text-muted-foreground">{unreadCount} nuevas</span> : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {loading ? (
          <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Cargando...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-3 text-sm text-muted-foreground">No hay notificaciones.</div>
        ) : (
          <div className="max-h-96 overflow-auto">
            {notifications.slice(0, 10).map((n) => (
              <DropdownMenuItem
                key={n.notificationId}
                onClick={async () => {
                  await markNotificationRead(n.notificationId);
                  if (n.actionUrl) {
                    window.location.href = getNavigationUrlFromAction(n.actionUrl);
                  }
                }}
                className="cursor-pointer"
              >
                <NotificationBellItem n={n} onDismiss={dismissNotification} />
              </DropdownMenuItem>
            ))}
          </div>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            await fetchNotifications();
          }}
          className="cursor-pointer"
        >
          Actualizar
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={async () => {
            await markAllAsRead();
            await fetchNotifications();
          }}
          className="cursor-pointer"
        >
          Marcar todas como leídas
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={async () => {
            await dismissAllNotifications();
          }}
          className="cursor-pointer"
        >
          Descartar todas
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

