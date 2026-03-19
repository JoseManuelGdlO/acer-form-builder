import { create } from 'zustand';
import { api } from '@/lib/api';
import type { NotificationItem } from '@/types/notifications';

const TOKEN_KEY = 'auth_token';

function urlBase64ToUint8Array(base64String: string) {
  // Convert Base64Url to Base64.
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

interface NotificationsState {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;

  fetchNotifications: () => Promise<void>;
  ensurePushEnabled: () => Promise<boolean>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export const useNotifications = create<NotificationsState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  fetchNotifications: async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      set({ notifications: [], unreadCount: 0 });
      return;
    }

    set({ loading: true });
    try {
      const data = await api.getNotifications();
      const list = Array.isArray(data) ? data : [];

      const normalized: NotificationItem[] = list.map((n: any) => ({
        notificationId: String(n.notificationId ?? n.id),
        type: String(n.type ?? ''),
        title: n.title ?? null,
        message: String(n.message ?? ''),
        data: n.data ?? null,
        actionUrl: n.actionUrl ?? null,
        createdAt: new Date(n.createdAt ?? n.created_at ?? Date.now()),
        readAt: n.readAt ? new Date(n.readAt) : null,
      }));

      const unreadCount = normalized.filter((x) => !x.readAt).length;
      set({ notifications: normalized, unreadCount, loading: false });
    } catch (err) {
      console.error('fetchNotifications error:', err);
      set({ notifications: [], unreadCount: 0, loading: false });
    }
  },

  ensurePushEnabled: async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return false;

    if (!('Notification' in window)) return false;
    if (!('serviceWorker' in navigator)) return false;
    if (!('PushManager' in window)) return false;

    // Ask permission only on user gesture (caller should invoke from click).
    if (Notification.permission !== 'granted') {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      let finalSubscription = subscription;
      if (!finalSubscription) {
        const vapid = await api.getVapidPublicKey();
        if (!vapid?.publicKey) return false;

        finalSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapid.publicKey),
        });
      }

      await api.registerPushSubscription(finalSubscription.toJSON());
      return true;
    } catch (err) {
      console.error('ensurePushEnabled error:', err);
      return false;
    }
  },

  markNotificationRead: async (notificationId: string) => {
    await api.markNotificationRead(notificationId);
    const now = new Date();
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.notificationId === notificationId ? { ...n, readAt: now } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllAsRead: async () => {
    const state = get();
    const unread = state.notifications.filter((n) => !n.readAt);
    if (unread.length === 0) return;

    await Promise.all(unread.map((n) => api.markNotificationRead(n.notificationId)));

    const now = new Date();
    set((s) => ({
      notifications: s.notifications.map((n) => (!n.readAt ? { ...n, readAt: now } : n)),
      unreadCount: 0,
    }));
  },
}));

