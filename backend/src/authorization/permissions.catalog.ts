/**
 * Global permission catalog (keys are stable; labels live in UI).
 * Convention: resource.action — view scope uses view_all | view_assigned where needed.
 */
export const PERMISSION_KEYS = [
  // Navigation (shell)
  'nav.dashboard.view',
  'nav.clients.view',
  'nav.calendar.view',
  'nav.forms.view',
  'nav.products.view',
  'nav.hotels.view',
  'nav.trips.view',
  'nav.admin.view',
  'nav.finance.view',
  'nav.payment_logs.view',
  'nav.users.view',
  'nav.chatbot.view',
  'nav.settings.view',
  'nav.groups.view',

  // Clients CRM
  'clients.view_all',
  'clients.view_assigned',
  'clients.create',
  'clients.update',
  'clients.delete',
  'clients.reassign_advisor',

  'client_financials.view',
  'client_financials.update',

  'client_payments.view',
  'client_payments.create',
  'client_payments.update',
  'client_payments.delete',

  /** Historiales sensibles (cambios total a pagar, pagos eliminados) — típicamente solo administración */
  'client_audit_logs.view',

  // Submissions
  'submissions.view_all',
  'submissions.view_assigned',
  'submissions.update',
  'submissions.delete',

  // Per-client satellite
  'client_messages.view',
  'client_messages.create',
  'client_messages.update',
  'client_messages.delete',

  'client_notes.view',
  'client_notes.create',
  'client_notes.update',
  'client_notes.delete',

  'client_checklist.view',
  'client_checklist.update',

  // Calendar / internal appointments
  'appointments.view',
  'appointments.create',
  'appointments.update',
  'appointments.delete',

  // Forms
  'forms.view',
  'forms.create',
  'forms.update',
  'forms.delete',

  // Catalog
  'products.view',
  'products.create',
  'products.update',
  'products.delete',

  'hotels.view',
  'hotels.create',
  'hotels.update',
  'hotels.delete',

  'categories.view',
  'categories.create',
  'categories.update',
  'categories.delete',

  // Trips
  'trips.view',
  'trips.create',
  'trips.update',
  'trips.delete',
  /** Participantes y asientos (revisor histórico) */
  'trips.participants_manage',
  /** Quitar participante, limpiar asientos, invitaciones, log (antes solo super_admin) */
  'trips.office_admin',

  'trip_invitations.view',
  'trip_invitations.create',
  'trip_invitations.update',
  'trip_invitations.delete',

  'trip_bus_templates.view',
  'trip_bus_templates.create',
  'trip_bus_templates.update',
  'trip_bus_templates.delete',

  'trip_finance.view',

  'companies.view',

  // Finance
  'finance.view',
  'payment_logs.view',

  // Admin
  'users.view',
  'users.create',
  'users.update',
  'users.delete',

  'roles.view',
  'roles.create',
  'roles.update',
  'roles.delete',

  'branches.view',
  'branches.create',
  'branches.update',
  'branches.delete',

  'company_branding.view',
  'company_branding.update',

  'checklist_templates.view',
  'checklist_templates.create',
  'checklist_templates.update',
  'checklist_templates.delete',

  'faqs.view',
  'faqs.create',
  'faqs.update',
  'faqs.delete',

  'bot_behavior.view',
  'bot_behavior.update',

  'groups.view',
  'groups.create',
  'groups.update',
  'groups.delete',

  'notifications.view',
  'notifications.create',
  'notifications.update',
  'notifications.delete',

  'conversations.view',
  'conversations.update',

  'session.view_as',
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

const NAV_KEYS: PermissionKey[] = [
  'nav.dashboard.view',
  'nav.clients.view',
  'nav.calendar.view',
  'nav.forms.view',
  'nav.products.view',
  'nav.hotels.view',
  'nav.trips.view',
  'nav.admin.view',
  'nav.finance.view',
  'nav.payment_logs.view',
  'nav.users.view',
  'nav.chatbot.view',
  'nav.settings.view',
  'nav.groups.view',
];

export const PERMISSION_GROUPS: { id: string; label: string; keys: readonly PermissionKey[] }[] = [
  {
    id: 'nav',
    label: 'Navegación',
    keys: NAV_KEYS,
  },
  {
    id: 'clients',
    label: 'Clientes',
    keys: [
      'clients.view_all',
      'clients.view_assigned',
      'clients.create',
      'clients.update',
      'clients.delete',
      'clients.reassign_advisor',
      'client_financials.view',
      'client_financials.update',
      'client_payments.view',
      'client_payments.create',
      'client_payments.update',
      'client_payments.delete',
      'client_audit_logs.view',
    ],
  },
  {
    id: 'submissions',
    label: 'Envíos',
    keys: ['submissions.view_all', 'submissions.view_assigned', 'submissions.update', 'submissions.delete'],
  },
  {
    id: 'comms',
    label: 'Mensajes, notas y checklist',
    keys: [
      'client_messages.view',
      'client_messages.create',
      'client_messages.update',
      'client_messages.delete',
      'client_notes.view',
      'client_notes.create',
      'client_notes.update',
      'client_notes.delete',
      'client_checklist.view',
      'client_checklist.update',
    ],
  },
  {
    id: 'appointments',
    label: 'Citas / calendario',
    keys: ['appointments.view', 'appointments.create', 'appointments.update', 'appointments.delete'],
  },
  {
    id: 'forms',
    label: 'Formularios',
    keys: ['forms.view', 'forms.create', 'forms.update', 'forms.delete'],
  },
  {
    id: 'catalog',
    label: 'Productos, categorías y hoteles',
    keys: [
      'products.view',
      'products.create',
      'products.update',
      'products.delete',
      'hotels.view',
      'hotels.create',
      'hotels.update',
      'hotels.delete',
      'categories.view',
      'categories.create',
      'categories.update',
      'categories.delete',
    ],
  },
  {
    id: 'trips',
    label: 'Viajes',
    keys: [
      'trips.view',
      'trips.create',
      'trips.update',
      'trips.delete',
      'trips.participants_manage',
      'trips.office_admin',
      'trip_invitations.view',
      'trip_invitations.create',
      'trip_invitations.update',
      'trip_invitations.delete',
      'trip_bus_templates.view',
      'trip_bus_templates.create',
      'trip_bus_templates.update',
      'trip_bus_templates.delete',
      'trip_finance.view',
      'companies.view',
    ],
  },
  {
    id: 'finance',
    label: 'Finanzas',
    keys: ['finance.view', 'payment_logs.view'],
  },
  {
    id: 'users_roles',
    label: 'Usuarios y roles',
    keys: [
      'users.view',
      'users.create',
      'users.update',
      'users.delete',
      'roles.view',
      'roles.create',
      'roles.update',
      'roles.delete',
      'session.view_as',
    ],
  },
  {
    id: 'tenant',
    label: 'Configuración del tenant',
    keys: [
      'branches.view',
      'branches.create',
      'branches.update',
      'branches.delete',
      'company_branding.view',
      'company_branding.update',
      'checklist_templates.view',
      'checklist_templates.create',
      'checklist_templates.update',
      'checklist_templates.delete',
      'faqs.view',
      'faqs.create',
      'faqs.update',
      'faqs.delete',
      'bot_behavior.view',
      'bot_behavior.update',
    ],
  },
  {
    id: 'other',
    label: 'Otros',
    keys: [
      'groups.view',
      'groups.create',
      'groups.update',
      'groups.delete',
      'notifications.view',
      'notifications.create',
      'notifications.update',
      'notifications.delete',
      'conversations.view',
      'conversations.update',
    ],
  },
];
