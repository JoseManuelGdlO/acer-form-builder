/** Primary shell view keys used by `Index` routing. */
export type ShellView =
  | 'dashboard'
  | 'forms'
  | 'clients'
  | 'products'
  | 'calendar'
  | 'finance'
  | 'paymentLogs'
  | 'groups'
  | 'trips'
  | 'users'
  | 'roles'
  | 'chatbot'
  | 'settings';

/** Minimum permissions to show / enter each area (OR within each array). */
export const VIEW_ENTRY_PERMISSIONS: Record<ShellView, string[]> = {
  dashboard: ['nav.dashboard.view'],
  forms: ['nav.forms.view'],
  clients: ['nav.clients.view'],
  products: ['nav.products.view'],
  calendar: ['nav.calendar.view'],
  finance: ['nav.finance.view'],
  paymentLogs: ['nav.payment_logs.view'],
  groups: ['nav.groups.view'],
  trips: ['nav.trips.view'],
  users: ['nav.users.view'],
  roles: ['roles.view'],
  chatbot: ['nav.chatbot.view'],
  settings: ['nav.settings.view'],
};
