export interface NotificationItem {
  notificationId: string;
  type: string;
  title: string | null;
  message: string;
  data: Record<string, unknown> | null;
  actionUrl: string | null;
  createdAt: Date;
  readAt: Date | null;
}

