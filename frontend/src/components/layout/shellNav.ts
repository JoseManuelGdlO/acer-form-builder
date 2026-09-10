import type { LucideIcon } from 'lucide-react';
import {
  BadgePercent,
  Bot,
  Building2,
  Bus,
  CalendarDays,
  ChartNoAxesCombined,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  Shield,
  UserCog,
  UserRound,
  Users,
} from 'lucide-react';
import type { ShellView } from '@/auth/viewPermissions';

export type ShellViewMeta = {
  title: string;
  subtitle: string;
};

/** Títulos de chrome por vista. */
export const SHELL_VIEW_META: Record<ShellView, ShellViewMeta> = {
  dashboard: { title: 'Panel de operaciones', subtitle: 'Resumen del día y actividad reciente' },
  clients: { title: 'Clientes', subtitle: 'Expedientes, formularios, pagos y seguimiento' },
  trips: { title: 'Viajes', subtitle: 'Salidas, participantes, asientos y operación' },
  quotes: { title: 'Cotizaciones', subtitle: 'Propuestas, vigencias, documentos y seguimiento' },
  calendar: { title: 'Calendario', subtitle: 'Agenda de salidas y citas' },
  forms: { title: 'Formularios', subtitle: 'Plantillas, respuestas y documentos' },
  products: { title: 'Productos', subtitle: 'Paquetes y categorías comerciales' },
  hotels: { title: 'Hoteles', subtitle: 'Catálogo, contactos y disponibilidad' },
  groups: { title: 'Grupos', subtitle: 'Organización de viajeros y responsables' },
  finance: { title: 'Finanzas 360', subtitle: 'Ingresos, egresos y rentabilidad' },
  paymentLogs: { title: 'Logs de pagos', subtitle: 'Trazabilidad de movimientos y conciliación' },
  commissions: { title: 'Comisiones', subtitle: 'Reglas, periodos y pagos del equipo' },
  users: { title: 'Usuarios', subtitle: 'Equipo, roles y estado de acceso' },
  roles: { title: 'Roles y permisos', subtitle: 'Acceso por módulo y tipo de acción' },
  chatbot: { title: 'Chatbot', subtitle: 'Preguntas frecuentes y comportamiento' },
  settings: { title: 'Configuración', subtitle: 'Marca, sucursales y procesos' },
};

export type ShellNavItem = {
  id: ShellView;
  label: string;
  icon: LucideIcon;
};

export type ShellNavGroup = {
  label: string;
  items: ShellNavItem[];
};

/** Nav real de acer (Formularios en Catálogo; Cotizaciones en Principal). */
export const SHELL_NAV_GROUPS: ShellNavGroup[] = [
  {
    label: 'Principal',
    items: [
      { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
      { id: 'clients', label: 'Clientes', icon: UserRound },
      { id: 'trips', label: 'Viajes', icon: Bus },
      { id: 'quotes', label: 'Cotizaciones', icon: ClipboardList },
      { id: 'calendar', label: 'Calendario', icon: CalendarDays },
    ],
  },
  {
    label: 'Catálogo',
    items: [
      { id: 'products', label: 'Productos', icon: Package },
      { id: 'hotels', label: 'Hoteles', icon: Building2 },
      { id: 'groups', label: 'Grupos', icon: Users },
      { id: 'forms', label: 'Formularios', icon: FileText },
    ],
  },
  {
    label: 'Administración',
    items: [
      { id: 'finance', label: 'Finanzas', icon: ChartNoAxesCombined },
      { id: 'paymentLogs', label: 'Logs de pagos', icon: Receipt },
      { id: 'commissions', label: 'Comisiones', icon: BadgePercent },
      { id: 'users', label: 'Usuarios', icon: UserCog },
      { id: 'roles', label: 'Roles y permisos', icon: Shield },
      { id: 'chatbot', label: 'Chatbot', icon: Bot },
      { id: 'settings', label: 'Configuración', icon: Settings },
    ],
  },
];

export const HEADER_SEARCHABLE_VIEWS: ShellView[] = ['dashboard', 'clients', 'trips', 'products', 'quotes'];
