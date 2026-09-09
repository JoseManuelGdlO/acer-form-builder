import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { ArrowUpRight, Activity, FileCheck, FileText, UserPlus } from 'lucide-react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Form, FormSubmission, Client, Trip, CalendarEvent } from '@/types/form';
import { useTenant } from '@/contexts/TenantContext';
import { DASHBOARD_CENTER_LOGO_IMAGE_KEY } from '@/lib/theme';
import { SectionTitle } from '@/components/layout/SectionTitle';
import { StatusBadge } from '@/components/layout/StatusBadge';
import { cn } from '@/lib/utils';
import { sortCalendarEvents } from '@/lib/calendarEventSort';
import { APPOINTMENT_TYPE_LABELS } from '@/lib/appointmentColors';
import type { ShellView } from '@/auth/viewPermissions';

interface DashboardProps {
  forms: Form[];
  submissions: FormSubmission[];
  clients: Client[];
  submissionStats: { total: number; pending: number; reviewed: number; completed: number };
  clientStats: { total: number; active: number; inactive: number; pending: number };
  /** Métricas de viajes (GET /trips/stats); null si no hay permiso o aún no cargó */
  tripStats?: {
    upcomingTrips: number;
    departingIn30Days: number;
    totalSeatsUpcoming: number;
    participantCountUpcoming: number;
    occupancyRate: number;
  } | null;
  /** Lista prefetch (GET /trips); no pasar si no hay `trips.view` */
  trips?: Trip[];
  canViewTrips?: boolean;
  /** Eventos de hoy; `null` si no hay `appointments.view` (no mostrar ni pedir agenda) */
  agendaEvents?: CalendarEvent[] | null;
  canViewCalendar?: boolean;
  onNavigate?: (view: ShellView) => void;
}

interface ActivityItem {
  id: string;
  type: 'client_created' | 'form_submitted' | 'form_created';
  title: string;
  description: string;
  descriptionSecondary?: string;
  timestamp: Date;
  icon: typeof UserPlus;
}

function localDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateOnly(value: string): Date | null {
  const key = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const parsed = parseISO(`${key}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function KpiCard({
  label,
  value,
  hint,
  emphasized = false,
}: {
  label: string;
  value: number | string;
  hint: string;
  emphasized?: boolean;
}) {
  return (
    <Card className={cn('p-5', emphasized && 'bg-foreground text-background')}>
      <p className="text-[10px] font-semibold uppercase tracking-widest opacity-55">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
      <p className={cn('mt-2 text-xs', emphasized ? 'text-secondary' : 'text-success')}>{hint}</p>
    </Card>
  );
}

export const Dashboard = ({
  forms,
  submissions,
  clients,
  submissionStats,
  clientStats,
  tripStats = null,
  trips,
  canViewTrips = false,
  agendaEvents = null,
  canViewCalendar = false,
  onNavigate,
}: DashboardProps) => {
  const { tenant } = useTenant();
  const dashboardCenterLogoImage = tenant?.theme?.[DASHBOARD_CENTER_LOGO_IMAGE_KEY]?.trim() ?? '';
  const companyLogo = tenant?.company?.logoUrl?.trim() ?? '';
  const heroLogo = dashboardCenterLogoImage || companyLogo;
  const companyName = tenant?.company?.name?.trim() || 'operaciones';

  const completionRate =
    submissionStats.total > 0
      ? Math.round((submissionStats.completed / submissionStats.total) * 100)
      : 0;

  const todayKey = localDateKey();

  const upcomingTrips = useMemo(() => {
    if (!canViewTrips || !trips?.length) return [];
    return [...trips]
      .filter((trip) => (trip.returnDate || '').slice(0, 10) >= todayKey)
      .sort((a, b) => (a.departureDate || '').localeCompare(b.departureDate || ''))
      .slice(0, 3);
  }, [canViewTrips, trips, todayKey]);

  const todayAgenda = useMemo(() => {
    if (!agendaEvents) return [];
    return sortCalendarEvents(agendaEvents.filter((event) => event.date === todayKey));
  }, [agendaEvents, todayKey]);

  const recentActivities = useMemo<ActivityItem[]>(() => {
    const activities: ActivityItem[] = [];

    clients.slice(0, 5).forEach((client) => {
      activities.push({
        id: `client-${client.id}`,
        type: 'client_created',
        title: 'Nuevo cliente registrado',
        description: client.name,
        descriptionSecondary: `Asesor: ${client.assignedUser?.name ?? 'Sin asignar'}`,
        timestamp: client.createdAt,
        icon: UserPlus,
      });
    });

    submissions.slice(0, 5).forEach((submission) => {
      activities.push({
        id: `submission-${submission.id}`,
        type: 'form_submitted',
        title: 'Formulario completado',
        description: `${submission.respondentName} - ${submission.formName}`,
        timestamp: submission.submittedAt,
        icon: FileCheck,
      });
    });

    forms.slice(0, 3).forEach((form) => {
      activities.push({
        id: `form-${form.id}`,
        type: 'form_created',
        title: 'Formulario creado',
        description: form.name,
        timestamp: form.createdAt,
        icon: FileText,
      });
    });

    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 8);
  }, [clients, submissions, forms]);

  const kpis = canViewTrips
    ? [
        {
          label: 'Viajes próximos',
          value: tripStats ? tripStats.upcomingTrips : '—',
          hint: tripStats
            ? `${tripStats.departingIn30Days} salen en 30 días`
            : 'Cargando métricas de viajes',
        },
        {
          label: 'Clientes',
          value: clientStats.total,
          hint: `${clientStats.pending} pendientes`,
        },
        {
          label: 'Envíos',
          value: submissionStats.total,
          hint:
            submissionStats.pending > 0
              ? `${submissionStats.pending} pendientes de revisión`
              : `${submissionStats.completed} completados`,
        },
        {
          label: 'Ocupación',
          value: tripStats ? `${tripStats.occupancyRate}%` : '—',
          hint: tripStats
            ? `${tripStats.participantCountUpcoming} / ${tripStats.totalSeatsUpcoming} plazas`
            : 'Cargando ocupación',
          emphasized: true,
        },
      ]
    : [
        {
          label: 'Clientes',
          value: clientStats.total,
          hint: `${clientStats.active} activos`,
        },
        {
          label: 'Pendientes',
          value: clientStats.pending,
          hint: 'Por contactar',
        },
        {
          label: 'Envíos',
          value: submissionStats.total,
          hint:
            submissionStats.pending > 0
              ? `${submissionStats.pending} pendientes de revisión`
              : 'Al día',
        },
        {
          label: 'Completado',
          value: `${completionRate}%`,
          hint: `${submissionStats.completed} envíos completados`,
          emphasized: true,
        },
      ];

  const showAgenda = agendaEvents !== null;

  return (
    <div className="grid grid-cols-12 gap-4">
      <Card className="col-span-12 flex flex-col items-center gap-6 bg-sidebar px-5 py-8 text-sidebar-foreground md:flex-row md:justify-between md:py-10">
        {heroLogo ? (
          <img
            src={heroLogo}
            alt={`Logotipo de ${companyName}`}
            className="h-24 w-auto max-w-[420px] object-contain md:h-32"
          />
        ) : (
          <p className="font-display text-2xl font-semibold md:text-3xl">{companyName}</p>
        )}
        <div className="text-center md:text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-sidebar-foreground/60">
            Centro de operación
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold md:text-3xl">
            Bienvenido al panel de {companyName}
          </h2>
          <p className="mt-2 text-sm text-sidebar-foreground/70">
            {format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}
          </p>
        </div>
      </Card>

      {canViewTrips ? (
        <Card className="col-span-12 p-5 xl:col-span-7">
          <SectionTitle
            title="Próximos viajes"
            action="Ver todos"
            onAction={() => onNavigate?.('trips')}
          />
          {upcomingTrips.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay viajes próximos.</p>
          ) : (
            <div className="space-y-2">
              {upcomingTrips.map((trip) => {
                const departure = parseDateOnly(trip.departureDate);
                const pax = trip.participantCount ?? 0;
                const seats = trip.totalSeats ?? 0;
                const place = trip.destination?.trim();
                return (
                  <button
                    key={trip.id}
                    type="button"
                    onClick={() => onNavigate?.('trips')}
                    className="flex w-full items-center gap-3 rounded-md bg-muted/70 p-3 text-left hover:bg-muted"
                  >
                    <div className="w-11 shrink-0 rounded-md bg-foreground py-1.5 text-center text-background">
                      <p className="font-display text-base font-semibold">
                        {departure ? format(departure, 'd') : '—'}
                      </p>
                      <p className="text-[9px] uppercase">
                        {departure ? format(departure, 'MMM', { locale: es }) : ''}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{trip.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {pax} / {seats} plazas
                        {place ? ` · ${place}` : ''}
                      </p>
                    </div>
                    <StatusBadge tone={seats > 0 && pax >= seats ? 'warning' : 'neutral'}>
                      {seats > 0 ? `${Math.round((pax / seats) * 100)}%` : 'Sin cupo'}
                    </StatusBadge>
                    <ArrowUpRight className="size-4 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      ) : null}

      <section
        className={cn(
          'col-span-12 grid grid-cols-2 gap-4',
          canViewTrips && 'xl:col-span-5',
        )}
      >
        {kpis.map((kpi) => (
          <KpiCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            hint={kpi.hint}
            emphasized={kpi.emphasized}
          />
        ))}
      </section>

      {showAgenda ? (
        <Card className="col-span-12 bg-foreground p-5 text-background lg:col-span-5">
          <div className="flex justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest opacity-55">Agenda · hoy</p>
              <h2 className="mt-1 font-display text-lg font-semibold">
                {format(new Date(), "EEEE d", { locale: es })}
              </h2>
            </div>
            <StatusBadge
              tone="warning"
              className="h-6 items-center justify-center bg-secondary leading-none text-secondary-foreground"
            >
              {todayAgenda.length} {todayAgenda.length === 1 ? 'bloque' : 'bloques'}
            </StatusBadge>
          </div>
          {canViewCalendar ? (
            <button
              type="button"
              onClick={() => onNavigate?.('calendar')}
              className="mt-2 text-xs text-background/70 underline-offset-2 hover:underline"
            >
              Ver calendario
            </button>
          ) : null}
          <div className="mt-4 space-y-4">
            {todayAgenda.length === 0 ? (
              <p className="text-sm opacity-70">No hay eventos para hoy.</p>
            ) : (
              todayAgenda.map((event, index) => {
                const time =
                  event.startTime && /^\d{2}:\d{2}$/.test(event.startTime)
                    ? event.startTime
                    : APPOINTMENT_TYPE_LABELS[event.type];
                const detail = [event.clientName, event.branchName].filter(Boolean).join(' · ');
                return (
                  <div key={`${event.type}-${event.date}-${event.tripId ?? event.clientId ?? index}`} className="flex gap-3">
                    <span
                      className={cn(
                        'w-1.5 rounded-full',
                        event.type === 'office' ? 'bg-secondary' : 'bg-primary',
                      )}
                    />
                    <div>
                      <p className="text-sm font-medium">{event.title}</p>
                      <p className="text-xs opacity-55">
                        {time}
                        {detail ? ` · ${detail}` : ''}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      ) : null}

      <Card className={cn('col-span-12 p-5', showAgenda ? 'lg:col-span-7' : 'lg:col-span-12')}>
        <SectionTitle title="Actividad reciente" />
        {recentActivities.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground">
            <Activity className="mx-auto mb-2 h-10 w-10 opacity-40" />
            <p className="text-sm">No hay actividad reciente</p>
          </div>
        ) : (
          recentActivities.map((activity, index) => (
            <div key={activity.id} className="mb-3 flex gap-3 text-xs">
              <span
                className={cn(
                  'mt-1 size-2 rounded-full',
                  index % 2 === 1 ? 'bg-secondary' : 'bg-primary',
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground">{activity.title}</p>
                <p className="truncate text-muted-foreground">{activity.description}</p>
                {activity.descriptionSecondary ? (
                  <p className="truncate text-[10px] text-muted-foreground">
                    {activity.descriptionSecondary}
                  </p>
                ) : null}
                <p className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(activity.timestamp, { addSuffix: true, locale: es })}
                </p>
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  );
};
